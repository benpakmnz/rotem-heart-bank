// Scoring table from the blueprint ("שיטת הניקוד: בדרך ל-100%").
export const SCORING = {
  tapPerTap: 10, // לחיצה מהירה: 10 לכל לחיצה
  tapTopBonus: 500, // +500 ללוחץ הכי מהיר
  triviaCorrect: 1000, // תשובה נכונה בחידון
  triviaPerSecond: 200, // +200 על כל שנייה של מהירות
  wordFirst: 2500, // פיצוח מילה - רק לראשון שמפצח
  charadesGroup: 5000, // הצגת פנטומימה - בונוס קבוצתי לכל המשפחה
  blessing: 500, // every blessing charges Rotem's (family) bank
};

export const DEFAULT_TIMINGS = {
  tapSeconds: 60,
  triviaReadSeconds: 3,
  triviaAnswerSeconds: 15,
  charadesRounds: 3,
  charadesSeconds: 60,
  wordSeconds: 90,
  wordRevealEverySeconds: 15,
  blessingsPerPlayer: 3,
};

// Short fixed pauses of the engine (ms).
export const COUNTDOWN_MS = 3000;
export const TAP_TALLY_MS = 1500; // wait for the last throttled tap writes
export const TRIVIA_GRACE_MS = 1000; // late answers still in flight
export const CHARADES_PICK_MS = 3800; // roulette animation on the TV
export const WORD_SETTLE_MS = 700; // near-simultaneous solves: earliest wins
export const FINALE_FILL_MS = 5000; // the bank fills up to 100%

export const MAX_TAPS_PER_SECOND = 20;
export const CHARADES_MAX_SWAPS = 2;
export const MAX_NAME_LENGTH = 14;
export const MAX_BLESSING_LENGTH = 24;

export const STAGES = [
  {
    id: 'tap',
    num: 1,
    icon: '💓',
    title: 'מטר הלבבות',
    subtitle: 'הפיכת אנרגיה פיזית לאנרגיה דיגיטלית בבנק',
    how: [
      'לוחצים בטירוף על הלב בטלפון',
      'ככל שלוחצים יותר - הלב בטלוויזיה גדל ומתמלא באור זהוב',
    ],
    phoneHint: 'לב ענק ורוד במרכז המסך',
    scoring: [`${SCORING.tapPerTap} לבבות לכל לחיצה`, `+${SCORING.tapTopBonus} ללוחץ הכי מהיר`],
  },
  {
    id: 'trivia',
    num: 2,
    icon: '💡',
    title: 'מבחן הלבבות',
    subtitle: 'טריוויה - כמה טוב אתם מכירים את {name}?',
    how: [
      'השאלה מופיעה בטלוויזיה',
      'עונים בטלפון באחד מ-4 כפתורי הלב הצבעוניים',
    ],
    phoneHint: '4 כפתורים גדולים ונוחים',
    scoring: [`${SCORING.triviaCorrect.toLocaleString('he-IL')} לתשובה נכונה`, `+${SCORING.triviaPerSecond} על כל שנייה של מהירות`],
  },
  {
    id: 'charades',
    num: 3,
    icon: '🎭',
    title: 'לב הפנטומימה',
    subtitle: 'המשחק עובר מהמסך אל מרכז הסלון',
    how: [
      'המציג מקבל לטלפון מושג סודי',
      'כל המשפחה מנחשת בקול רם',
      'מצליחים? המציג לוחץ "הצלחתי!" והבנק נטען',
    ],
    phoneHint: 'מושג סודי רק למציג',
    scoring: [`${SCORING.charadesGroup.toLocaleString('he-IL')} לבבות לכל הצלחה`, 'בונוס קבוצתי לכל המשפחה'],
  },
  {
    id: 'word',
    num: 4,
    icon: '🧩',
    title: 'מילת הלב',
    subtitle: 'חידות אותיות',
    how: [
      'בטלוויזיה מופיע רמז ומשבצות ריקות',
      'בטלפון מופיעות אותיות מבולבלות - מסדרים אותן למילה',
    ],
    phoneHint: 'מקלדת אותיות מעוצבת',
    scoring: [`${SCORING.wordFirst.toLocaleString('he-IL')} לבבות`, 'רק לראשון שמפצח'],
  },
  {
    id: 'blessings',
    num: 5,
    icon: '💌',
    title: 'מטר הברכות',
    subtitle: 'ענן מילים של אהבה',
    how: [
      'כל אחד כותב בטלפון מילה שהוא מאחל ל{name}',
      'המילים עפות לטלוויזיה ויוצרות ענן מילים בצורת לב',
    ],
    phoneHint: 'כותבים ברכה ושולחים',
    scoring: [`כל ברכה טוענת ${SCORING.blessing} לבבות`, 'מזכרת דיגיטלית מהערב'],
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

export const stageById = (id) => STAGES.find((s) => s.id === id) || null;

export const withName = (text, name) => String(text || '').replace(/\{name\}/g, name);

// Colors of the four answer hearts (also used for the option cards on TV).
export const ANSWER_COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981'];
