const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { resolveUidRoute } = require("../assets/js/uid-routing.js");

const ROOT = path.resolve(__dirname, "..");
const CONTROL_PANEL_SOURCE = fs.readFileSync(
    path.join(ROOT, "assets/js/control-panel.js"),
    "utf8"
);

class TestElement {
    constructor(id = "") {
        this.id = id;
        this.checked = false;
        this.disabled = false;
        this.loading = false;
        this.open = false;
        this.style = {};
        this.listeners = new Map();
        this.statusLabel = { textContent: "" };
        this.statusIcon = { className: "" };
        this.classNames = new Set();
        this.classList = {
            contains: (name) => this.classNames.has(name),
            toggle: (name, enabled) => {
                if (enabled) this.classNames.add(name);
                else this.classNames.delete(name);
            }
        };
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    setAttribute() {}
    append() {}
    remove() {}
    focus() {}
    select() {}

    querySelector(selector) {
        if (selector === ".status-label") return this.statusLabel;
        if (selector === ".ui-icon") return this.statusIcon;
        return null;
    }

    closest() {
        return {
            querySelector: () => ({ textContent: this.id })
        };
    }

    async trigger(type) {
        for (const listener of this.listeners.get(type) || []) {
            await listener();
        }
    }
}

const createResponse = (url) => {
    if (url === "https://api.bluearchive.cafe/status/list") {
        const version = { official: { version: "1" }, localized: { version: "1" } };
        return {
            ok: true,
            json: async () => ({ text: version, voice: version, media: version })
        };
    }

    if (url.startsWith("https://api.bluearchive.cafe/config/get?")) {
        return {
            ok: true,
            json: async () => ({ text: "jp", voice: "jp", media: "jp" })
        };
    }

    return { ok: true };
};

const runController = (href) => {
    const elements = new Map();
    const requests = [];
    const replacements = [];
    const historyReplacements = [];
    const clipboardWrites = [];
    const location = {
        href,
        replace: (target) => replacements.push(target)
    };
    const history = {
        state: null,
        replaceState: (state, title, target) => {
            historyReplacements.push({ state, title, target });
        }
    };
    const document = {
        body: { append() {} },
        createElement: () => new TestElement(),
        execCommand: () => true,
        getElementById: (id) => {
            if (!elements.has(id)) elements.set(id, new TestElement(id));
            return elements.get(id);
        }
    };
    const navigator = {
        clipboard: {
            writeText: async (text) => clipboardWrites.push(text)
        },
        userAgent: "test",
        appVersion: "test",
        platform: "test",
        language: "zh-CN",
        languages: ["zh-CN"],
        onLine: true,
        cookieEnabled: true,
        hardwareConcurrency: 1
    };
    const window = {
        UidRouting: { resolveUidRoute },
        innerWidth: 1280,
        innerHeight: 720,
        screen: { width: 1280, height: 720 },
        devicePixelRatio: 1
    };
    const fetch = (url) => {
        const requestUrl = String(url);
        requests.push(requestUrl);
        return Promise.resolve(createResponse(requestUrl));
    };

    vm.runInNewContext(CONTROL_PANEL_SOURCE, {
        AbortController,
        URLSearchParams,
        clearTimeout,
        console,
        document,
        fetch,
        history,
        location,
        mdui: {
            setTheme() {},
            setColorScheme() {},
            snackbar() {}
        },
        navigator,
        setTimeout,
        window
    }, { filename: "assets/js/control-panel.js" });

    return {
        clipboardWrites,
        getElement: document.getElementById,
        historyReplacements,
        replacements,
        requests
    };
};

test("生产 location 导航调用 replace 并停止 API 请求", () => {
    const result = runController("https://control.bluearchive.cafe/?uid=ABCDEFGH");

    assert.deepEqual(result.replacements, ["https://dash.bluearchive.cafe/ABCDEFGH"]);
    assert.deepEqual(result.requests, []);
});

test("非生产 history 规范化后继续初始化", () => {
    const result = runController("http://127.0.0.1:8080/index.html?uid=ABCDEFGH#old");

    assert.deepEqual(result.historyReplacements, [
        { state: null, title: "", target: "/ABCDEFGH" }
    ]);
    assert.deepEqual(result.requests, [
        "https://api.bluearchive.cafe/status/list",
        "https://api.bluearchive.cafe/config/get?uid=ABCDEFGH"
    ]);
});

test("缺失 UID 不发送 status 或 config API 请求", () => {
    const result = runController("http://127.0.0.1:8080/");
    assert.deepEqual(result.requests, []);
});

test("无效 UID 不发送 status 或 config API 请求", () => {
    const result = runController("http://127.0.0.1:8080/abcdefgh");
    assert.deepEqual(result.requests, []);
});

test("有效 UID 用规范值读取、保存并复制路径链接", async () => {
    const result = runController("http://127.0.0.1:8080/?uid=%20ABCDEFGH%20");

    assert.deepEqual(result.requests, [
        "https://api.bluearchive.cafe/status/list",
        "https://api.bluearchive.cafe/config/get?uid=ABCDEFGH"
    ]);

    result.getElement("text-checkbox").checked = true;
    result.getElement("voice-checkbox").checked = false;
    result.getElement("media-checkbox").checked = true;
    await result.getElement("save-button").trigger("click");
    assert.equal(
        result.requests.at(-1),
        "https://api.bluearchive.cafe/config/set?uid=ABCDEFGH&text=cn&voice=jp&media=cn"
    );

    await result.getElement("copy-button").trigger("click");
    assert.deepEqual(result.clipboardWrites, ["https://dash.bluearchive.cafe/ABCDEFGH"]);
});

test("ESA 与 HTML 入口契约保持精确", () => {
    const esaConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "esa.jsonc"), "utf8"));
    assert.deepEqual(esaConfig, {
        name: "dashboard",
        installCommand: "",
        buildCommand: "",
        assets: {
            directory: "./",
            notFoundStrategy: "singlePageApplication"
        }
    });

    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const headEnd = html.indexOf("</head>");
    const baseIndex = html.indexOf('<base href="/">');
    const routingScriptIndex = html.indexOf('<script src="assets/js/uid-routing.js"></script>');
    const controllerScriptIndex = html.indexOf('<script src="./assets/js/control-panel.js"></script>');
    assert.ok(baseIndex >= 0 && baseIndex < headEnd);
    assert.ok(routingScriptIndex >= 0 && routingScriptIndex < controllerScriptIndex);
});

