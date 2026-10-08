import { CLASS_CHARADES, CLASS_TRIVIA_CHANGES, CLASS_TRIVIA_IDS, createDefaultSettings, normalizeSettings, TRIVIA_VERSION, WORDS_VERSION } from '../config/content';
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

// Class mode leaves out stages that don't suit the class: in 2nd grade the
// word stage's scrambled letters are too hard to read. Once per saved copy,
// so the teacher can still turn it back on in the editor.
const CLASS_LEFT_OUT = ['word'];
const CLASS_STAGES_VERSION = 1;

// The class's questions (the others turned off) and charades - also once per
// saved copy, so the teacher's later edits stay.
const CLASS_CONTENT_VERSION = 4; // 2: shorter charades, 3-4: with niqqud
export const classContent = (settings) => ({
  ...settings,
  trivia: settings.trivia.map((q) => (q.id ? { ...q, ...(CLASS_TRIVIA_CHANGES[q.id] || {}), off: !CLASS_TRIVIA_IDS.includes(q.id) } : q)),
  charades: CLASS_CHARADES.slice(),
  classContentVersion: CLASS_CONTENT_VERSION,
});

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
  let settings = normalizeSettings(saved && { ...saved, trivia, words });
  const classStages = key === CLASS_SETTINGS_KEY && (!saved || saved.classStagesVersion !== CLASS_STAGES_VERSION);
  if (classStages) {
    settings = { ...settings, stages: settings.stages.filter((id) => !CLASS_LEFT_OUT.includes(id)), classStagesVersion: CLASS_STAGES_VERSION };
  }
  const classTexts = key === CLASS_SETTINGS_KEY && (!saved || saved.classContentVersion !== CLASS_CONTENT_VERSION);
  if (classTexts) settings = classContent(settings);
  // keep a new admin PIN (and new defaults) for the next games
  if (!saved || stale || staleWords || classStages || classTexts || saved.adminPin !== settings.adminPin) saveSettings(settings, key);
  return settings;
};
