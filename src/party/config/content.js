import { DEFAULT_TIMINGS } from './game';

// Default content of "בנק הלבבות של רותם". Everything here can be edited from
// the TV screen (⚙️ עריכת תוכן) before the party - especially the trivia,
// which should be about Rotem. The first question is the blueprint's example.
export const DEFAULT_CONTENT = {
  birthdayName: 'רותם',
  age: 7,
  trivia: [
    {
      q: 'מה רותם הכי אוהבת לעשות בשבת בבוקר?',
      options: ['לרקוד בסלון', 'לצייר לבבות', 'לאכול פנקייק עם אבא', 'ללכת לגינה'],
      correct: 2,
    },
    {
      q: 'בת כמה רותם היום?',
      options: ['5', '6', '7', '8'],
      correct: 2,
    },
    {
      q: 'מה הצבע האהוב על רותם?',
      options: ['ורוד', 'סגול', 'תכלת', 'צהוב'],
      correct: 0,
    },
    {
      q: 'איזו חיה רותם הכי אוהבת?',
      options: ['כלב', 'חתול', 'ארנב', 'סוס'],
      correct: 1,
    },
    {
      q: 'מה המאכל האהוב על רותם?',
      options: ['פיצה', 'פסטה', 'שניצל', 'פנקייק'],
      correct: 0,
    },
    {
      q: 'מה רותם רוצה להיות כשתהיה גדולה?',
      options: ['רופאה', 'זמרת', 'מורה', 'אסטרונאוטית'],
      correct: 1,
    },
  ],
  charades: [
    'לאכול גלידה ורודה 🍦',
    'לכבות נרות על עוגת יום הולדת 🎂',
    'לפתוח מתנה ענקית 🎁',
    'לנפח בלון 🎈',
    'לרקוד בלט 🩰',
    'לשחות בבריכה 🏊',
    'לרכוב על אופניים 🚲',
    'לצחצח שיניים 🪥',
    'קוף שמטפס על עץ 🐒',
    'לבנות ארמון חול 🏰',
    'לקפוץ על טרמפולינה 🤸',
    'חתול ששותה חלב 🐱',
    'לצלם סלפי 🤳',
    'נסיכה על כס מלכות 👑',
    'לאפות עוגה 🧁',
    'כלב שמכשכש בזנב 🐶',
    'לבנות איש שלג ⛄',
    'פרפר שעף בין פרחים 🦋',
    'לשיר במיקרופון 🎤',
    'ארנב שקופץ ואוכל גזר 🐰',
    'לדוג דגים 🎣',
    'טייס של מטוס ✈️',
    'רובוט שרוקד 🤖',
    'לשחק כדורגל ⚽',
    'לצייר ציור ענק 🎨',
  ],
  words: [
    { word: 'אהבה', hint: 'מה שכולנו מרגישים כלפי רותם 💕' },
    { word: 'משפחה', hint: 'כל האנשים שחוגגים כאן ביחד 👨‍👩‍👧' },
    { word: 'מזל טוב', hint: 'מה אומרים ביום הולדת? 🎉' },
  ],
  blessingSuggestions: [
    'אהבה',
    'שמחה',
    'בריאות',
    'הצלחה',
    'חברים',
    'צחוק',
    'אושר',
    'הפתעות',
    'הרפתקאות',
    'חיבוקים',
    'יצירתיות',
    'הגשמת חלומות',
  ],
};

export const createDefaultSettings = () => ({
  ...JSON.parse(JSON.stringify(DEFAULT_CONTENT)),
  timings: { ...DEFAULT_TIMINGS },
  // 0 = computed from the number of players when the game starts.
  bankTarget: 0,
});

// Fill in anything missing from older saved settings.
export const normalizeSettings = (saved) => {
  const defaults = createDefaultSettings();
  if (!saved || typeof saved !== 'object') return defaults;
  const list = (value, fallback) => (Array.isArray(value) ? value : fallback);
  return {
    ...defaults,
    ...saved,
    birthdayName: String(saved.birthdayName || defaults.birthdayName).trim() || defaults.birthdayName,
    trivia: list(saved.trivia, defaults.trivia),
    charades: list(saved.charades, defaults.charades),
    words: list(saved.words, defaults.words),
    blessingSuggestions: list(saved.blessingSuggestions, defaults.blessingSuggestions),
    timings: { ...defaults.timings, ...(saved.timings || {}) },
    bankTarget: Math.max(0, Number(saved.bankTarget) || 0),
  };
};
