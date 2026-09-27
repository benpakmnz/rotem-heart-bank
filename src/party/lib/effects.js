import { readJson, writeJson } from './storage';

// How heavy the TV screen's effects are. "lite" keeps the look but drops the
// big moving layers and glow filters that can run a TV browser (or a phone
// running the TV screen) out of graphics memory. Full effects are for laptops.

const KEY = 'hb-fx';
const TV_BROWSER = /web0s|webos|tizen|smart-?tv|netcast|hbbtv|viera|bravia|crkey|googletv|android tv|aft[bmst]|roku|playstation|xbox/i;

export const isTvBrowser = () => typeof navigator !== 'undefined' && TV_BROWSER.test(navigator.userAgent || '');

export const autoLiteFx = () => {
  if (typeof navigator === 'undefined') return false;
  if (isTvBrowser()) return true;
  if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
  // a phone or tablet running the TV screen (mirrored to the TV)
  return Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
};

// ?fx=lite / ?fx=full in the address wins and is remembered on this device.
export const initialLiteFx = () => {
  const param = new URLSearchParams(window.location.search).get('fx');
  if (param === 'lite' || param === 'full') {
    writeJson(KEY, param);
    return param === 'lite';
  }
  const saved = readJson(KEY);
  if (saved === 'lite' || saved === 'full') return saved === 'lite';
  return autoLiteFx();
};

export const saveLiteFx = (lite) => writeJson(KEY, lite ? 'lite' : 'full');

// Was the level picked by hand (menu / ?fx=)? Then the game won't change it.
export const liteFxChosen = () => {
  const saved = readJson(KEY);
  return saved === 'lite' || saved === 'full';
};

// Read by the canvas effects and confetti (outside React).
let lite = false;
export const setLiteFx = (value) => {
  lite = Boolean(value);
};
export const isLiteFx = () => lite;
