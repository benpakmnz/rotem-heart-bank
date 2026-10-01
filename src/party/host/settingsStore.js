import { createDefaultSettings, normalizeSettings, TRIVIA_VERSION } from '../config/content';
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

export const loadSettings = () => {
  const saved = readJson(SETTINGS_KEY);
  // questions saved before the built-in ones changed give way to the new ones
  // (everything else this TV saved stays)
  const stale = Boolean(saved) && saved.triviaVersion !== TRIVIA_VERSION;
  let trivia = saved && saved.trivia;
  if (stale) {
    trivia = saved.triviaVersion >= FIRST_TRIVIA_WITH_IDS ? refreshTrivia(saved.trivia, createDefaultSettings().trivia) : null;
  }
  const settings = normalizeSettings(saved && { ...saved, trivia });
  // keep a new admin PIN (and new defaults) for the next games
  if (!saved || stale || saved.adminPin !== settings.adminPin) saveSettings(settings);
  return settings;
};
