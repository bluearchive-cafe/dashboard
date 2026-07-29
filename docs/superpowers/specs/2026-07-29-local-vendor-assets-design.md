# 本地托管前端依赖设计

## 目标

消除控制面板对 MDUI 与 Google Fonts 运行时 CDN 的依赖，同时保持现有静态站点部署方式、视觉字体和交互行为不变。

## 范围

- 使用 npm 锁定 `mdui@2.1.5`。
- 将 MDUI 的 CSS 与全局 JavaScript 同步至 `assets/vendor/mdui/`。
- 将页面使用的 Noto Sans、Noto Sans SC 字体文件和本地 `@font-face` 样式同步至 `assets/vendor/fonts/`。
- 在 `index.html` 中仅将 MDUI 和字体引用切换为本地资源。
- 保留 GA4、现有 API、图标、背景图、UID 路由与 ESA 根目录静态发布配置。

## 非目标

- 不引入 Vite、Vue 或新的运行时框架。
- 不代理 API，也不改变网络重试、配置保存或页面布局。
- 不将 GA4 打包或自托管。

## 架构与数据流

`package.json` 记录精确 MDUI 版本和一个可重复执行的 `vendor:sync` 脚本。脚本从已安装的 npm 包及受版本控制的字体来源复制发布文件到 `assets/vendor/`。ESA 继续发布仓库根目录，因此同步后的文件直接构成生产静态资产。

页面在解析期间从本地加载字体样式和 MDUI CSS，在文档末尾从本地加载 MDUI JavaScript。现有 `control-panel.js` 的 MDUI 全局调用不变。

## 错误处理与维护

- 同步脚本在依赖或源字体缺失时以非零退出，避免发布不完整资产。
- `package-lock.json` 锁定 npm 依赖树；更新 MDUI 必须显式更新版本、重新同步并运行测试。
- 字体文件随仓库提交，生产首屏不需要访问 Google Fonts 或 fonts.gstatic.com。

## 验证

- 新增 Node 契约测试：页面不再引用 MDUI 或 Google Fonts CDN，本地 MDUI、字体 CSS 与其字体文件都存在。
- 运行 `npm run vendor:sync`，再运行 `node --test` 和 `git diff --check`。
- 通过 HTTP 静态服务检查有效 UID 页面能够载入本地样式、MDUI 组件和控制器。

## 用户影响

首屏关键资源不再依赖多个第三方域名，也不再承受 `mdui@2` 的版本重定向；弱网、受限网络和 CDN 临时故障下，页面更稳定。发布流程增加一次受脚本约束的依赖同步步骤，但不改变用户入口或操作方式。
