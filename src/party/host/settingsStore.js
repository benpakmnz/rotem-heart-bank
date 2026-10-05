import { createDefaultSettings, normalizeSettings, TRIVIA_VERSION, WORDS_VERSION } from '../config/content';
import { readJson, writeJson } from '../lib/storage';

// The content editor's result is kept on the TV computer for future games
// (class mode keeps its own: the class's questions, names and timings).
export const SETTINGS_KEY = 'hb-settings-v1';
export const CLASS_SETTINGS_KEY = 'hb-class-settings-v1';
export const settingsKeyFor = (classMode) => (classMode ? CLASS_SETTINGS_KEY : SETTINGS_KEY);

// The first built-in list whose questions have ids.
const FIRST_TRIVIA_WITH_IDS = 3;

export const saveSettings = (settings, key = SETTINGS_KEY) => writeJson(key, settings);

// A newer built-in list replaces the saved copy of the old one; this TV's
// on/off choices and the questions the family added here stay.
export const refreshTrivia = (saved, builtIn) => {
  const list = Array.isArray(saved) ? saved.filter(Boolean) : [];
  const off = new Set(list.filter((q) => q.id && q.off).map((q) => q.id));
  const own = list.filter((q) => !q.id);
  return [...builtIn.map((q) => (off.has(q.id) ? { ...q, off: true } : q)), ...own];
};

// The same for the words. Older saved lists had no ids, so a built-in word
// is also recognized by its text.
export const refreshWords = (saved, builtIn) => {
  const text = (w) => String(w.word || '').trim();
  const list = Array.isArray(saved) ? saved.filter((w) => w && text(w)) : [];
  const builtInText = new Set(builtIn.map(text));
  const off = new Set(list.filter((w) => w.off).flatMap((w) => [w.id, text(w)]));
  const own = list.filter((w) => !w.id && !builtInText.has(text(w)));
  return [...builtIn.map((w) => (off.has(w.id) || off.has(text(w)) ? { ...w, off: true } : w)), ...own];
};

export const loadSettings = (key = SETTINGS_KEY) => {
  const saved = readJson(key);
  // questions saved before the built-in ones changed give way to the new ones
  // (everything else this TV saved stays)
  const stale = Boolean(saved) && saved.triviaVersion !== TRIVIA_VERSION;
  let trivia = saved && saved.trivia;
  if (stale) {
    trivia = saved.triviaVersion >= FIRST_TRIVIA_WITH_IDS ? refreshTrivia(saved.trivia, createDefaultSettings().trivia) : null;
  }
  const staleWords = Boolean(saved) && saved.wordsVersion !== WORDS_VERSION;
  const words = staleWords ? refreshWords(saved.words, createDefaultSettings().words) : saved && saved.words;
  const settings = normalizeSettings(saved && { ...saved, trivia, words });
  // keep a new admin PIN (and new defaults) for the next games
  if (!saved || stale || staleWords || saved.adminPin !== settings.adminPin) saveSettings(settings, key);
  return settings;
};
