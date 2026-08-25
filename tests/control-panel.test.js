import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('ESA 与 HTML 入口契约', () => {
  it('ESA 配置与 HTML 入口保持精确', () => {
    const esaConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'esa.jsonc'), 'utf8'));
    expect(esaConfig).toEqual({
      name: 'dashboard',
      installCommand: 'npm install',
      buildCommand: 'npm run build',
      assets: {
        directory: './dist',
        notFoundStrategy: 'singlePageApplication',
      },
    });

    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const headEnd = html.indexOf('</head>');
    const baseIndex = html.indexOf('<base href="/">');
    const moduleScriptIndex = html.indexOf(
      '<script type="module" src="/src/main.js"></script>',
    );
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(baseIndex).toBeLessThan(headEnd);
    expect(moduleScriptIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('HTML 资源加载', () => {
  it('页面通过 Vite 入口模块加载所有依赖（不再使用 CDN）', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    // Should use Vite's module entry point
    expect(html).toMatch(/src\/main\.js/);
    // Should NOT reference CDN-hosted MDUI or fonts
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com\/mdui/);
    // Should NOT reference old vendor script paths
    expect(html).not.toMatch(/assets\/vendor\/mdui\/mdui\.global\.js/);
    expect(html).not.toMatch(/assets\/js\/uid-routing\.js/);
    expect(html).not.toMatch(/assets\/js\/control-panel\.js/);
  });
});

describe('package.json 脚本', () => {
  it('npm 提供 Vite 开发预览命令', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
    );
    expect(packageJson.name).toBe('dashboard');
    expect(packageJson.scripts.dev).toBe('vite');
    expect(packageJson.scripts.build).toBe('vite build');
    expect(packageJson.scripts.preview).toBe('vite preview');
    expect(packageJson.scripts.test).toBe('vitest run');
  });
});

describe('源代码结构', () => {
  it('src/ 目录包含模块化 JS 文件', () => {
    const modules = [
      'src/main.js',
      'src/lib/uid-routing.js',
      'src/modules/config.js',
      'src/modules/network.js',
      'src/modules/error-store.js',
      'src/modules/ui-state.js',
      'src/modules/status-display.js',
      'src/modules/dialog.js',
      'src/modules/clipboard.js',
      'src/modules/diagnostics.js',
      'src/modules/save-handler.js',
      'src/modules/copy-link.js',
      'src/modules/init.js',
    ];
    for (const mod of modules) {
      expect(fs.existsSync(path.join(ROOT, mod))).toBe(true);
    }
  });

  it('src/icons/ 包含被引用的 SVG 图标', () => {
    const icons = [
      'action-save.svg',
      'action-help.svg',
      'action-copy-link.svg',
      'action-diagnose.svg',
      'status-loading.svg',
      'status-ready.svg',
      'status-update.svg',
      'status-error.svg',
    ];
    for (const icon of icons) {
      expect(fs.existsSync(path.join(ROOT, 'src', 'icons', icon))).toBe(true);
    }
  });
});

describe('配置常量', () => {
  it('导出 LANG_CN 和 LANG_JP 常量', async () => {
    const { LANG_CN, LANG_JP } = await import('../src/modules/config.js');
    expect(LANG_CN).toBe('cn');
    expect(LANG_JP).toBe('jp');
  });

  it('APP_CONFIG 保持正确的 API 端点', async () => {
    const { API_ENDPOINTS } = await import('../src/modules/config.js');
    expect(API_ENDPOINTS.statusList).toBe('https://api.bluearchive.cafe/status/list');
    expect(API_ENDPOINTS.configGet).toBe('https://api.bluearchive.cafe/config/get');
    expect(API_ENDPOINTS.configSet).toBe('https://api.bluearchive.cafe/config/set');
  });
});

