import { DEFAULT_HUNT, DEFAULT_TIMINGS, HEART_KINDS, STAGE_IDS } from './game';

// Default content of "בנק הלבבות של רותם". Everything here can be edited from
// the TV screen (⚙️ עריכת תוכן) before the party.

// Bump when the built-in questions change: a TV that saved the older list
// gets the new one and keeps its on/off choices (see settingsStore).
export const TRIVIA_VERSION = 6;
// The same for the built-in words.
export const WORDS_VERSION = 3;

export const DEFAULT_CONTENT = {
  birthdayName: 'רותם',
  age: 7,
  // The family's questions about Rotem - the pool the editor turns on and off
  // (the id ties a question to this list). Answers marked "placeholder" are
  // not confirmed yet.
  trivia: [
    { id: 'unicorns', q: 'כמה בובות חד-קרן יש לרותם מעל המיטה?', options: ['3', '5', '6', '8'], correct: 3 }, // placeholder
    { id: 'mom-nickname', q: 'מה שם החיבה של אמא לרותם?', options: ['פיצפונת', 'מתוקולינה', 'גורדוליני', 'רותמוש'], correct: 2 },
    {
      id: 'nitzan',
      q: 'מי זאת ניצן?',
      options: ['מורה שלימדה את רותם לקרוא', 'קלינאית תקשורת שלימדה את רותם לומר ל׳', 'מאמנת שלימדה את רותם לשחות', 'גננת שלימדה את רותם לכתוב'],
      correct: 1,
    },
    { id: 'teeth', q: 'כמה שיניים נפלו לרותם עד היום?', options: ['6', '7', '8', '9'], correct: 2 },
    { id: 'tooth-fairy', q: 'איך קוראים לפיית השיניים של רותם?', options: ['מרים', 'פנינה', 'טינקרבל', 'שושנה'], correct: 0 },
    {
      id: 'costume',
      q: 'לאיזו מהתחפושות האלה רותם אף פעם לא התחפשה?',
      options: ['מוכרת גלידות', 'מלכת השמש', 'אינדיאנית', 'שוטרת'],
      correct: 3,
    },
    {
      id: 'shachar-animal',
      q: 'שאלנו את שחר: אם רותם הייתה חיה, איזו חיה היא הייתה?',
      options: ['חתלתולה', 'קופיפה', 'תרנגולת', 'דולפין'],
      correct: 2,
    },
    { id: 'subject', q: 'מה המקצוע שרותם הכי אוהבת ללמוד?', options: ['חשבון', 'אנגלית', 'אומנות', 'ההפסקה 😉'], correct: 0 }, // placeholder
    { id: 'height', q: 'מה הגובה של רותם?', options: ['116 ס״מ', '120 ס״מ', '124 ס״מ', '128 ס״מ'], correct: 1 }, // placeholder
    {
      id: 'done',
      q: 'מה מהדברים האלה רותם כבר עשתה?',
      options: ['להחזיק נחש', 'לרכוב על גמל', 'לישון באוהל', 'לצוף בים המלח'],
      correct: 2, // placeholder
    },
    {
      id: 'bedtime',
      q: 'מה רותם תמיד מבקשת לפני שהיא נרדמת?',
      options: ['עוד סיפור', 'כוס מים', 'להשאיר אור', 'חיבוק משחר'],
      correct: 1,
    },
    {
      id: 'bike',
      q: 'מי לימד את רותם לרכוב על אופניים?',
      options: ['שחר, בחופש הגדול', 'אמא, עם הרבה סבלנות', 'סבא, בפארק', 'אבא, אבל בעיקר היא לבד'],
      correct: 3,
    },
    { id: 'new-game', q: 'איזה משחק חדש רותם למדה לשחק לאחרונה?', options: ['שש-בש', 'שחמט', 'רמיקוב', 'דמקה'], correct: 0 },
    {
      id: 'daniel',
      q: 'איך רותם קוראת לדניאל, החברה הכי טובה שלה, ואיך קראה לה פעם?',
      options: ['דני, ופעם: דניאל הבת', 'דני, ופעם: דניאל הקטנה', 'דנוש, ופעם: דניאלי', 'דניאלה, ופעם: דן-דן'],
      correct: 0,
    },
    {
      id: 'sisters',
      q: 'מה רותם ושחר הכי אוהבות לעשות ביחד?',
      options: ['לרקוד בסלון', 'להציק לאבא', 'לשחק בבובות', 'לראות טלוויזיה'],
      correct: 3,
    },
    { id: 'cake', q: 'איזו עוגת שמרים של אבא רותם הכי אוהבת?', options: ['שוקולד', 'קינמון', 'שוקולד חלווה', 'גבינה'], correct: 1 },
    {
      id: 'candy',
      q: 'שאלנו את רותם: אם היית ממתק, איזה ממתק היית?',
      options: ['סוכרייה על מקל', 'שוקולד', 'מרשמלו', 'סוכריות גומי'],
      correct: 2,
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
  // The pool of words; the editor turns words on and off (the id ties a word
  // to this list).
  words: [
    { id: 'love', word: 'אהבה', hint: 'מה שכולנו מרגישים כלפי רותם 💕' },
    { id: 'hearts', word: 'לבבות', hint: 'מה אוספים לבנק של רותם? ❤️' },
    { id: 'family', word: 'משפחה', hint: 'כל האנשים שחוגגים כאן ביחד 👨‍👩‍👧' },
    { id: 'sisters', word: 'אחיות', hint: 'רותם ושחר הן... 👭' },
    { id: 'princess', word: 'נסיכה', hint: 'בת של מלך ומלכה - כמו רותם 👑' },
    { id: 'nickname', word: 'גורדוליני', hint: 'איך אמא קוראת לרותם? 🥰' },
    { id: 'doll', word: 'רוני', hint: 'הבובה האהובה של רותם 🧸' },
    { id: 'bluey', word: 'בלואי', hint: 'דמות מסדרת טלוויזיה שרותם אוהבת 📺' },
    { id: 'prince', word: 'נסיך מצרים', hint: 'הצגת ילדים שרותם צפתה בה מיליון פעמים 🎭' },
    { id: 'fruit', word: 'בננה', hint: 'פרי שרותם אוהבת במיוחד 😋' },
    { id: 'cards', word: 'חתחתול', hint: 'משחק קלפים שרותם מאוד אוהבת 🃏' },
    { id: 'mazal-tov', word: 'מזל טוב', hint: 'מה אומרים ביום הולדת? 🎉' },
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

// The admin's phone logs in with this PIN (see README). Random per TV.
export const randomPin = () => String(1000 + Math.floor(Math.random() * 9000));

export const createDefaultSettings = () => ({
  ...JSON.parse(JSON.stringify(DEFAULT_CONTENT)),
  timings: { ...DEFAULT_TIMINGS },
  // 0 = computed from the number of players when the game starts.
  bankTarget: 0,
  stages: STAGE_IDS.slice(),
  hunt: JSON.parse(JSON.stringify(DEFAULT_HUNT)),
  adminPin: randomPin(),
  triviaVersion: TRIVIA_VERSION,
  wordsVersion: WORDS_VERSION,
});

const cleanHunt = (hunt) => {
  const out = { minutes: Math.max(0, Math.min(60, Number(hunt && hunt.minutes) || 0)) };
  HEART_KINDS.forEach(({ id }) => {
    const k = (hunt && hunt[id]) || DEFAULT_HUNT[id];
    out[id] = {
      count: Math.max(0, Math.min(12, Math.floor(Number(k.count) || 0))),
      points: Math.max(0, Math.floor(Number(k.points) || 0)),
    };
  });
  return out;
};

// Fill in anything missing from older saved settings.
export const normalizeSettings = (saved) => {
  const defaults = createDefaultSettings();
  if (!saved || typeof saved !== 'object') return defaults;
  const list = (value, fallback) => (Array.isArray(value) ? value : fallback);
  // (the basket stage was removed; its old settings are dropped)
  const { basket, ...kept } = saved;
  return {
    ...defaults,
    ...kept,
    birthdayName: String(saved.birthdayName || defaults.birthdayName).trim() || defaults.birthdayName,
    trivia: list(saved.trivia, defaults.trivia),
    charades: list(saved.charades, defaults.charades),
    words: list(saved.words, defaults.words),
    blessingSuggestions: list(saved.blessingSuggestions, defaults.blessingSuggestions),
    timings: { ...defaults.timings, ...(saved.timings || {}) },
    bankTarget: Math.max(0, Number(saved.bankTarget) || 0),
    stages: Array.isArray(saved.stages) ? STAGE_IDS.filter((id) => saved.stages.includes(id)) : defaults.stages,
    hunt: saved.hunt ? cleanHunt({ ...defaults.hunt, ...saved.hunt }) : defaults.hunt,
    adminPin: /^\d{4,6}$/.test(String(saved.adminPin || '')) ? String(saved.adminPin) : defaults.adminPin,
    triviaVersion: TRIVIA_VERSION,
    wordsVersion: WORDS_VERSION,
  };
};
