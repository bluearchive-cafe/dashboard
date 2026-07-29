# 本地托管前端资源实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 固定 MDUI、Noto Sans 和 Noto Sans SC 的 npm 版本，并发布为本地静态资源。

**架构：** `package.json` 锁定三个依赖。同步脚本从 `node_modules` 复制 MDUI 与所需 WOFF2 至 `assets/vendor/`；HTML 改用本地资源。Node 契约测试阻止 CDN 与缺失资产回归。

**技术栈：** Node.js 内置文件 API、npm、node:test、MDUI 2.1.5、@fontsource 5.3.0。

---

## 文件结构

- 创建：`package.json` — 锁定依赖及 `vendor:sync`、`test` 脚本。
- 创建：`scripts/sync-vendor-assets.mjs` — 确定性复制发布资产。
- 创建：`assets/vendor/mdui/mdui.css`、`assets/vendor/mdui/mdui.global.js`。
- 创建：`assets/vendor/fonts/fonts.css`、`assets/vendor/fonts/files/*.woff2`。
- 修改：`index.html`、`tests/control-panel.test.js`、`README.md`。

### 任务 1：用入口契约驱动 HTML 修改

**文件：** 修改 `tests/control-panel.test.js`、`index.html`。

- [ ] **步骤 1：编写失败的测试**

添加：

```js
test("页面只从本地加载 MDUI 与字体资源", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.match(html, /assets\/vendor\/fonts\/fonts\.css/);
  assert.match(html, /assets\/vendor\/mdui\/mdui\.css/);
  assert.match(html, /assets\/vendor\/mdui\/mdui\.global\.js/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com\/mdui/);
});
```

- [ ] **步骤 2：运行红灯测试**

运行 `node --test tests/control-panel.test.js`。预期：FAIL，因为 HTML 仍引用 Google Fonts 与 unpkg。

- [ ] **步骤 3：编写最少实现**

移除字体 DNS/preconnect、Google Fonts 链接及 unpkg MDUI 引用。在项目样式前添加：

```html
<link rel="stylesheet" href="assets/vendor/fonts/fonts.css">
<link rel="stylesheet" href="assets/vendor/mdui/mdui.css">
```

将文末 MDUI 脚本替换为：

```html
<script src="assets/vendor/mdui/mdui.global.js"></script>
```

- [ ] **步骤 4：运行绿灯测试**

运行 `node --test tests/control-panel.test.js`。预期：入口契约与已有控制器测试通过。

### 任务 2：用发布资源契约驱动同步脚本

**文件：** 创建 `package.json`、`scripts/sync-vendor-assets.mjs`、`assets/vendor/**`；修改 `tests/control-panel.test.js`。

- [ ] **步骤 1：编写失败的测试**

添加：

```js
test("同步后的本地依赖及字体文件齐全", () => {
  const files = ["assets/vendor/mdui/mdui.css", "assets/vendor/mdui/mdui.global.js", "assets/vendor/fonts/fonts.css"];
  for (const file of files) assert.equal(fs.existsSync(path.join(ROOT, file)), true, file);
  const css = fs.readFileSync(path.join(ROOT, "assets/vendor/fonts/fonts.css"), "utf8");
  for (const match of css.matchAll(/url\(['\"]?(.+?\.woff2)['\"]?\)/g)) {
    assert.equal(fs.existsSync(path.join(ROOT, "assets/vendor/fonts", match[1])), true, match[1]);
  }
});
```

- [ ] **步骤 2：运行红灯测试**

运行 `node --test tests/control-panel.test.js`。预期：FAIL，缺失 `assets/vendor/mdui/mdui.css`。

- [ ] **步骤 3：创建锁定的 npm 元数据**

创建：

```json
{"private":true,"scripts":{"vendor:sync":"node scripts/sync-vendor-assets.mjs","test":"node --test"},"dependencies":{"@fontsource/noto-sans":"5.3.0","@fontsource/noto-sans-sc":"5.3.0","mdui":"2.1.5"}}
```

- [ ] **步骤 4：实现最少同步脚本**

使用 `node:fs/promises` 的 `mkdir`、`copyFile`、`readFile`、`writeFile`。复制 `mdui/mdui.css` 与 `mdui/mdui.global.js`；读取 `@fontsource/noto-sans/{latin-400,latin-500,latin-700}.css`、`@fontsource/noto-sans-sc/{chinese-simplified-400,chinese-simplified-500,chinese-simplified-700}.css`；解析 CSS `url()`，复制 WOFF2 到 `assets/vendor/fonts/files/`，拼接生成保持 `font-display: swap` 的 `fonts.css`。源文件或 WOFF2 缺失时抛错。

- [ ] **步骤 5：生成资产并验证绿灯**

顺序运行 `npm install`、`npm run vendor:sync`、`node --test tests/control-panel.test.js`。预期：三个命令均 exit 0，产生 lockfile 与本地资产。

- [ ] **步骤 6：提交原子实现**

暂存 `package.json`、`package-lock.json`、`scripts/sync-vendor-assets.mjs`、`assets/vendor`、`index.html`、`tests/control-panel.test.js`，提交信息：`perf(资源): 本地托管 MDUI 与字体`。

### 任务 3：记录同步操作并完成验证

**文件：** 修改 `README.md`、`tests/control-panel.test.js`。

- [ ] **步骤 1：编写失败的文档测试**

添加：

```js
test("README 说明本地资源同步流程", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.match(readme, /npm install/);
  assert.match(readme, /npm run vendor:sync/);
});
```

- [ ] **步骤 2：运行红灯测试**

运行 `node --test tests/control-panel.test.js`。预期：FAIL，因为 README 未列出同步命令。

- [ ] **步骤 3：编写最少文档**

在 README 的“开发验证”节增加 `npm install` 和 `npm run vendor:sync`，说明依赖更新必须连同 `assets/vendor/` 一起提交。

- [ ] **步骤 4：运行完整验证**

依次运行 `npm run vendor:sync`、`npm test` 和 `git diff --check`；再用 `python -m http.server 8080` 打开有效 UID 页面。预期：命令均 exit 0，且网络不请求 unpkg、Google Fonts 或 fonts.gstatic；GA4 保持外链。

- [ ] **步骤 5：提交文档与测试**

暂存 `README.md` 与 `tests/control-panel.test.js`，提交信息：`docs(开发): 说明本地资源同步流程`。

## 自检

- MDUI 锁定、本地字体、GA4 保留、ESA 根目录发布、失败即退出和验证流程均被任务覆盖。
- 不引入构建框架、API 代理或无关重构。