describe('网络层', () => {
  it('fetchWithTimeout 在超时后抛出 AbortError', async () => {
    const { fetchWithTimeout } = await import('../src/modules/network.js');
    // Mock fetch to reject with AbortError (simulating timeout abort)
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    global.fetch = vi.fn((_url, options) => {
      // Verify signal was passed
      expect(options.signal).toBeInstanceOf(AbortSignal);
      return Promise.reject(abortError);
    });

    try {
      await fetchWithTimeout('https://example.com', {}, 100);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.name).toBe('AbortError');
    }
    vi.restoreAllMocks();
  });

  it('fetchWithRetry 在成功时返回响应', async () => {
    const { fetchWithRetry } = await import('../src/modules/network.js');
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const response = await fetchWithRetry('https://example.com', {}, {
      retries: 1,
      retryDelayMs: 1,
    });
    expect(response.ok).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('ui-state 模块', () => {
  beforeEach(() => {
    // Set up minimal DOM
    document.body.innerHTML = `
      <mdui-checkbox id="text-checkbox"></mdui-checkbox>
      <mdui-checkbox id="voice-checkbox"></mdui-checkbox>
      <mdui-checkbox id="media-checkbox"></mdui-checkbox>
      <mdui-button id="save-button"></mdui-button>
      <mdui-button id="copy-button"></mdui-button>
      <mdui-button id="read-button"></mdui-button>
      <mdui-button id="diagnose-button"></mdui-button>
    `;
  });

  it('toggleInteractiveState 禁用所有交互元素', async () => {
    const { toggleInteractiveState } = await import('../src/modules/ui-state.js');
    toggleInteractiveState(true);

    const ids = [
      'text-checkbox',
      'voice-checkbox',
      'media-checkbox',
      'save-button',
      'copy-button',
      'read-button',
      'diagnose-button',
    ];
    for (const id of ids) {
      expect(document.getElementById(id).disabled).toBe(true);
    }
  });

  it('toggleInteractiveState 启用在禁用后重新启用', async () => {
    const { toggleInteractiveState } = await import('../src/modules/ui-state.js');
    toggleInteractiveState(true);
    toggleInteractiveState(false);
    expect(document.getElementById('save-button').disabled).toBe(false);
  });

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
});

describe('status-display 模块', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="feature-item">
        <strong>游戏文本</strong>
        <mdui-chip id="text-status" class="feature-status">
          <span class="status-label">加载中</span>
          <span class="ui-icon status-icon-loading"></span>
        </mdui-chip>
      </div>
      <div id="status-announcer"></div>
    `;
  });

  it('setStatus 更新状态标签和图标', async () => {
    const { setStatus } = await import('../src/modules/status-display.js');
    setStatus('text-status', 'ready');

    const chip = document.getElementById('text-status');
    expect(chip.querySelector('.status-label').textContent).toBe('可启用');
    expect(chip.querySelector('.ui-icon').className).toContain('status-icon-ready');
  });

  it('setStatus 在失败时添加 error class', async () => {
    const { setStatus } = await import('../src/modules/status-display.js');
    setStatus('text-status', 'failed');

    const chip = document.getElementById('text-status');
    expect(chip.classList.contains('status-error')).toBe(true);
    expect(chip.querySelector('.status-label').textContent).toBe('未获取');
  });

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
    expect(labelWrites).toEqual(['可启用']);
    expect(iconWrites).toEqual(['ui-icon status-icon-ready']);

    setStatus('text-status', 'ready');
    expect(labelWrites).toEqual(['可启用']);
    expect(iconWrites).toEqual(['ui-icon status-icon-ready']);
  });
});

describe('clipboard 模块', () => {
  it('copyText 使用 navigator.clipboard.writeText', async () => {
    const { copyText } = await import('../src/modules/clipboard.js');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const result = await copyText('test-text');
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('test-text');
  });
});

describe('UID 验证行为', () => {
  it('有效 UID 格式为 8 位大写字母', async () => {
    const { resolveUidRoute } = await import('../src/lib/uid-routing.js');
    expect(resolveUidRoute('http://localhost:8080/ABCDEFGH').isValidUid).toBe(true);
    expect(resolveUidRoute('http://localhost:8080/abcdefgh').isValidUid).toBe(false);
    expect(resolveUidRoute('http://localhost:8080/ABCDEFG').isValidUid).toBe(false);
    expect(resolveUidRoute('http://localhost:8080/ABCDEFGHI').isValidUid).toBe(false);
  });
});
