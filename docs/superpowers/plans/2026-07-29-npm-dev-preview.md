# npm 开发预览命令实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 提供与既有静态站点预览方式一致的 `npm run dev` 命令。

**架构：** `package.json` 的 `dev` 脚本直接调用 Python 内置 HTTP 服务器，固定端口 8080。Node 契约测试读取 package 元数据以防脚本遗漏；HTTP 冒烟测试确认服务器能返回入口页面。

**技术栈：** npm scripts、Python `http.server`、Node.js `node:test`。

---

## 文件结构

- 修改：`package.json` — 定义开发预览命令。
- 修改：`tests/control-panel.test.js` — 验证开发预览脚本的精确命令。
- 修改：`README.md` — 记录 `npm run dev` 的入口和有效 UID 示例。

### 任务 1：用脚本契约驱动开发预览命令

**文件：**
- 修改：`tests/control-panel.test.js`
- 修改：`package.json`

- [ ] **步骤 1：编写失败的测试**

添加：

```js
test("npm 提供静态开发预览命令", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.equal(packageJson.scripts.dev, "python -m http.server 8080");
});
```

- [ ] **步骤 2：运行红灯测试**

运行：`node --test tests/control-panel.test.js`

预期：FAIL，`packageJson.scripts.dev` 为 `undefined`。

- [ ] **步骤 3：编写最少实现**

将 `package.json` 的 scripts 更新为：

```json
{
  "dev": "python -m http.server 8080",
  "vendor:sync": "node scripts/sync-vendor-assets.mjs",
  "test": "node --test"
}
```

- [ ] **步骤 4：运行绿灯测试**

运行：`node --test tests/control-panel.test.js`

预期：所有控制器与 package 脚本测试通过。

### 任务 2：记录与烟雾验证命令

**文件：**
- 修改：`README.md`

- [ ] **步骤 1：编写失败的文档测试**

添加：

```js
test("README 说明 npm 开发预览命令", () => {
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    assert.match(readme, /npm run dev/);
});
```

- [ ] **步骤 2：运行红灯测试**

运行：`node --test tests/control-panel.test.js`

预期：FAIL，README 尚未包含 `npm run dev`。

- [ ] **步骤 3：编写最少文档**

在 README 的本地预览说明中将启动命令改为：

```text
npm run dev
```

并保留 `http://127.0.0.1:8080/index.html?uid=XXXXXXXX` 的有效 UID 示例。

- [ ] **步骤 4：运行完整验证**

依次运行 `npm test` 与 `git diff --check`。后台启动 `npm run dev`，请求 `http://127.0.0.1:8080/index.html?uid=ABCDEFGH`，预期返回 200 且页面包含本地字体与 MDUI 引用；验证结束后停止该临时服务器。

- [ ] **步骤 5：提交实现**

暂存 `package.json`、`README.md` 与 `tests/control-panel.test.js`，提交信息：`fix(开发): 恢复 npm 预览命令`。

## 自检

- 规格中的命令兼容性、无新依赖与 HTTP 可访问性均由任务 1-2 覆盖。
- 计划未改变生产发布方式、端口约定或资源同步流程。
