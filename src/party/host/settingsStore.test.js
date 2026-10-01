import { loadSettings, refreshTrivia } from './settingsStore';
import { DEFAULT_CONTENT, TRIVIA_VERSION, createDefaultSettings, normalizeSettings } from '../config/content';
import { playableQuestions } from '../engine/engine';

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
