import { snackbar } from 'mdui';
import { LANG_CN, LANG_JP } from './config.js';
import { element, toggleInteractiveState } from './ui-state.js';
import { copyText } from './clipboard.js';
import { showTextDialog } from './dialog.js';

export const showSaveErrorDialog = async (_endpoint, errorLines) => {
  return new Promise((resolve) => {
    showTextDialog({
      headline: '保存失败',
      lines: errorLines,
      actions: [
        {
          text: '复制详情',
          variant: 'tonal',
          onClick: async () => {
            const copied = await copyText(errorLines.join('\n'));
            snackbar({
              message: copied ? '已复制到剪贴板' : '复制失败',
              closeable: true,
            });
          },
        },
        {
          text: '关闭',
          variant: 'text',
          closeOnClick: true,
        },
      ],
    });
    resolve();
  });
};

export const setupSaveButton = ({ getUID, hasUid, getEndpoint, fetchWithRetryFn }) => {
  let savePending = false;

  element('save-button').addEventListener('click', async () => {
    if (savePending) return;

    if (!hasUid) {
      showTextDialog({
        headline: '无法保存',
        lines: [
          '当前链接缺少有效的 UID 参数',
          '无法确认要保存到哪个账号',
          '请从游戏内公告 → 活动 → 控制面板进入，通过完整链接重新打开页面',
        ],
        closeOnOverlayClick: false,
        closeOnEsc: false,
        actions: [{ text: '关闭', variant: 'tonal', closeOnClick: true }],
      });
      return;
    }

    savePending = true;
    const saveBtn = element('save-button');
    saveBtn.loading = true;
    toggleInteractiveState(true);

    try {
      const uid = getUID();
      const text = element('text-checkbox').checked ? LANG_CN : LANG_JP;
      const voice = element('voice-checkbox').checked ? LANG_CN : LANG_JP;
      const media = element('media-checkbox').checked ? LANG_CN : LANG_JP;
      const params = new URLSearchParams({ uid, text, voice, media });
      const endpoint = `${getEndpoint()}?${params}`;

      const response = await fetchWithRetryFn(endpoint);

      if (response.ok) {
        snackbar({
          message: '设置已保存，重启游戏后生效',
          closeable: true,
        });
      } else {
        const responseBody = await response.text().catch(() => '无法读取响应体');
        const errorLines = [
          `接口: ${endpoint}`,
          `状态码: ${response.status}`,
          `错误信息: ${response.statusText}`,
          `时间: ${new Date().toLocaleString('zh-CN')}`,
          `响应内容: ${responseBody}`,
        ];
        await showSaveErrorDialog(endpoint, errorLines);
      }
    } catch (err) {
      const errorLines = [
        `接口: ${getEndpoint()}`,
        `状态码: N/A`,
        `错误信息: ${err.name === 'AbortError' ? '请求超时' : '请求异常'}`,
        `时间: ${new Date().toLocaleString('zh-CN')}`,
        `错误内容: ${err instanceof Error ? err.message : '未知错误'}`,
      ];
      await showSaveErrorDialog(getEndpoint(), errorLines);
    } finally {
      saveBtn.loading = false;
      toggleInteractiveState(false);
      savePending = false;
    }
  });
};
