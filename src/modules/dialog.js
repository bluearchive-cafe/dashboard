import { snackbar } from 'mdui';
import { copyText } from './clipboard.js';

export const showTextDialog = ({
  headline,
  lines,
  actions = [],
  closeOnOverlayClick = true,
  closeOnEsc = true,
}) => {
  const dialog = document.createElement('mdui-dialog');
  dialog.setAttribute('aria-modal', 'true');

  if (closeOnOverlayClick) {
    dialog.setAttribute('close-on-overlay-click', '');
  }

  if (closeOnEsc) {
    dialog.setAttribute('close-on-esc', '');
  }

  const headlineElement = document.createElement('div');
  headlineElement.slot = 'headline';
  headlineElement.textContent = headline;

  const descriptionElement = document.createElement('div');
  descriptionElement.slot = 'description';
  descriptionElement.style.whiteSpace = 'pre-line';
  descriptionElement.textContent = lines.join('\n');

  dialog.append(headlineElement, descriptionElement);

  actions.forEach(({ text, variant = 'text', onClick, closeOnClick = false }) => {
    const actionElement = document.createElement('mdui-button');
    actionElement.slot = 'action';
    actionElement.variant = variant;
    actionElement.textContent = text;
    actionElement.addEventListener('click', async () => {
      if (typeof onClick === 'function') {
        await onClick(dialog);
      }

      if (closeOnClick) {
        dialog.open = false;
      }
    });
    dialog.append(actionElement);
  });

  dialog.addEventListener('closed', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.open = true;
};

export const showHelp = () => {
  showTextDialog({
    headline: '操作说明',
    lines: [
      '1. 先确认各项状态，再决定是否开启对应功能',
      '2. 只有状态为"可用"时，功能才能正常生效',
      '3. 主线中配仅对主线剧情内容生效',
      '4. 开启"图像视频"后，可能需要重新下载相关资源',
    ],
    actions: [
      {
        text: '知道了',
        variant: 'tonal',
        closeOnClick: true,
      },
    ],
  });
};

export const showErrorLog = (chipId, { getErrorLog, getErrorName }) => {
  const chip = document.getElementById(chipId);
  if (!chip || !chip.classList.contains('status-error')) return;

  const log = getErrorLog(chipId);
  const name = getErrorName(chipId);

  if (!log) {
    showTextDialog({
      headline: `「${name}」错误详情`,
      lines: ['暂无详细错误信息'],
      actions: [{ text: '关闭', variant: 'tonal', closeOnClick: true }],
    });
    return;
  }

  const detailLines = [
    `接口: ${log.endpoint}`,
    `状态码: ${log.status}`,
    `错误信息: ${log.statusText}`,
    `时间: ${log.timestamp}`,
    `响应内容: ${log.body}`,
  ];

  showTextDialog({
    headline: `「${name}」获取失败`,
    lines: detailLines,
    actions: [
      {
        text: '复制详情',
        variant: 'tonal',
        onClick: async () => {
          const copied = await copyText(detailLines.join('\n'));
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
};
