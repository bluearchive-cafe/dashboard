# 低性能设备交互体验优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 默认全面轻量化控制面板的视觉与交互更新，让点击、切换、保存和弹窗在低性能设备上更跟手、更稳定。

**架构：** 采用小范围渐进改动：先用测试锁定 `ui-state` 与 `status-display` 的去重行为，再调整 CSS token 和关键视觉属性。保持现有 MDUI 组件、DOM ID、API 合约和可访问性结构不变。

**技术栈：** Vite、Vitest、ES Modules、MDUI v2.1.5、CSS media queries。

---

## 文件结构

- 修改：`src/modules/ui-state.js`
  - 职责：统一获取 DOM 元素并控制交互控件禁用状态。
  - 本次变更：跳过重复的 `disabled` 写入，减少保存流程中对 MDUI custom elements 的重复属性更新。
- 修改：`src/modules/status-display.js`
  - 职责：更新状态 Chip 文案、图标、错误 class 和 ARIA 公告。
  - 本次变更：跳过无变化的标签、图标和 class 写入；ARIA 公告仍在实际状态变化时更新。
- 修改：`src/css/control-panel.css`
  - 职责：基础布局、主题 token、图标、暗色模式和 `prefers-reduced-motion`。
  - 本次变更：默认移除高成本毛玻璃，收敛阴影，简化 overlay，保留布局和主题语义。
- 修改：`src/css/control-panel-responsive.css`
  - 职责：紧凑、矮视口和 Dialog 响应式适配。
  - 本次变更：只在发现紧凑视口继承视觉成本过高时补充轻量规则；若基础 CSS 已覆盖，则不改。
- 修改：`tests/control-panel.test.js`
  - 职责：验证 HTML、模块、常量、网络层、UI 状态和状态展示契约。
  - 本次变更：添加去重写入相关测试，防止未来回归。

## 任务 1：为交互状态去重编写测试

**文件：**
- 修改：`tests/control-panel.test.js:145-183`

- [ ] **步骤 1：添加失败测试**

在 `describe('ui-state 模块', () => { ... })` 内、现有两个 `toggleInteractiveState` 测试之后添加：

```javascript
  it('toggleInteractiveState 跳过已经处于目标状态的元素', async () => {
    const { toggleInteractiveState } = await import('../src/modules/ui-state.js');
    const saveButton = document.getElementById('save-button');
    const writes = [];
    let disabledValue = false;

    Object.defineProperty(saveButton, 'disabled', {
      configurable: true,
      get: () => disabledValue,
      set: (value) => {
        writes.push(value);
        disabledValue = value;
      },
    });

    toggleInteractiveState(false);
    expect(writes).toEqual([]);

    toggleInteractiveState(true);
    expect(writes).toEqual([true]);

    toggleInteractiveState(true);
    expect(writes).toEqual([true]);
  });
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
npm test -- tests/control-panel.test.js -t "toggleInteractiveState 跳过已经处于目标状态的元素"
```

预期：测试失败，`writes` 包含重复写入，例如第一次调用 `toggleInteractiveState(false)` 写入了 `false`，或第三次调用重复写入了 `true`。

- [ ] **步骤 3：提交失败测试**

```bash
git add tests/control-panel.test.js
git commit -m "test(交互): 覆盖控件禁用状态去重"
```

## 任务 2：实现交互状态去重

**文件：**
- 修改：`src/modules/ui-state.js:12-17`
- 测试：`tests/control-panel.test.js`

- [ ] **步骤 1：编写最少实现代码**

将 `toggleInteractiveState` 改为只在状态变化时写入：

```javascript
export const toggleInteractiveState = (disabled) => {
  INTERACTIVE_IDS.forEach((id) => {
    const el = element(id);
    if (el && el.disabled !== disabled) {
      el.disabled = disabled;
    }
  });
};
```

- [ ] **步骤 2：运行定向测试验证通过**

运行：

```bash
npm test -- tests/control-panel.test.js -t "toggleInteractiveState"
```

预期：`ui-state 模块` 下 3 个测试全部通过。

- [ ] **步骤 3：运行完整测试**

运行：

```bash
npm test
```

预期：全部测试通过。

- [ ] **步骤 4：Commit**

```bash
git add src/modules/ui-state.js tests/control-panel.test.js
git commit -m "perf(交互): 跳过重复控件禁用写入"
```

## 任务 3：为状态 Chip 去重编写测试

**文件：**
- 修改：`tests/control-panel.test.js:185-216`

- [ ] **步骤 1：添加失败测试**

在 `describe('status-display 模块', () => { ... })` 内、现有两个 `setStatus` 测试之后添加：

