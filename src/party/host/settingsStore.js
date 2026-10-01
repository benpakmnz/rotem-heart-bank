import { createDefaultSettings, normalizeSettings, TRIVIA_VERSION, WORDS_VERSION } from '../config/content';
import { readJson, writeJson } from '../lib/storage';

// The content editor's result is kept on the TV computer for future games.
const SETTINGS_KEY = 'hb-settings-v1';

// The first built-in list whose questions have ids.
const FIRST_TRIVIA_WITH_IDS = 3;

export const saveSettings = (settings) => writeJson(SETTINGS_KEY, settings);

// A newer built-in list replaces the saved copy of the old one; this TV's
// on/off choices and the questions the family added here stay.
export const refreshTrivia = (saved, builtIn) => {
  const list = Array.isArray(saved) ? saved.filter(Boolean) : [];
  const off = new Set(list.filter((q) => q.id && q.off).map((q) => q.id));
  const own = list.filter((q) => !q.id);
  return [...builtIn.map((q) => (off.has(q.id) ? { ...q, off: true } : q)), ...own];
};

// New built-in words come in; words the family added on this TV stay.
export const refreshWords = (saved, builtIn) => {
  const known = new Set(builtIn.map((w) => String(w.word).trim()));
  const own = (Array.isArray(saved) ? saved : []).filter((w) => w && String(w.word || '').trim() && !known.has(String(w.word).trim()));
  return [...builtIn, ...own];
};

export const loadSettings = () => {
  const saved = readJson(SETTINGS_KEY);
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
  if (!saved || stale || staleWords || saved.adminPin !== settings.adminPin) saveSettings(settings);
  return settings;
};
