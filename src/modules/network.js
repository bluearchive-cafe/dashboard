import { APP_CONFIG } from './config.js';

export const fetchWithTimeout = (url, options = {}, timeout = APP_CONFIG.fetch.timeout) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const fetchWithRetry = async (
  url,
  options = {},
  {
    timeout = APP_CONFIG.fetch.timeout,
    retries = APP_CONFIG.fetch.retries,
    retryDelayMs = APP_CONFIG.fetch.retryDelayMs,
  } = {},
) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeout);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
};
