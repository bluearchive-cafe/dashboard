export const webuiVersion = 'WebUI v2.0.0';

export const APP_CONFIG = {
  assets: {
    icons: {
      actionSave: 'assets/icons/action-save.svg',
      actionHelp: 'assets/icons/action-help.svg',
      actionCopyLink: 'assets/icons/action-copy-link.svg',
      actionDiagnose: 'assets/icons/action-diagnose.svg',
      statusLoading: 'assets/icons/status-loading.svg',
      statusReady: 'assets/icons/status-ready.svg',
      statusUpdate: 'assets/icons/status-update.svg',
      statusError: 'assets/icons/status-error.svg',
    },
  },
  urls: {
    apiBase: 'https://api.bluearchive.cafe',
    shareBase: 'https://dash.bluearchive.cafe',
  },
  fetch: {
    timeout: 10000,
    retries: 2,
    retryDelayMs: 800,
  },
};

export const API_ENDPOINTS = {
  statusList: `${APP_CONFIG.urls.apiBase}/status/list`,
  configGet: `${APP_CONFIG.urls.apiBase}/config/get`,
  configSet: `${APP_CONFIG.urls.apiBase}/config/set`,
};

export const statusStyles = {
  loading: { text: '加载中', css: 'status-icon-loading' },
  ready: { text: '可用', css: 'status-icon-ready' },
  waiting: { text: '待维护', css: 'status-icon-waiting' },
  failed: { text: '获取失败', css: 'status-icon-failed' },
};

export const LANG_CN = 'cn';
export const LANG_JP = 'jp';
