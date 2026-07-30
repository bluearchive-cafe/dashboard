export const element = (id) => document.getElementById(id);

export const INTERACTIVE_IDS = [
  'text-checkbox',
  'voice-checkbox',
  'media-checkbox',
  'save-button',
  'copy-button',
  'read-button',
  'diagnose-button',
];

export const toggleInteractiveState = (disabled) => {
  INTERACTIVE_IDS.forEach((id) => {
    const el = element(id);
    if (el) el.disabled = disabled;
  });
};
