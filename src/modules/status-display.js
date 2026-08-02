import { statusStyles } from './config.js';
import { element } from './ui-state.js';

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

  // 失败状态使用 M3 error 色
  const isFailed = state === 'failed';
  if (chip.classList.contains('status-error') !== isFailed) {
    chip.classList.toggle('status-error', isFailed);
  }

  // 通知读屏软件状态变化
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