```javascript
  it('setStatus 跳过无变化的标签和图标写入', async () => {
    const { setStatus } = await import('../src/modules/status-display.js');
    const chip = document.getElementById('text-status');
    const label = chip.querySelector('.status-label');
    const icon = chip.querySelector('.ui-icon');
    const labelWrites = [];
    const iconWrites = [];

    let labelText = '加载中';
    Object.defineProperty(label, 'textContent', {
      configurable: true,
      get: () => labelText,
      set: (value) => {
        labelWrites.push(value);
        labelText = value;
      },
    });

    let iconClassName = 'ui-icon status-icon-loading';
    Object.defineProperty(icon, 'className', {
      configurable: true,
      get: () => iconClassName,
      set: (value) => {
        iconWrites.push(value);
        iconClassName = value;
      },
    });

    setStatus('text-status', 'ready');
    expect(labelWrites).toEqual(['可用']);
    expect(iconWrites).toEqual(['ui-icon status-icon-ready']);

    setStatus('text-status', 'ready');
    expect(labelWrites).toEqual(['可用']);
    expect(iconWrites).toEqual(['ui-icon status-icon-ready']);
  });
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
npm test -- tests/control-panel.test.js -t "setStatus 跳过无变化的标签和图标写入"
```

预期：测试失败，第二次 `setStatus('text-status', 'ready')` 会重复写入标签或图标 class。

- [ ] **步骤 3：提交失败测试**

```bash
git add tests/control-panel.test.js
git commit -m "test(状态): 覆盖状态 Chip 更新去重"
```

## 任务 4：实现状态 Chip 更新去重

**文件：**
- 修改：`src/modules/status-display.js:3-25`
- 测试：`tests/control-panel.test.js`

- [ ] **步骤 1：编写最少实现代码**

将 `setStatus` 改为只写入变化的字段，并用 `data-status-state` 判断状态是否变化：

```javascript
export const setStatus = (id, state) => {
  const chip = element(id);
  if (!chip) return;

  const style = statusStyles[state];
  const previousState = chip.dataset.statusState;
  const label = chip.querySelector('.status-label');
  if (label && label.textContent !== style.text) {
    label.textContent = style.text;
  }

  const icon = chip.querySelector('.ui-icon');
  const iconClass = `ui-icon ${style.css}`;
  if (icon && icon.className !== iconClass) {
    icon.className = iconClass;
  }

  const isFailed = state === 'failed';
  if (chip.classList.contains('status-error') !== isFailed) {
    chip.classList.toggle('status-error', isFailed);
  }

  if (previousState !== state) {
    chip.dataset.statusState = state;
    const announcer = element('status-announcer');
    if (announcer) {
      const featureName =
        chip.closest('.feature-item')?.querySelector('strong')?.textContent || id;
      announcer.textContent = `${featureName}: ${style.text}`;
    }
  }
};
```

- [ ] **步骤 2：运行定向测试验证通过**

运行：

```bash
npm test -- tests/control-panel.test.js -t "status-display 模块"
```

预期：`status-display 模块` 下 3 个测试全部通过。

- [ ] **步骤 3：运行完整测试**

运行：

```bash
npm test
```

预期：全部测试通过。

- [ ] **步骤 4：Commit**

```bash
git add src/modules/status-display.js tests/control-panel.test.js
git commit -m "perf(状态): 跳过重复状态 Chip 写入"
```

## 任务 5：轻量化基础视觉效果

**文件：**
- 修改：`src/css/control-panel.css:7-20`
- 修改：`src/css/control-panel.css:76-100`
- 修改：`src/css/control-panel.css:197-224`
- 修改：`src/css/control-panel.css:380-394`

- [ ] **步骤 1：调整亮色主题 token**

将 `:root` 中的视觉 token 调整为更轻的表面和阴影：

```css
    --panel-bg: color-mix(in srgb, var(--mdui-color-surface-container-low, #f7fbff) 94%, transparent);
    --surface-bg: var(--mdui-color-surface-container-lowest, #ffffff);
    --surface-border: var(--mdui-color-outline-variant, rgba(148, 163, 184, 0.28));
    --overlay-gradient: linear-gradient(135deg, rgba(238, 246, 255, 0.42), rgba(255, 247, 240, 0.28));
```

将 `--hero-shadow` 调整为：

```css
    --hero-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
```

- [ ] **步骤 2：移除默认毛玻璃 filter**

将 `.page-overlay` 中的 `backdrop-filter: blur(1px);` 删除。

将 `.hero` 中的 `backdrop-filter: blur(14px);` 删除。

将 `.feature-list` 中的 `backdrop-filter: blur(10px);` 删除。

- [ ] **步骤 3：调整暗色主题 token**

在 `@media (prefers-color-scheme: dark)` 内改为更稳定的暗色表面：

