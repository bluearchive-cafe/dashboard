const test = require("node:test");
const assert = require("node:assert/strict");

let resolveUidRoute;
try {
    ({ resolveUidRoute } = require("../assets/js/uid-routing.js"));
} catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
}

const resolve = (href) => {
    assert.equal(typeof resolveUidRoute, "function", "UID 路由模块必须导出 resolveUidRoute");
    return resolveUidRoute(href);
};

test("dash 规范路径直接提供已校验 UID", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/ABCDEFGH"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "none",
        target: null
    });
});

test("dash 路径尾斜杠跳转到无尾斜杠规范地址", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/ABCDEFGH/?source=old#panel"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "location",
        target: "https://dash.bluearchive.cafe/ABCDEFGH"
    });
});

test("根路径从旧 uid 查询参数读取并跳转", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/?uid=ABCDEFGH#panel"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "location",
        target: "https://dash.bluearchive.cafe/ABCDEFGH"
    });
});

test("index.html 从旧 uid 查询参数读取并跳转", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/index.html?uid=ABCDEFGH"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "location",
        target: "https://dash.bluearchive.cafe/ABCDEFGH"
    });
});

test("路径 UID 优先于冲突的查询参数", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/ABCDEFGH?uid=ZZZZZZZZ"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "location",
        target: "https://dash.bluearchive.cafe/ABCDEFGH"
    });
});

test("旧 control 查询链接迁移到 dash 路径", () => {
    assert.deepEqual(resolve("https://control.bluearchive.cafe/?uid=ABCDEFGH"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "location",
        target: "https://dash.bluearchive.cafe/ABCDEFGH"
    });
});

test("旧 control 路径链接迁移到 dash 路径", () => {
    assert.deepEqual(resolve("https://control.bluearchive.cafe/ABCDEFGH"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "location",
        target: "https://dash.bluearchive.cafe/ABCDEFGH"
    });
});

test("非生产主机用 history 规范化并继续初始化", () => {
    assert.deepEqual(resolve("http://127.0.0.1:8080/index.html?uid=%20ABCDEFGH%20#panel"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "history",
        target: "/ABCDEFGH"
    });
});

test("非生产主机的规范路径无需改写", () => {
    assert.deepEqual(resolve("http://127.0.0.1:8080/ABCDEFGH"), {
        uid: "ABCDEFGH",
        hasUid: true,
        isValidUid: true,
        navigation: "none",
        target: null
    });
});

test("空 UID 保持为空且不导航", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/?uid="), {
        uid: "",
        hasUid: false,
        isValidUid: false,
        navigation: "none",
        target: null
    });
});

test("小写 UID 是非空无效值", () => {
    assert.deepEqual(resolve("https://dash.bluearchive.cafe/?uid=abcdefgh"), {
        uid: "abcdefgh",
        hasUid: true,
        isValidUid: false,
        navigation: "none",
        target: null
    });
});

test("长度错误的 UID 是非空无效值", () => {
    const result = resolve("https://dash.bluearchive.cafe/ABCDEFG");
    assert.equal(result.uid, "ABCDEFG");
    assert.equal(result.hasUid, true);
    assert.equal(result.isValidUid, false);
    assert.equal(result.navigation, "none");
});

test("多段路径是非空无效值且路径优先", () => {
    const result = resolve("https://dash.bluearchive.cafe/ABCDEFGH/ZZZZZZZZ?uid=YYYYYYYY");
    assert.equal(result.uid, "ABCDEFGH/ZZZZZZZZ");
    assert.equal(result.hasUid, true);
    assert.equal(result.isValidUid, false);
    assert.equal(result.navigation, "none");
});

test("错误百分号编码是非空无效值", () => {
    const result = resolve("https://dash.bluearchive.cafe/%ZZ");
    assert.equal(result.uid, "%ZZ");
    assert.equal(result.hasUid, true);
    assert.equal(result.isValidUid, false);
    assert.equal(result.navigation, "none");
});

test("路径段解码一次后可成为有效 UID", () => {
    const result = resolve("https://dash.bluearchive.cafe/%41BCDEFGH");
    assert.equal(result.uid, "ABCDEFGH");
    assert.equal(result.isValidUid, true);
    assert.equal(result.navigation, "location");
    assert.equal(result.target, "https://dash.bluearchive.cafe/ABCDEFGH");
});

test("路径段不会解码第二次", () => {
    const result = resolve("https://dash.bluearchive.cafe/%2541BCDEFGH");
    assert.equal(result.uid, "%41BCDEFGH");
    assert.equal(result.hasUid, true);
    assert.equal(result.isValidUid, false);
    assert.equal(result.navigation, "none");
});

test("生产主机名使用精确匹配", () => {
    const result = resolve("https://dash.bluearchive.cafe.example/ABCDEFGH?source=old");
    assert.equal(result.uid, "ABCDEFGH");
    assert.equal(result.navigation, "history");
    assert.equal(result.target, "/ABCDEFGH");
});

test("HTTP dash 规范路径迁移到 HTTPS 规范 origin", () => {
    const result = resolve("http://dash.bluearchive.cafe/ABCDEFGH");
    assert.equal(result.uid, "ABCDEFGH");
    assert.equal(result.navigation, "location");
    assert.equal(result.target, "https://dash.bluearchive.cafe/ABCDEFGH");
});

test("带端口的 dash 规范路径迁移到无端口规范 origin", () => {
    const result = resolve("https://dash.bluearchive.cafe:8443/ABCDEFGH");
    assert.equal(result.uid, "ABCDEFGH");
    assert.equal(result.navigation, "location");
    assert.equal(result.target, "https://dash.bluearchive.cafe/ABCDEFGH");
});
