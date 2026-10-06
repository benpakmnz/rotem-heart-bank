import { stageOrder } from '../config/game';
import { nextPhase, playerIds } from '../engine/engine';

const NEXT = { type: 'next' };
const SKIP = { type: 'skip' };

// The buttons the host (whoever holds the TV remote/mouse) sees right now.
// primary also runs on Enter/Space. teamPick (class mode): one button per
// team - the TV screen draws them itself, the teacher's phone lists them.
const hostActions = (s) => {
  const cls = Boolean(s.classMode);
  if (s.phase === 'lobby') {
    return {
      primary: { icon: '▶', label: 'מתחילים לשחק!', action: NEXT, disabled: playerIds(s).length === 0 },
      secondary: [],
    };
  }
  if (s.phase === 'finale') return { primary: null, secondary: [] };
  if (s.step === 'intro') return { primary: { icon: '▶', label: 'יאללה, מתחילים!', action: NEXT }, secondary: [] };
  if (s.step === 'results') {
    const order = stageOrder(s.settings);
    const next = nextPhase(s, s.phase);
    let label = 'לשלב הבא';
    if (next === 'finale') label = 'לגמר! 🎂';
    else if (next === order[order.length - 1]) label = 'לשלב האחרון';
    return { primary: { icon: '▶', label, action: NEXT }, secondary: [] };
  }

  const lastTrivia = s.trivia && s.trivia.current && s.trivia.current.index + 1 >= s.trivia.total;
  const lastCharades = s.charades && s.round + 1 >= s.charades.rounds;
  const lastWord = s.word && s.round + 1 >= s.word.total;

  switch (`${s.phase}:${s.step}`) {
    case 'tap:countdown':
    case 'tap:active':
      return { primary: null, secondary: [{ icon: '⏭', label: cls ? 'סיום התור' : 'סיום מוקדם', action: SKIP }] };
    case 'tap:turnDone': {
      const next = s.players[(s.tap.order || [])[s.tap.turn + 1]];
      return { primary: { icon: next ? '👏' : '▶', label: next ? `התור של ${next.name}` : 'לסיכום השלב', action: NEXT }, secondary: [] };
    }
    case 'trivia:question':
      return cls
        ? { primary: null, secondary: [{ icon: '✋', label: 'מרימים כרטיסים!', action: NEXT }] }
        : { primary: null, secondary: [{ icon: '👀', label: 'חשיפת התשובה', action: NEXT }] };
    case 'trivia:mark':
      return { primary: { icon: '👀', label: 'חשיפת התשובה', action: NEXT }, secondary: [] };
    case 'trivia:reveal':
      return { primary: { icon: '▶', label: lastTrivia ? 'לסיכום השלב' : 'לשאלה הבאה', action: NEXT }, secondary: [] };
    case 'charades:ready':
      return {
        primary: { icon: '⏱', label: 'הפעלת השעון', action: NEXT },
        secondary: [
          { icon: '🔄', label: cls ? 'קבוצה אחרת' : 'מציג אחר', action: { type: 'repick' } },
          { icon: '⏭', label: 'דילוג', action: SKIP },
        ],
      };
    case 'charades:perform':
      return {
        primary: { icon: '✅', label: 'ניחשו! הצלחה', action: NEXT },
        secondary: [{ icon: '⏭', label: 'לא הצליחו', action: SKIP }],
      };
    case 'charades:outcome':
      return { primary: { icon: '▶', label: lastCharades ? 'לסיכום השלב' : 'לסיבוב הבא', action: NEXT }, secondary: [] };
    case 'word:play':
      return {
        primary: null,
        secondary: [{ icon: '⏭', label: 'דילוג על המילה', action: SKIP }],
        teamPick: cls ? { label: (name) => `${name} פיצח!`, action: (pid) => ({ type: 'classSolve', pid }) } : null,
      };
    case 'word:outcome':
      return { primary: { icon: '▶', label: lastWord ? 'לסיכום השלב' : 'למילה הבאה', action: NEXT }, secondary: [] };
    case 'hunt:search':
      return { primary: { icon: '🏁', label: 'סיום החיפוש', action: NEXT }, secondary: [] };
    // class mode: a team picks numbered hearts and answers their exercises
    case 'hunt:pick':
      return { primary: null, secondary: [{ icon: '⏭', label: 'סיום התור', action: SKIP }] };
    case 'hunt:reveal':
      return { primary: { icon: '▶', label: 'המשך', action: NEXT }, secondary: [] };
    case 'hunt:turnDone': {
      const next = s.players[(s.hunt.order || []).slice(s.hunt.turn + 1).find((pid) => s.players[pid])];
      return { primary: { icon: next ? '💗' : '▶', label: next ? `התור של ${next.name}` : 'לסיכום השלב', action: NEXT }, secondary: [] };
    }
    case 'blessings:write':
      return { primary: { icon: '💖', label: 'למילוי האוצר!', action: NEXT }, secondary: [] };
    default:
      return { primary: null, secondary: [] };
  }
};

export default hostActions;
