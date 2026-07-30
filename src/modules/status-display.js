import { statusStyles } from './config.js';
import { element } from './ui-state.js';

export const setStatus = (id, state) => {
  const chip = element(id);
  if (!chip) return;

  const style = statusStyles[state];
  chip.querySelector('.status-label').textContent = style.text;

  const icon = chip.querySelector('.ui-icon');
  if (icon) {
    icon.className = `ui-icon ${style.css}`;
  }

  // 失败状态使用 M3 error 色
  chip.classList.toggle('status-error', state === 'failed');

  // 通知读屏软件状态变化
  const announcer = element('status-announcer');
  if (announcer) {
    const featureName =
      chip.closest('.feature-item')?.querySelector('strong')?.textContent || id;
    announcer.textContent = `${featureName}: ${style.text}`;
  }
};
