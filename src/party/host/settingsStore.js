import { normalizeSettings } from '../config/content';
import { readJson, writeJson } from '../lib/storage';

// The content editor's result is kept on the TV computer for future games.
const SETTINGS_KEY = 'hb-settings-v1';

export const loadSettings = () => normalizeSettings(readJson(SETTINGS_KEY));

export const saveSettings = (settings) => writeJson(SETTINGS_KEY, settings);
