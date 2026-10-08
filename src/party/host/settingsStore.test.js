import { CLASS_SETTINGS_KEY, loadSettings, refreshTrivia, refreshWords } from './settingsStore';
import { CLASS_CHARADES, CLASS_TRIVIA_IDS, DEFAULT_CONTENT, TRIVIA_VERSION, WORDS_VERSION, createDefaultSettings, normalizeSettings } from '../config/content';
import { playableQuestions, playableWords } from '../engine/engine';

const KEY = 'hb-settings-v1';
const store = (value) => window.localStorage.setItem(KEY, JSON.stringify(value));
const stored = () => JSON.parse(window.localStorage.getItem(KEY));
const mine = [{ q: 'שאלה שלי', options: ['כן', 'לא'], correct: 1 }];

beforeEach(() => window.localStorage.clear());

test('a TV that saved the old questions gets the new ones and keeps the rest', () => {
  store({ adminPin: '4321', timings: { tapSeconds: 45 }, trivia: [{ q: 'ישנה', options: ['א', 'ב'], correct: 0 }] });
  const settings = loadSettings();
  expect(settings.trivia).toEqual(DEFAULT_CONTENT.trivia);
  expect(settings.adminPin).toBe('4321');
  expect(settings.timings.tapSeconds).toBe(45);
  expect(stored().trivia).toEqual(DEFAULT_CONTENT.trivia);
  expect(stored().triviaVersion).toBe(TRIVIA_VERSION);
});

test('questions edited after the update stay', () => {
  store({ ...normalizeSettings({ adminPin: '4321' }), trivia: mine });
  expect(loadSettings().trivia).toEqual(mine);
});

test('saving from a game that started before the update keeps its edits', () => {
  // a resumed game's settings have no version yet
  const saved = normalizeSettings({ adminPin: '4321', trivia: mine });
  expect(saved.trivia).toEqual(mine);
  expect(saved.triviaVersion).toBe(TRIVIA_VERSION);
});

test('a newer built-in list keeps the on/off choices and the family\'s own questions', () => {
  const q = (id, text, extra) => ({ id, q: text, options: ['א', 'ב', 'ג', 'ד'], correct: 0, ...extra });
  const builtIn = [q('a', 'A?'), q('b', 'B - with the real answer?'), q('c', 'C - new?')];
  const saved = [q('b', 'B?', { off: true }), q('gone', 'no longer built in?'), q('a', 'A?'), { q: 'שאלה שלי', options: ['כן', 'לא'], correct: 1 }];
  expect(refreshTrivia(saved, builtIn)).toEqual([builtIn[0], { ...builtIn[1], off: true }, builtIn[2], saved[3]]);
});

test('every built-in question plays with 4 different answers', () => {
  const settings = createDefaultSettings();
  expect(playableQuestions(settings)).toHaveLength(settings.trivia.length);
  expect(new Set(settings.trivia.map((item) => item.id)).size).toBe(settings.trivia.length);
  settings.trivia.forEach(({ options, correct }) => {
    expect(new Set(options.map((o) => o.trim())).size).toBe(4);
    expect(correct).toBeGreaterThanOrEqual(0);
    expect(correct).toBeLessThan(4);
  });
});

test('a TV that saved the old words gets the new ones and keeps its own', () => {
  store({ adminPin: '4321', words: [{ word: 'אהבה', hint: 'ישן' }, { word: 'שוקולד', hint: 'של המשפחה' }] });
  const { words } = loadSettings();
  expect(words.slice(0, DEFAULT_CONTENT.words.length)).toEqual(DEFAULT_CONTENT.words);
  expect(words.slice(DEFAULT_CONTENT.words.length)).toEqual([{ word: 'שוקולד', hint: 'של המשפחה' }]);
  expect(stored().wordsVersion).toBe(WORDS_VERSION);
});

