import { hashString } from './random';
import { blessingKey } from './text';

// Word cloud in the shape of a heart ("ענן מילים בצורת לב").
// Layout happens in a virtual CLOUD_W x CLOUD_H box; the SVG on the TV and
// the PNG souvenir both scale it.  The heart is the implicit curve
//   (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0,  x in [-1.1385, 1.1385], y in [-1, 1.236]

export const CLOUD_W = 1000;
export const CLOUD_H = 982;

const X_MIN = -1.1385;
const X_MAX = 1.1385;
const Y_MIN = -1;
const Y_MAX = 1.236;
const START_Y = 0.2; // a bit below the heart's centroid (0.29) so words spread up and down

const toHeartX = (px) => X_MIN + (px / CLOUD_W) * (X_MAX - X_MIN);
const toHeartY = (py) => Y_MAX - (py / CLOUD_H) * (Y_MAX - Y_MIN);
const toPx = (x) => ((x - X_MIN) / (X_MAX - X_MIN)) * CLOUD_W;
const toPy = (y) => ((Y_MAX - y) / (Y_MAX - Y_MIN)) * CLOUD_H;

const insideHeartXY = (x, y) => {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
};

export const insideHeart = (px, py) => insideHeartXY(toHeartX(px), toHeartY(py));

// Outline for drawing: march along rays from the origin (the shape is star-shaped around it).
const buildOutline = (samples = 180) => {
  const pts = [];
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    const dx = Math.cos(t);
    const dy = Math.sin(t);
    let r = 0;
    while (r < 2 && insideHeartXY(r * dx, r * dy)) r += 0.01;
    let lo = Math.max(0, r - 0.01);
    let hi = r;
    for (let k = 0; k < 20; k += 1) {
      const mid = (lo + hi) / 2;
      if (insideHeartXY(mid * dx, mid * dy)) lo = mid;
      else hi = mid;
    }
    pts.push([toPx(lo * dx), toPy(lo * dy)]);
  }
  return pts;
};

const OUTLINE = buildOutline();

export const heartOutlinePath = (scale = 1) =>
  `${OUTLINE.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * scale).toFixed(1)} ${(y * scale).toFixed(1)}`).join(' ')} Z`;

export const WORD_COLORS = ['#E11D48', '#DB2777', '#BE185D', '#F43F5E', '#C026D3', '#9333EA', '#D97706', '#EA580C'];

// Blessings -> weighted cloud entries. The same wish from several people is
// merged and grows; otherwise the first blessings sit in the middle.
export const buildCloudEntries = (blessings) => {
  const byKey = new Map();
  (blessings || []).forEach((b) => {
    const key = blessingKey(b.text);
    if (!key) return;
    const entry = byKey.get(key);
    if (entry) {
      entry.count += 1;
      entry.ids.push(b.id);
    } else {
      byKey.set(key, { key, text: b.text, count: 1, firstAt: b.at || 0, ids: [b.id] });
    }
  });
  return Array.from(byKey.values())
    .sort((a, b) => b.count - a.count || a.firstAt - b.firstAt)
    .map((e) => {
      const h = hashString(e.key);
      const variety = 0.72 + ((h % 1000) / 1000) * 0.4; // 0.72 .. 1.12
      const boost = 1 + 0.7 * (Math.min(e.count, 4) - 1);
      return { ...e, factor: variety * boost, color: WORD_COLORS[h % WORD_COLORS.length] };
    });
};

const PAD = 6;

// Corners first (cheap rejection), then points every few units along all four
// edges - the notch at the top of the heart can poke between sparse samples.
const EDGE_STEP = 6;
const rectInside = (x0, y0, x1, y1) => {
  if (!insideHeart(x0, y0) || !insideHeart(x1, y0) || !insideHeart(x0, y1) || !insideHeart(x1, y1)) return false;
  const cols = Math.ceil((x1 - x0) / EDGE_STEP);
  for (let i = 1; i < cols; i += 1) {
    const x = x0 + ((x1 - x0) * i) / cols;
    if (!insideHeart(x, y0) || !insideHeart(x, y1)) return false;
  }
  const rows = Math.ceil((y1 - y0) / EDGE_STEP);
  for (let i = 1; i < rows; i += 1) {
    const y = y0 + ((y1 - y0) * i) / rows;
    if (!insideHeart(x0, y) || !insideHeart(x1, y)) return false;
  }
  return true;
};

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const findSpot = (w, h, placed) => {
  const cx = CLOUD_W / 2;
  const cy = toPy(START_Y);
  for (let t = 0; t < 400; ) {
    const r = 4.5 * t;
    if (r > CLOUD_W) break;
    const x = cx + r * Math.cos(t) * 1.15;
    const y = cy + r * Math.sin(t) * 0.9;
    const rect = { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
    if (!placed.some((p) => overlaps(p.rect, rect)) && rectInside(rect.x0, rect.y0, rect.x1, rect.y1)) {
      return { x, y, rect };
    }
    t += Math.min(0.5, 9 / Math.max(r, 1));
  }
  return null;
};

export const START_BASE = 110;

// measure(text, fontSize) -> { w, h } in cloud units.
// Returns { items: [{ key, text, color, count, ids, x, y, size }], base }.
// Pass the previous `base` back as startBase: while the words still fit at
// that size, the ones already on screen keep their exact positions.
export const layoutHeartCloud = (entries, measure, { startBase = START_BASE, minSize = 16, maxSize = 150 } = {}) => {
  if (!entries.length) return { items: [], base: startBase };
  let base = startBase;
  let best = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const placed = [];
    let failed = false;
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      const size = Math.max(minSize, Math.min(maxSize, base * e.factor));
      const { w, h } = measure(e.text, size);
      const spot = findSpot(w + PAD * 2, h + PAD * 2, placed);
      if (!spot) {
        failed = true;
        break;
      }
      placed.push({ key: e.key, text: e.text, color: e.color, count: e.count, ids: e.ids, x: spot.x, y: spot.y, size, rect: spot.rect });
    }
    if (placed.length > best.length) best = placed;
    if (!failed) break;
    base *= 0.9;
  }
  return { items: best.map(({ rect, ...item }) => item), base };
};
