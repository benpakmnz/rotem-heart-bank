// Tiny helpers for "a/b/c" paths over plain JSON trees (local transport).

export const splitPath = (path) => String(path || '').split('/').filter(Boolean);

export const joinPath = (...parts) => parts.flatMap(splitPath).join('/');

export const getIn = (tree, path) => {
  let node = tree;
  for (const key of splitPath(path)) {
    if (node == null || typeof node !== 'object') return null;
    node = node[key];
  }
  return node === undefined ? null : node;
};

const isEmptyObject = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;

// Firebase semantics: null deletes, empty objects vanish.
export const setIn = (tree, path, value) => {
  const keys = splitPath(path);
  const root = tree && typeof tree === 'object' ? tree : {};
  if (!keys.length) return value == null || isEmptyObject(value) ? {} : value;
  const stack = [root];
  let node = root;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (node[key] == null || typeof node[key] !== 'object') {
      if (value == null) return root;
      node[key] = {};
    }
    node = node[key];
    stack.push(node);
  }
  const last = keys[keys.length - 1];
  if (value == null || isEmptyObject(value)) delete node[last];
  else node[last] = value;
  for (let i = keys.length - 2; i >= 0; i -= 1) {
    if (isEmptyObject(stack[i + 1])) delete stack[i][keys[i]];
  }
  return root;
};

// Does a change at `changed` affect a listener on `watched`?
export const pathsOverlap = (a, b) => {
  const x = splitPath(a);
  const y = splitPath(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return false;
  return true;
};

// Drop undefined/NaN the way JSON (and Firebase) would.
export const toJsonValue = (value) => (value === undefined ? null : JSON.parse(JSON.stringify(value)));
