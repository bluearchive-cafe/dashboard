import { snackbar } from 'mdui';
import { API_ENDPOINTS, webuiVersion } from './config.js';
import { fetchWithRetry } from './network.js';
import { errorLogs, storeError, RESOURCE_ERROR_NAMES } from './error-store.js';
import { element, toggleInteractiveState } from './ui-state.js';
import { setStatus } from './status-display.js';
import { showTextDialog, showHelp, showErrorLog } from './dialog.js';
import { copyText } from './clipboard.js';
import { getDiagnosticsLines } from './diagnostics.js';
import { setupSaveButton } from './save-handler.js';
import { setupCopyButton } from './copy-link.js';

const resourceVersions = {
  text: null,
  voice: null,
  media: null,
};

const getUID = () => {
  // uid is captured at init time via closure
  return _initUID;
};

let _initUID = '';
let _hasUid = false;
let _isValidUid = false;

export const init = async ({ uid, hasUid, isValidUid }) => {
  _initUID = uid;
  _hasUid = hasUid;
  _isValidUid = isValidUid;

  // Bootstrap: set version and bind event handlers
  element('webui-version').textContent = webuiVersion;
  element('read-button').addEventListener('click', showHelp);

  ['text-status', 'voice-status', 'media-status'].forEach((id) => {
    const chip = element(id);
    if (chip) {
      chip.setAttribute('role', 'status');
      chip.addEventListener('click', () =>
        showErrorLog(id, {
          getErrorLog: (chipId) => errorLogs[chipId],
          getErrorName: (chipId) => RESOURCE_ERROR_NAMES[chipId] || chipId,
        }),
      );
      // Keyboard accessibility: Enter/Space to open error details
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showErrorLog(id, {
            getErrorLog: (chipId) => errorLogs[chipId],
            getErrorName: (chipId) => RESOURCE_ERROR_NAMES[chipId] || chipId,
          });
        }
      });
    }
  });

  // Setup action buttons
  setupSaveButton({
    getUID,
    hasUid: _hasUid,
    getEndpoint: () => API_ENDPOINTS.configSet,
    fetchWithRetryFn: fetchWithRetry,
  });

  setupCopyButton({ getUID, hasUid: _hasUid });

  element('diagnose-button').addEventListener('click', () => {
    const diagnosticsLines = getDiagnosticsLines({
      uid: _initUID,
      isValidUid: _isValidUid,
      resourceVersions,
    });
    showTextDialog({
      headline: '诊断信息',
      lines: diagnosticsLines,
      actions: [
        {
          text: '复制',
          variant: 'tonal',
          onClick: async () => {
            const copied = await copyText(diagnosticsLines.join('\n'));
            snackbar({
              message: copied ? '诊断信息已复制到剪贴板' : '复制失败，请手动复制诊断信息',
              closeable: true,
            });
          },
        },
        {
          text: '关闭',
          variant: 'tonal',
          closeOnClick: true,
        },
      ],
    });
  });

  // ---- Initialization ----
  if (!_hasUid) {
    toggleInteractiveState(true);
    setStatus('text-status', 'failed');
    setStatus('voice-status', 'failed');
    setStatus('media-status', 'failed');
    showTextDialog({
      headline: '链接无效',
      lines: [
        '当前页面缺少必要的 UID 参数',
        '暂时无法读取或保存资源开关配置',
        '请从游戏内公告 → 活动 → 控制面板进入，通过完整链接重新打开页面',
      ],
      closeOnOverlayClick: false,
      closeOnEsc: false,
      actions: [{ text: '知道了', variant: 'tonal', closeOnClick: true }],
    });
    return;
  }

  if (!_isValidUid) {
    toggleInteractiveState(true);
    setStatus('text-status', 'failed');
    setStatus('voice-status', 'failed');
    setStatus('media-status', 'failed');
    showTextDialog({
      headline: 'UID 格式无效',
      lines: [
        '正确的 UID 应为八位随机大写字母（如 ABCDEFGH）',
        '请在游戏内公告 → 异常通知 → UID 中查看正确的 UID',
        '确认后通过完整链接重新打开页面',
      ],
      closeOnOverlayClick: false,
      closeOnEsc: false,
      actions: [{ text: '知道了', variant: 'tonal', closeOnClick: true }],
    });
    return;
  }

  try {
    const [statusRes, configRes] = await Promise.all([
      fetchWithRetry(API_ENDPOINTS.statusList),
      fetchWithRetry(`${API_ENDPOINTS.configGet}?uid=${_initUID}`),
    ]);

    /* —— 处理 status 接口 —— */
    if (statusRes.ok) {
      const status = await statusRes.json();
      resourceVersions.text = {
        official: status.text.official.version,
        localized: status.text.localized.version,
      };
      resourceVersions.voice = {
        official: status.voice.official.version,
        localized: status.voice.localized.version,
      };
      resourceVersions.media = {
        official: status.media.official.version,
        localized: status.media.localized.version,
      };
      const textSynced = status.text.official.version === status.text.localized.version;
      const voiceSynced = status.voice.official.version === status.voice.localized.version;
      const mediaSynced = status.media.official.version === status.media.localized.version;
      setStatus('text-status', textSynced ? 'ready' : 'waiting');
      setStatus('voice-status', voiceSynced ? 'ready' : 'waiting');
      setStatus('media-status', mediaSynced ? 'ready' : 'waiting');
    } else {
      const errorBody = await statusRes.text().catch(() => '无法读取响应体');
      const errorInfo = {
        status: statusRes.status,
        statusText: statusRes.statusText,
        endpoint: API_ENDPOINTS.statusList,
        body: errorBody,
      };
      storeError('text-status', errorInfo);
      storeError('voice-status', errorInfo);
      storeError('media-status', errorInfo);
      setStatus('text-status', 'failed');
      setStatus('voice-status', 'failed');
      setStatus('media-status', 'failed');
    }

    /* —— 处理 config 接口 —— */
    if (configRes.ok) {
      const { text, voice, media } = await configRes.json();
      element('text-checkbox').checked = text === 'cn';
      element('voice-checkbox').checked = voice === 'cn';
      element('media-checkbox').checked = media === 'cn';
    } else {
      // 无已有配置并非错误（新用户 / 从未保存过），使用默认值即可
      const errorBody = await configRes.text().catch(() => '无法读取响应体');
      storeError('config-get', {
        status: configRes.status,
        statusText: configRes.statusText,
        endpoint: `${API_ENDPOINTS.configGet}?uid=${_initUID}`,
        body: errorBody,
      });
    }
  } catch (err) {
    // 整体异常（如网络完全不可达）
    const errorInfo = {
      status: 'N/A',
      statusText: err.name === 'AbortError' ? '请求超时' : '请求异常',
      endpoint: API_ENDPOINTS.statusList,
      body: err instanceof Error ? err.message : '未知错误',
    };
    storeError('text-status', errorInfo);
    storeError('voice-status', errorInfo);
    storeError('media-status', errorInfo);
    storeError('config-get', { ...errorInfo, endpoint: `${API_ENDPOINTS.configGet}?uid=${_initUID}` });
    setStatus('text-status', 'failed');
    setStatus('voice-status', 'failed');
    setStatus('media-status', 'failed');
    snackbar({
      message: '网络异常，无法读取数据。请检查连接后刷新页面',
      closeable: true,
      timeout: 6000,
    });
  }
};
