import { normalizeSettings, TRIVIA_VERSION } from '../config/content';
import { readJson, writeJson } from '../lib/storage';

// The content editor's result is kept on the TV computer for future games.
const SETTINGS_KEY = 'hb-settings-v1';

export const saveSettings = (settings) => writeJson(SETTINGS_KEY, settings);

export const loadSettings = () => {
  const saved = readJson(SETTINGS_KEY);
  // questions saved before the built-in ones changed give way to the new ones
  // (everything else this TV saved stays)
  const stale = Boolean(saved) && saved.triviaVersion !== TRIVIA_VERSION;
  const settings = normalizeSettings(stale ? { ...saved, trivia: null } : saved);
  // keep a new admin PIN (and new defaults) for the next games
  if (!saved || stale || saved.adminPin !== settings.adminPin) saveSettings(settings);
  return settings;
};