test('a newer built-in word list keeps the on/off choices and the family\'s own words', () => {
  const builtIn = [
    { id: 'love', word: 'אהבה', hint: 'א' },
    { id: 'fruit', word: 'בננה', hint: 'ב' },
    { id: 'new', word: 'חדשה', hint: 'ח' },
  ];
  const saved = [
    { id: 'love', word: 'אהבה', hint: 'א', off: true },
    { word: 'בננה', hint: 'saved before words had ids', off: true },
    { id: 'gone', word: 'ישנה', hint: 'no longer built in' },
    { word: 'שוקולד', hint: 'של המשפחה' },
  ];
  expect(refreshWords(saved, builtIn)).toEqual([{ ...builtIn[0], off: true }, { ...builtIn[1], off: true }, builtIn[2], saved[3]]);
});

test('every built-in word plays, and words turned off do not', () => {
  const settings = createDefaultSettings();
  expect(playableWords(settings)).toHaveLength(settings.words.length);
  expect(new Set(settings.words.map((w) => w.id)).size).toBe(settings.words.length);
  settings.words[1] = { ...settings.words[1], off: true };
  expect(playableWords(settings).map((w) => w.word)).not.toContain(settings.words[1].word);
  expect(playableWords(settings)).toHaveLength(settings.words.length - 1);
});

test('class mode leaves out the word stage once; the teacher can turn it back on', () => {
  const CLASS = 'hb-class-settings-v1';
  expect(loadSettings(CLASS).stages).not.toContain('word');
  expect(loadSettings().stages).toContain('word'); // the home game keeps it
  // a class copy saved before this change loses it too
  window.localStorage.setItem(CLASS, JSON.stringify({ ...normalizeSettings({ adminPin: '4321' }), classStagesVersion: undefined }));
  expect(loadSettings(CLASS).stages).not.toContain('word');
  // turned back on in the editor: it stays
  const back = { ...JSON.parse(window.localStorage.getItem(CLASS)), stages: ['tap', 'trivia', 'word'] };
  window.localStorage.setItem(CLASS, JSON.stringify(back));
  expect(loadSettings(CLASS).stages).toEqual(['tap', 'trivia', 'word']);
});

test('class mode: 8 questions for the class (the rest off), the short bike answers and simple charades', () => {
  const settings = loadSettings(CLASS_SETTINGS_KEY);
  const on = settings.trivia.filter((q) => !q.off);
  expect(on.map((q) => q.id)).toEqual(DEFAULT_CONTENT.trivia.map((q) => q.id).filter((id) => CLASS_TRIVIA_IDS.includes(id)));
  // with niqqud (the spelling that goes with it), the same right answers
  const plainCount = (text) => text.replace(/[\u0591-\u05C7]/g, '').length;
  on.forEach((q) => {
    const plain = DEFAULT_CONTENT.trivia.find((d) => d.id === q.id);
    expect(q.q).toMatch(/[\u05B0-\u05BC]/);
    expect(Math.abs(plainCount(q.q) - plain.q.length)).toBeLessThanOrEqual(3);
    expect(q.options).toHaveLength(4);
    expect(q.correct).toBe(plain.correct);
  });
  expect(playableQuestions(settings)).toHaveLength(8);
  expect(settings.trivia).toHaveLength(DEFAULT_CONTENT.trivia.length); // still in the pool
  const bike = settings.trivia.find((q) => q.id === 'bike');
  expect(bike.options[bike.correct]).toBe('אַבָּא - אֲבָל בְּעִקָּר לְבַד');
  expect(new Set(bike.options).size).toBe(4);
  expect(settings.charades).toEqual(CLASS_CHARADES);
  // the teacher's later edits stay
  const edited = { ...settings, charades: ['לרקוד'], trivia: settings.trivia.map((q) => (q.id === 'nitzan' ? { ...q, off: false } : q)) };
  window.localStorage.setItem(CLASS_SETTINGS_KEY, JSON.stringify(edited));
  const again = loadSettings(CLASS_SETTINGS_KEY);
  expect(again.charades).toEqual(['לרקוד']);
  expect(playableQuestions(again)).toHaveLength(9);
  // the family game is unchanged
  const home = loadSettings();
  expect(playableQuestions(home)).toHaveLength(DEFAULT_CONTENT.trivia.length);
  expect(home.charades).toEqual(DEFAULT_CONTENT.charades);
});
