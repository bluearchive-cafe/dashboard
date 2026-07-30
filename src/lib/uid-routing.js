const DASH_HOSTNAME = 'dash.bluearchive.cafe';
const CONTROL_HOSTNAME = 'control.bluearchive.cafe';
const DASH_BASE_URL = 'https://dash.bluearchive.cafe';
const UID_PATTERN = /^[A-Z]{8}$/;

const readPathUid = (pathname) => {
  let encodedUid = pathname.slice(1);
  if (encodedUid.endsWith('/')) {
    encodedUid = encodedUid.slice(0, -1);
  }

  try {
    return decodeURIComponent(encodedUid).trim();
  } catch {
    return encodedUid.trim();
  }
};

export const resolveUidRoute = (href) => {
  const url = new URL(href);
  const readsQuery = url.pathname === '/' || url.pathname === '/index.html';
  const uid = readsQuery
    ? (url.searchParams.get('uid') || '').trim()
    : readPathUid(url.pathname);
  const hasUid = uid !== '';
  const isValidUid = hasUid && UID_PATTERN.test(uid);
  const result = {
    uid,
    hasUid,
    isValidUid,
    navigation: 'none',
    target: null,
  };

  if (!isValidUid) return result;

  const canonicalPath = `/${uid}`;
  const isCanonicalPath = url.pathname === canonicalPath && url.search === '' && url.hash === '';
  const isProduction = url.hostname === DASH_HOSTNAME || url.hostname === CONTROL_HOSTNAME;
  const isCanonicalDash = url.origin === DASH_BASE_URL && isCanonicalPath;

  if (isProduction) {
    if (!isCanonicalDash) {
      result.navigation = 'location';
      result.target = `${DASH_BASE_URL}${canonicalPath}`;
    }
    return result;
  }

  if (!isCanonicalPath) {
    result.navigation = 'history';
    result.target = canonicalPath;
  }
  return result;
};
