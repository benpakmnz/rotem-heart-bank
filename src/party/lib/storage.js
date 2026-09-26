// localStorage/sessionStorage can throw (private mode, blocked storage) -
// the game must keep working without them.
const getStore = (kind) => (kind === 'session' ? window.sessionStorage : window.localStorage);

export const readJson = (key, kind = 'local') => {
  try {
    const raw = getStore(kind).getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const writeJson = (key, value, kind = 'local') => {
  try {
    getStore(kind).setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
};

export const removeKey = (key, kind = 'local') => {
  try {
    getStore(kind).removeItem(key);
  } catch (e) {
    // ignore
  }
};