```css
        --panel-bg: var(--mdui-color-surface-container, rgb(16, 27, 45));
        --surface-bg: var(--mdui-color-surface-container-low, rgb(12, 22, 37));
        --surface-border: var(--mdui-color-outline-variant, rgba(125, 161, 206, 0.24));
        --overlay-gradient:
            linear-gradient(135deg, rgba(7, 23, 46, 0.34), rgba(7, 43, 79, 0.18)),
            rgba(3, 10, 18, 0.2);
        --hero-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
```

- [ ] **步骤 4：收敛 reduced-motion 规则**

保留现有规则，并确保 `.hero` 与 `.feature-list` 的 `backdrop-filter` 关闭规则仍存在。由于默认已经移除毛玻璃，该规则作为兼容保护保留：

```css
    .hero,
    .feature-list,
    .page-overlay {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
    }
```

- [ ] **步骤 5：运行构建验证 CSS 可编译**

运行：

```bash
npm run build
```

预期：Vite build 成功，无 CSS 解析错误。

- [ ] **步骤 6：Commit**

```bash
git add src/css/control-panel.css
git commit -m "perf(视觉): 默认使用轻量表面效果"
```

## 任务 6：验证响应式样式无需额外降级

**文件：**
- 检查：`src/css/control-panel-responsive.css`
- 可选修改：`src/css/control-panel-responsive.css:4-225`

- [ ] **步骤 1：检查响应式样式是否重新引入高成本效果**

查看 `src/css/control-panel-responsive.css`，确认其中没有新增或覆盖以下属性：

```text
backdrop-filter
-webkit-backdrop-filter
filter
box-shadow
transition
animation
```

预期：文件当前不包含这些高成本视觉属性，或只包含 Dialog 布局相关规则。

- [ ] **步骤 2：如无高成本属性则不修改文件**

如果步骤 1 的检查结果符合预期，不修改 `src/css/control-panel-responsive.css`。

如果发现高成本属性，只添加最小覆盖，例如：

```css
@media (max-width: 720px),
(max-height: 420px) {
    .hero,
    .feature-list,
    .page-overlay {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow: none;
    }
}
```

- [ ] **步骤 3：运行 lint 和 build**

运行：

```bash
npm run lint
npm run build
```

预期：两个命令都通过。

- [ ] **步骤 4：Commit**

如果没有修改文件，跳过 commit，并在执行记录中写明「响应式样式未重新引入高成本效果，无需提交」。

如果修改了文件，执行：

```bash
git add src/css/control-panel-responsive.css
git commit -m "perf(响应式): 降低紧凑视口视觉成本"
```

## 任务 7：最终自动验证与手动烟测

**文件：**
- 验证：`package.json`
- 验证：`index.html`
- 验证：`src/main.js`
- 验证：`src/modules/*.js`
- 验证：`src/css/*.css`

- [ ] **步骤 1：运行完整测试**

运行：

```bash
npm test
```

预期：全部测试通过。

- [ ] **步骤 2：运行 ESLint**

运行：

```bash
npm run lint
```

预期：无 ESLint 错误。

- [ ] **步骤 3：运行生产构建**

运行：

```bash
npm run build
```

预期：Vite build 成功，产物输出到 `dist/`。

- [ ] **步骤 4：启动本地页面进行手动验证**

运行：

```bash
npm run dev
```

打开：

```text
http://localhost:8080/?uid=ABCDEFGH
```

按以下清单验证：

- 三个状态 Chip 能从「加载中」更新为接口结果或失败状态。
- 三个复选框点击反馈及时，没有明显卡顿。
- 点击「保存设置」后，保存按钮进入 loading，所有交互控件禁用。
- 保存完成后，控件恢复可用，成功 Snackbar 或失败 Dialog 正常显示。
- 「查看说明」「复制链接」「诊断信息」仍能打开对应反馈。
- 失败状态 Chip 仍支持鼠标点击和键盘 Enter/Space。
- 窄屏、矮视口和暗色模式下布局未破坏。
- 页面视觉相比原先更轻：无明显毛玻璃模糊，阴影更浅。

- [ ] **步骤 5：最终 Commit 或记录无需提交**

如果步骤 1-4 只产生验证结果，没有文件变化，则不提交。

如果手动验证中修复了小问题，按实际影响范围提交，例如：

```bash
git add <changed-files>
git commit -m "fix(交互): 修复轻量化后的验证问题"
```

## 自检结果

- 规格覆盖度：计划覆盖默认全面轻量化、交互去重、状态更新去重、视觉降级、响应式检查、自动验证和手动烟测。
- 占位符扫描：计划没有使用「待定」「TODO」「后续实现」或未定义函数。
- 类型一致性：计划中使用的现有函数名为 `toggleInteractiveState`、`setStatus`、`element`，与当前代码一致。新增 `data-status-state` 仅作为 DOM dataset 标记使用，不引入新模块。
