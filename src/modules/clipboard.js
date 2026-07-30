export const fallbackCopyText = (text) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.opacity = '0';
  document.body.append(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    textArea.remove();
  }
};

export const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopyText(text);
    }
  }

  return fallbackCopyText(text);
};
