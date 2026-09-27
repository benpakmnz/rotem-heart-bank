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

const STAGE_LIST = [
  {
    id: 'tap',
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
  {
    id: 'hunt',
    icon: '🔎',
    title: 'מחפשי הלבבות',
    subtitle: 'ציד אוצרות בבית - לבבות מוחבאים מחכים לכם!',
    how: [
      'בבית מוחבאים לבבות: זהב, כסף ואדומים',
      'מצאתם לב? רוצו להראות אותו למנהל/ת המשחק',
      'מי מצא איזה לב - מופיע מיד בטלוויזיה ובטלפונים',
    ],
    phoneHint: 'מי מצא איזה לב - בזמן אמת',
    scoring: (settings) => HEART_KINDS.filter((k) => huntKind(settings, k.id).count > 0).map((k) => `${k.label}: ${fmtPoints(huntKind(settings, k.id).points)}`),
    real: true,
  },
  {
    id: 'basket',
    icon: '🧺',
    title: 'קליעה ללב',
    subtitle: 'כל אחד בתורו זורק לבבות לסל',
    how: ['כל משתתף בתורו זורק לבבות לסל', 'מנהל/ת המשחק מסמנים כל קליעה', 'קלעתם הכל? בונוס ותג קלע! 🎯'],
    phoneHint: 'כשמגיע התור שלך - הטלפון יגיד',
    scoring: (settings) => {
      const b = basketSettings(settings);
      return [`${fmtPoints(b.hitPoints)} לכל קליעה`, `+${fmtPoints(b.perfectBonus)} על ${b.throws} מתוך ${b.throws}`];
    },
    real: true,
  },
];

const fmtPoints = (n) => `${Number(n || 0).toLocaleString('he-IL')} לבבות`;

// Default order of the stages (the settings can turn stages off).
export const DEFAULT_STAGE_ORDER = ['tap', 'trivia', 'hunt', 'word', 'charades', 'basket', 'blessings'];

export const STAGES = DEFAULT_STAGE_ORDER.map((id) => STAGE_LIST.find((s) => s.id === id));

export const STAGE_IDS = STAGES.map((s) => s.id);

export const stageById = (id) => STAGES.find((s) => s.id === id) || null;

// The stages this game plays, in order.
export const stageOrder = (settings) => {
  const wanted = settings && Array.isArray(settings.stages) ? settings.stages : STAGE_IDS;
  const order = STAGE_IDS.filter((id) => wanted.includes(id));
  return order.length ? order : STAGE_IDS;
};

// The stage + its number in this game ("שלב 3 מתוך 6").
export const stageInfo = (id, order = STAGE_IDS) => {
  const stage = stageById(id);
  if (!stage) return null;
  return { ...stage, num: order.indexOf(id) + 1, total: order.length };
};

export const stageScoring = (stage, settings) => (typeof stage.scoring === 'function' ? stage.scoring(settings) : stage.scoring);

// ---------- stage "מחפשי הלבבות": hidden hearts ----------

export const HEART_KINDS = [
  { id: 'gold', label: 'לב זהב', short: 'זהב', colors: ['#FFF3B8', '#E39A00'] },
  { id: 'silver', label: 'לב כסף', short: 'כסף', colors: ['#FFFFFF', '#8E97AE'] },
  { id: 'red', label: 'לב אדום', short: 'אדום', colors: ['#FF9DB0', '#D3103C'] },
];

export const heartKind = (id) => HEART_KINDS.find((k) => k.id === id) || HEART_KINDS[2];

export const DEFAULT_HUNT = {
  minutes: 5,
  gold: { count: 1, points: 3000 },
  silver: { count: 3, points: 1500 },
  red: { count: 2, points: 1000 },
};

export const huntKind = (settings, kind) => {
  const hunt = (settings && settings.hunt) || DEFAULT_HUNT;
  const k = hunt[kind] || DEFAULT_HUNT[kind] || { count: 0, points: 0 };
  return {
    count: Math.max(0, Math.min(12, Math.floor(Number(k.count) || 0))),
    points: Math.max(0, Math.floor(Number(k.points) || 0)),
  };
};

// ---------- stage "קליעה ללב": throwing hearts into a basket ----------

export const DEFAULT_BASKET = { throws: 3, hitPoints: 700, perfectBonus: 1000 };

export const basketSettings = (settings) => {
  const b = { ...DEFAULT_BASKET, ...((settings && settings.basket) || {}) };
  return {
    throws: Math.max(1, Math.min(10, Math.floor(Number(b.throws) || 1))),
    hitPoints: Math.max(0, Math.floor(Number(b.hitPoints) || 0)),
    perfectBonus: Math.max(0, Math.floor(Number(b.perfectBonus) || 0)),
  };
};

export const withName = (text, name) => String(text || '').replace(/\{name\}/g, name);

// Colors of the four answer hearts (also used for the option cards on TV).
export const ANSWER_COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981'];
