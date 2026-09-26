export const randomInt = (n, rng = Math.random) => Math.floor(rng() * n);

export const pick = (arr, rng = Math.random) =>
  arr && arr.length ? arr[randomInt(arr.length, rng)] : undefined;

export const shuffle = (arr, rng = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ID_CHARS = 'abcdefghijkmnopqrstuvwxyz23456789';

export const randomId = (length = 10) => {
  const bytes = new Uint8Array(length);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join('');
};

// Small deterministic PRNG (mulberry32) - used by tests and for stable visuals.
export const createRng = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// FNV-1a, for picking stable colors/sizes per word.
export const hashString = (text) => {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};
