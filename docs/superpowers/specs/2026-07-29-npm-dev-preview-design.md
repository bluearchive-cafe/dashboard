# npm 开发预览命令设计

## 目标

恢复 `npm run dev`，使安装依赖后的控制面板能使用现有静态 HTTP 预览方式启动。

## 方案

在 `package.json` 的 `scripts` 中增加 `"dev": "python -m http.server 8080"`。该命令与仓库既有 README 和 AGENTS.md 的本地预览指引一致，不引入开发服务器依赖、构建步骤或框架。

## 验证

增加 Node 契约测试，断言 `package.json` 定义精确的 `dev` 脚本；执行 `npm run dev` 后通过 HTTP 请求确认 `index.html` 可访问。

## 用户影响

开发者可直接运行 `npm run dev`；用户入口、发布方式和生产资源不变。
