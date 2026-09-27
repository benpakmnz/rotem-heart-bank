import { normalizeSettings } from '../config/content';
import { readJson, writeJson } from '../lib/storage';

// The content editor's result is kept on the TV computer for future games.
const SETTINGS_KEY = 'hb-settings-v1';

export const saveSettings = (settings) => writeJson(SETTINGS_KEY, settings);

export const loadSettings = () => {
  const saved = readJson(SETTINGS_KEY);
  const settings = normalizeSettings(saved);
  // keep a new admin PIN (and new defaults) for the next games
  if (!saved || saved.adminPin !== settings.adminPin) saveSettings(settings);
  return settings;
};
