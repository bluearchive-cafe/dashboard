import { APP_CONFIG } from './config.js';
import { element } from './ui-state.js';
import { copyText } from './clipboard.js';
import { showTextDialog } from './dialog.js';

export const setupCopyButton = ({ getUID, hasUid }) => {
  element('copy-button').addEventListener('click', async () => {
    if (!hasUid) {
      showTextDialog({
        headline: '缺少参数',
        lines: [
          '当前链接缺少有效的 UID 参数',
          '暂时无法生成分享链接',
          '请从游戏内公告 → 活动 → 控制面板进入，通过完整链接重新打开页面',
        ],
        closeOnOverlayClick: false,
        closeOnEsc: false,
        actions: [{ text: '关闭', variant: 'tonal', closeOnClick: true }],
      });
      return;
    }

    const uid = getUID();
    const shareUrl = `${APP_CONFIG.urls.shareBase}/${uid}`;
    const copied = await copyText(shareUrl);

    showTextDialog({
      headline: copied ? '复制成功' : '复制失败',
      lines: copied
        ? [
            `UID: ${uid}`,
            '控制面板链接已复制到剪贴板',
            '可粘贴到浏览器中打开',
            '请妥善保管，避免被他人修改设置',
          ]
        : [
            '当前浏览器无法自动写入剪贴板',
            '请手动复制下面的链接并在浏览器中打开',
            shareUrl,
          ],
      actions: [{ text: '关闭', variant: 'tonal', closeOnClick: true }],
    });
  });
};
