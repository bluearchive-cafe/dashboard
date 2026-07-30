const getBrowserEngineVersion = () => {
  const { userAgent } = navigator;
  const edge = userAgent.match(/Edg\/([\d.]+)/);
  if (edge) return `Chromium ${edge[1]} (Edge)`;

  const chrome = userAgent.match(/Chrome\/([\d.]+)/);
  if (chrome) return `Chromium ${chrome[1]}`;

  const firefox = userAgent.match(/Firefox\/([\d.]+)/);
  if (firefox) return `Gecko ${firefox[1]} (Firefox)`;

  const safari = userAgent.match(/Version\/([\d.]+).*Safari/);
  if (safari) return `WebKit ${safari[1]} (Safari)`;

  return '无法识别';
};

const formatVersionLine = (label, versionInfo) => {
  if (!versionInfo) return `${label}: 暂无数据`;
  return `${label}:\n * 官方: ${versionInfo.official}\n * 汉化: ${versionInfo.localized}`;
};

export const getDiagnosticsLines = ({ uid, isValidUid, resourceVersions }) => {
  const {
    userAgent,
    appVersion,
    platform,
    language,
    languages,
    onLine,
    cookieEnabled,
  } = navigator;
  const viewport = `${window.innerWidth} x ${window.innerHeight}`;
  const screenSize = `${window.screen.width} x ${window.screen.height}`;

  return [
    `浏览器内核: ${getBrowserEngineVersion()}`,
    `User-Agent: ${userAgent}`,
    `App Version: ${appVersion}`,
    `平台: ${platform || '未知'}`,
    `语言: ${language || '未知'}`,
    `语言列表: ${Array.isArray(languages) && languages.length ? languages.join(', ') : '未知'}`,
    `在线状态: ${onLine ? '在线' : '离线'}`,
    `Cookie: ${cookieEnabled ? '已启用' : '已禁用'}`,
    `视口尺寸: ${viewport}`,
    `屏幕尺寸: ${screenSize}`,
    `设备像素比: ${window.devicePixelRatio || 1}`,
    `控制面板 UID: ${isValidUid ? uid : '未提供'}`,
    `当前地址: ${location.href}`,
    formatVersionLine('文本资源版本', resourceVersions.text),
    formatVersionLine('语音资源版本', resourceVersions.voice),
    formatVersionLine('媒体资源版本', resourceVersions.media),
  ];
};
