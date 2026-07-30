export const errorLogs = {};

export const storeError = (id, { status, statusText, endpoint, body }) => {
  errorLogs[id] = {
    status,
    statusText: statusText || '未知',
    body: body || '无',
    endpoint,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
};

export const resetErrors = () => {
  for (const key of Object.keys(errorLogs)) {
    delete errorLogs[key];
  }
};

export const RESOURCE_ERROR_NAMES = {
  'text-status': '游戏文本',
  'voice-status': '主线中配',
  'media-status': '图像视频',
  'config-get': '用户配置',
};