test("页面只从本地加载 MDUI 与字体资源", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    assert.match(html, /assets\/vendor\/fonts\/fonts\.css/);
    assert.match(html, /assets\/vendor\/mdui\/mdui\.css/);
    assert.match(html, /assets\/vendor\/mdui\/mdui\.global\.js/);
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com\/mdui/);
});

test("同步后的本地依赖及字体文件齐全", () => {
    const files = [
        "assets/vendor/mdui/mdui.css",
        "assets/vendor/mdui/mdui.global.js",
        "assets/vendor/fonts/fonts.css"
    ];

    for (const file of files) {
        assert.equal(fs.existsSync(path.join(ROOT, file)), true, file);
    }

    const css = fs.readFileSync(path.join(ROOT, "assets/vendor/fonts/fonts.css"), "utf8");
    for (const match of css.matchAll(/url\(['"]?(.+?\.woff2?)['"]?\)/g)) {
        assert.equal(fs.existsSync(path.join(ROOT, "assets/vendor/fonts", match[1])), true, match[1]);
    }
});

test("README 说明本地资源同步流程", () => {
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    assert.match(readme, /npm install/);
    assert.match(readme, /npm run vendor:sync/);
});

test("npm 提供稳定的静态开发预览命令", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.equal(packageJson.name, "dashboard");
    assert.equal(packageJson.scripts.dev, "python -m http.server 8080");
});

test("README 说明 npm 开发预览命令", () => {
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    assert.match(readme, /npm run dev/);
});
