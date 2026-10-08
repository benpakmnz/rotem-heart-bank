import {
  SCORING,
  STAGE_IDS,
  COUNTDOWN_MS,
  TAP_TALLY_MS,
  TRIVIA_GRACE_MS,
  CHARADES_PICK_MS,
  CHARADES_MAX_SWAPS,
  WORD_SETTLE_MS,
  FINALE_FILL_MS,
  MAX_TAPS_PER_SECOND,
  MAX_BLESSING_LENGTH,
  HEART_KINDS,
  huntKind,
  stageOrder,
  CLASS_HUNT_HEARTS,
  CLASS_HUNT_PICKS,
} from '../config/game';
import { TEAM_COLORS, teamColor } from '../config/teams';
import { tapPoints, triviaPoints, topTappers, computeBankTarget, meterFraction } from '../lib/scoring';
import { pick, shuffle } from '../lib/random';
import { cleanText, normalizeWord, scrambleLetters, wordLetters, wordShape } from '../lib/text';

// The TV is the single source of truth: it runs this reducer, phones only
// send inputs (taps, answers, words...) and render the published state.
//
// Phases: lobby -> the stages in settings.stages (default: tap -> trivia ->
// hunt -> word -> charades -> blessings) -> finale.
// Steps per phase:
//   lobby:     waiting
//   tap:       intro -> countdown -> active -> tally -> results
//   trivia:    intro -> (question -> reveal) x N -> results
//   hunt:      intro -> search -> results        (the admin assigns found hearts)
//   word:      intro -> (countdown -> play -> outcome) x N -> results
//   charades:  intro -> (pick -> ready -> perform -> outcome) x N -> results
//   blessings: intro -> write
//   finale:    fill -> celebrate
//
// Class mode (a classroom with a projector, no phones): the "players" are
// teams the teacher sets up, and the teacher enters what the phones would
// send. Differences:
//   tap:       intro -> (countdown -> active -> turnDone) x teams -> results
//              (one team at a time; the TV counts its claps or key presses)
//   trivia:    question -> mark -> reveal (the teacher enters each team's
//              raised card; no speed bonus)
//   word:      the teacher picks the team that cracked the word
//   charades:  one round per team; a success scores for the presenting team
//   blessings: the teacher types the words
//   hunt:      intro -> (pick -> exercise -> reveal x 5 -> turnDone) x teams
//              -> results (no running around the room: each team gets a board
//              of 20 numbered hearts, calls out 5 numbers, and solves the math
//              exercise behind each one - the right answer wins the heart)

export const PHASES = ['lobby', ...STAGE_IDS, 'finale'];

// The phase after `phase` in this game's stage order.
export const nextPhase = (s, phase) => {
  const order = stageOrder(s.settings);
  if (phase === 'lobby') return order[0];
  const at = order.indexOf(phase);
  if (at >= 0) return order[at + 1] || 'finale';
  // a stage that was turned off but reached through the menu
  const rest = STAGE_IDS.slice(STAGE_IDS.indexOf(phase) + 1).filter((id) => order.includes(id));
  return rest[0] || 'finale';
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const ms = (s, key) => Math.max(0, Number(s.settings.timings[key]) || 0) * 1000;

// ---------------------------------------------------------------------------
// Content helpers (settings are edited by hand, so be forgiving)

// Questions turned off in the editor stay in the pool but are not asked.
export const playableQuestions = (settings) =>
  (settings.trivia || [])
    .map((item) => {
      if (item && item.off) return null;
      const q = String((item && item.q) || '').trim();
      if (!q) return null;
      const options = [];
      let correct = -1;
      (item.options || []).slice(0, 4).forEach((opt, i) => {
        const text = String(opt || '').trim();
        if (!text) return;
        if (i === Number(item.correct)) correct = options.length;
        options.push(text);
      });
      return options.length >= 2 && correct >= 0 ? { q, options, correct } : null;
    })
    .filter(Boolean);

// Words turned off in the editor stay in the pool but are not played.
export const playableWords = (settings) =>
  (settings.words || [])
    .filter((item) => !(item && item.off))
    .map((item) => ({
      word: normalizeWord(item && item.word),
      hint: String((item && item.hint) || '').trim(),
    }))
    .filter((item) => wordLetters(item.word).length >= 2);

export const playableConcepts = (settings) =>
  (settings.charades || []).map((c) => String(c || '').trim()).filter(Boolean);

const FALLBACK_CONCEPT = 'לרקוד כמו תרנגולת 🐔';

// ---------------------------------------------------------------------------
// Players

export const playerIds = (s) =>
  Object.keys(s.players || {}).sort(
    (a, b) => (s.players[a].joinedAt || 0) - (s.players[b].joinedAt || 0) || (a < b ? -1 : 1)
  );

export const onlinePlayerIds = (s) => playerIds(s).filter((pid) => s.players[pid].online !== false);

export const rankPlayers = (s) =>
  playerIds(s).sort((a, b) => (s.scores[b] || 0) - (s.scores[a] || 0));

// ---------------------------------------------------------------------------
// Class mode teams: a colored heart each (config/teams.js), always listed in
// the colors' order - the order of the turns too.

export const MAX_TEAMS = TEAM_COLORS.length;
export const DEFAULT_TEAM_COUNT = 4;

const usedColors = (s) => new Set(playerIds(s).map((pid) => s.players[pid].color));

const addTeam = (s, color) => {
  const used = usedColors(s);
  const c = TEAM_COLORS.find((x) => x.id === color && !used.has(x.id)) || TEAM_COLORS.find((x) => !used.has(x.id));
  if (!c || playerIds(s).length >= MAX_TEAMS) return false;
  s.teamSeq = (s.teamSeq || 0) + 1;
  const pid = `t${s.teamSeq}`;
  s.players[pid] = { name: c.name, color: c.id, joinedAt: TEAM_COLORS.indexOf(c) + 1, online: true };
  if (s.scores[pid] == null) s.scores[pid] = 0;
  return true;
};

// A game saved before the teams had colors (named teams with animals): every
// team takes a color, in its order.
export const restoreGame = (state) => {
  if (!state || !state.classMode) return state;
  const ids = playerIds(state);
  if (ids.every((pid) => teamColor(state.players[pid].color))) return state;
  const s = clone(state);
  const used = new Set();
  ids.forEach((pid) => {
    const team = s.players[pid];
    const own = teamColor(team.color);
    const c = own && !used.has(own.id) ? own : TEAM_COLORS.find((x) => !used.has(x.id));
    if (!c) return;
    used.add(c.id);
    s.players[pid] = { ...team, name: c.name, color: c.id, joinedAt: TEAM_COLORS.indexOf(c) + 1 };
    delete s.players[pid].avatar;
  });
  return s;
};

// A game resumed after a refresh takes the content saved since it began (new
// questions, charades, words): all of it while still in the lobby, and later
// for the stages that haven't started yet.
export const withSavedContent = (state, settings) => {
  if (!state || !settings) return state;
  if (state.phase === 'lobby') return { ...state, settings: { ...settings, adminPin: state.settings.adminPin } };
  return {
    ...state,
    settings: {
      ...state.settings,
      ...(state.trivia ? {} : { trivia: settings.trivia }),
      ...(state.charades ? {} : { charades: settings.charades }),
      ...(state.word ? {} : { words: settings.words }),
    },
  };
};

// ---------------------------------------------------------------------------
// State

export const createGame = ({ roomCode, settings, now, classMode = false }) => {
  const s = createState({ roomCode, settings, now });
  if (classMode) {
    s.classMode = true;
    for (let i = 0; i < DEFAULT_TEAM_COUNT; i += 1) addTeam(s);
  }
  return s;
};

const createState = ({ roomCode, settings, now }) => ({
  v: 1,
  roomCode,
  createdAt: now,
  settings,
  classMode: false,
  teamSeq: 0,
  players: {},
  phase: 'lobby',
  step: 'waiting',
  round: 0,
  roundId: 'lobby',
  nonce: 0,
  stepStartedAt: now,
  endsAt: 0,
  bank: 0,
  target: 0,
  scores: {},
  inputs: {},
  awards: [],
  awardSeq: 0,
  stageStats: {},
  tap: null,
  trivia: null,
  charades: null,
  word: null,
  blessings: null,
  hunt: null,
  finale: null,
});

const newRoundId = (s, prefix) => {
  s.nonce += 1;
  return `${prefix}-${s.nonce}`;
};

const setStep = (s, step, now, endsAt = 0) => {
  s.step = step;
  s.stepStartedAt = now;
  s.endsAt = endsAt;
};

const award = (s, pid, amount, reason, now, extra = {}) => {
  if (!amount) return;
  s.bank += amount;
  if (pid) s.scores[pid] = (s.scores[pid] || 0) + amount;
  const stats = s.stageStats[s.phase];
  if (stats) {
    stats.gained += amount;
    if (pid) stats.byPlayer[pid] = (stats.byPlayer[pid] || 0) + amount;
  }
  s.awardSeq += 1;
  s.awards.push({ id: s.awardSeq, pid: pid || null, amount, reason, at: now, ...extra });
  if (s.awards.length > 40) s.awards.splice(0, s.awards.length - 40);
};

// Takes back points given by mistake (the admin fixed who found a heart...).
const unaward = (s, pid, amount) => {
  if (!amount) return;
  s.bank = Math.max(0, s.bank - amount);
  if (pid && s.scores[pid] != null) s.scores[pid] = Math.max(0, s.scores[pid] - amount);
  const stats = s.stageStats[s.phase];
  if (stats) {
    stats.gained -= amount;
    if (pid && stats.byPlayer[pid]) stats.byPlayer[pid] -= amount;
  }
};

const ensureTarget = (s) => {
  if (s.target) return;
  const { settings } = s;
  const on = stageOrder(settings);
  s.target =
    settings.bankTarget > 0
      ? settings.bankTarget
      : computeBankTarget({
          players: playerIds(s).length,
          questions: on.includes('trivia') ? playableQuestions(settings).length : 0,
          charadesRounds: on.includes('charades') ? charadesRounds(s) : 0,
          words: on.includes('word') ? playableWords(settings).length : 0,
          tapSeconds: on.includes('tap') ? Number(settings.timings[s.classMode ? 'classTapSeconds' : 'tapSeconds']) || 10 : 0,
          blessings: on.includes('blessings'),
          huntPoints: on.includes('hunt') ? huntTargetPoints(s) : 0,
          classMode: Boolean(s.classMode),
        });
};

// Charades rounds: from the settings, or one per team in class mode.
const charadesRounds = (s) =>
  s.classMode ? Math.max(1, playerIds(s).length) : Math.max(1, Math.floor(Number(s.settings.timings.charadesRounds) || 1));

const enterPhase = (s, phase, now) => {
  if (!PHASES.includes(phase)) return;
  if (phase !== 'lobby') ensureTarget(s);
  s.phase = phase;
  s.round = 0;
  s.inputs = {};
  s.stageStats[phase] = { bankStart: s.bank, gained: 0, byPlayer: {} };
  if (phase === 'lobby') {
    s.roundId = 'lobby';
    setStep(s, 'waiting', now);
    return;
  }
  if (phase === 'finale') {
    const ranking = rankPlayers(s);
    const best = ranking.length ? s.scores[ranking[0]] || 0 : 0;
    s.finale = {
      ranking,
      winners: best > 0 ? ranking.filter((pid) => (s.scores[pid] || 0) === best) : [],
      bankAtStart: s.bank,
    };
    s.roundId = 'finale';
    setStep(s, 'fill', now, now + FINALE_FILL_MS);
    return;
  }
  s.roundId = `${phase}-intro`;
  setStep(s, 'intro', now);
  if (phase === 'tap') s.tap = { startedAt: 0, endedAt: 0, results: null, turn: 0, order: [], counts: {} };
  if (phase === 'trivia') {
    s.trivia = { total: playableQuestions(s.settings).length, current: null, reveal: null, correctCounts: {} };
  }
  if (phase === 'charades') {
    const prev = s.charades || {};
    s.charades = {
      rounds: charadesRounds(s),
      performed: prev.performed || [],
      usedConcepts: prev.usedConcepts || [],
      current: null,
      results: [],
    };
  }
  if (phase === 'word') s.word = { total: playableWords(s.settings).length, current: null, results: [] };
  if (phase === 'blessings' && !s.blessings) s.blessings = { list: [], seen: {}, hidden: {} };
  if (phase === 'hunt' && s.classMode) s.hunt = { math: true, order: [], turn: 0, boards: [], hearts: [], picks: [], current: null, found: {} };
  else if (phase === 'hunt') s.hunt = { hearts: huntHearts(s.settings), found: {}, startedAt: 0 };
};

// ---------------------------------------------------------------------------
// Stage "ציידי הלבבות" (hidden hearts; the admin says who found which)

export const huntHearts = (settings) => {
  const list = [];
  HEART_KINDS.forEach(({ id }) => {
    const { count, points } = huntKind(settings, id);
    for (let i = 1; i <= count; i += 1) list.push({ id: `${id}-${i}`, kind: id, points });
  });
  return list;
};

// Class mode: the hearts of one board (before they're shuffled).
export const classHuntHearts = () =>
  CLASS_HUNT_HEARTS.flatMap(({ kind, count, points }) => Array.from({ length: count }, () => ({ kind, points })));

const CLASS_REVEAL_MS = 4000;

// All hidden hearts count for the target (most of them get found; in class
// mode: 5 hearts a team, most exercises solved).
const huntTargetPoints = (s) => {
  if (!s.classMode) return huntHearts(s.settings).reduce((sum, h) => sum + h.points, 0);
  const hearts = classHuntHearts();
  const average = hearts.reduce((sum, h) => sum + h.points, 0) / hearts.length;
  return playerIds(s).length * CLASS_HUNT_PICKS * average * 0.8;
};

// A math exercise for 2nd grade: + or - up to 20 (no 0s or 1s).
export const mathExercise = (rng) => {
  if (rng() < 0.5) {
    const answer = 6 + Math.floor(rng() * 15); // 6..20
    const a = 2 + Math.floor(rng() * (answer - 3)); // 2..answer-2
    return { a, b: answer - a, op: '+', answer };
  }
  const a = 6 + Math.floor(rng() * 15);
  const b = 2 + Math.floor(rng() * (a - 3));
  return { a, b, op: '-', answer: a - b };
};

// One team at a time, each with its own shuffled board (the boards are dealt
// when the first turn starts).
const startClassHuntTurn = (s, turn, now, rng) => {
  const h = s.hunt;
  if (turn === 0 || !h.order.length) {
    h.order = playerIds(s);
    h.boards = h.order.map((pid) => ({ pid, hearts: shuffle(classHuntHearts(), rng).map((heart, i) => ({ n: i + 1, ...heart })) }));
    h.hearts = h.boards.flatMap((b, i) => b.hearts.map((heart) => ({ id: `b${i + 1}-${heart.n}`, board: i, ...heart })));
    h.picks = [];
    h.found = {};
  }
  let next = turn;
  while (next < h.order.length && !s.players[h.order[next]]) next += 1; // a team that left
  if (next >= h.order.length) {
    setStep(s, 'results', now);
    return;
  }
  h.turn = next;
  h.current = null;
  s.round = next;
  s.roundId = newRoundId(s, 'hunt');
  s.inputs = {};
  setStep(s, 'pick', now);
};

const turnPicks = (s) => s.hunt.picks.filter((p) => p.board === s.hunt.turn);

// The team calls out a heart's number: its exercise shows.
const classPick = (s, n, now, rng) => {
  const num = Math.floor(Number(n));
  if (s.step !== 'pick' || !(num >= 1 && num <= s.hunt.boards[s.hunt.turn].hearts.length)) return false;
  if (turnPicks(s).some((p) => p.n === num)) return false;
  s.hunt.current = { n: num, ...mathExercise(rng) };
  setStep(s, 'exercise', now);
  return true;
};

// The team's answer (null: "we don't know"). Either way the heart opens and
// the chance is used - but only the right answer wins its points.
const classMath = (s, value, now) => {
  const h = s.hunt;
  const cur = h.current;
  if (s.step !== 'exercise' || !cur) return false;
  const given = value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? null : Math.floor(Number(value));
  const correct = given === cur.answer;
  const pid = h.order[h.turn];
  h.picks.push({ board: h.turn, n: cur.n, a: cur.a, b: cur.b, op: cur.op, answer: cur.answer, given, correct });
  const heart = h.hearts.find((x) => x.board === h.turn && x.n === cur.n);
  if (correct && heart && s.players[pid]) {
    h.found[heart.id] = { pid, at: now };
    award(s, pid, heart.points, 'hunt', now, { kind: heart.kind });
  }
  setStep(s, 'reveal', now, now + CLASS_REVEAL_MS);
  return true;
};

const afterClassReveal = (s, now) => {
  s.hunt.current = null;
  setStep(s, turnPicks(s).length >= CLASS_HUNT_PICKS ? 'turnDone' : 'pick', now);
};

const startHunt = (s, now) => {
  const minutes = Math.max(0, Number(s.settings.hunt && s.settings.hunt.minutes) || 0);
  s.roundId = newRoundId(s, 'hunt');
  s.inputs = {};
  s.hunt.startedAt = now;
  setStep(s, 'search', now, minutes ? now + minutes * 60000 : 0);
};

// pid = null takes the heart back (a mistake).
const assignHeart = (s, heartId, pid, now) => {
  const heart = s.hunt.hearts.find((h) => h.id === heartId);
  if (!heart) return false;
  const who = pid && s.players[pid] ? pid : null;
  const prev = s.hunt.found[heartId];
  if ((prev ? prev.pid : null) === who) return false;
  if (prev) unaward(s, prev.pid, heart.points);
  if (who) {
    s.hunt.found[heartId] = { pid: who, at: now };
    award(s, who, heart.points, 'hunt', now, { kind: heart.kind });
  } else {
    delete s.hunt.found[heartId];
  }
  return true;
};

// ---------------------------------------------------------------------------
// Badges: the hearts each player found.

const BADGE_ORDER = HEART_KINDS.map((k) => k.id);

export const playerBadges = (s) => {
  const out = {};
  const add = (pid, badge) => {
    if (!s.players[pid]) return;
    out[pid] = out[pid] || [];
    out[pid].push(badge);
  };
  if (s.hunt) {
    Object.keys(s.hunt.found).forEach((heartId) => {
      const heart = s.hunt.hearts.find((h) => h.id === heartId);
      // (in class mode only the gold hearts make a badge - a team opens 5)
      if (heart && (!s.hunt.math || heart.kind === 'gold')) add(s.hunt.found[heartId].pid, heart.kind);
    });
  }
  Object.values(out).forEach((list) => list.sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b)));
  return out;
};

// ---------------------------------------------------------------------------
// Stage 1 - מטר הלבבות (speed tap)

const startTapCountdown = (s, now) => {
  s.roundId = newRoundId(s, 'tap');
  s.inputs = {};
  s.tap.results = null;
  setStep(s, 'countdown', now, now + COUNTDOWN_MS);
};

const startTapActive = (s, now) => {
  s.tap.startedAt = now;
  setStep(s, 'active', now, now + ms(s, s.classMode ? 'classTapSeconds' : 'tapSeconds'));
};

// Class mode: one team at a time (order = the teams when the stage starts).
const startClassTapTurn = (s, turn, now) => {
  if (!s.tap.order || !s.tap.order.length || turn === 0) s.tap.order = playerIds(s);
  const order = s.tap.order.filter((pid) => s.players[pid]);
  if (turn >= order.length) {
    finishClassTap(s, now);
    return;
  }
  s.tap.order = order;
  s.tap.turn = turn;
  s.round = turn;
  s.roundId = newRoundId(s, 'tap');
  setStep(s, 'countdown', now, now + COUNTDOWN_MS);
};

const endClassTapTurn = (s, now) => {
  s.tap.endedAt = Math.min(now, s.endsAt || now);
  setStep(s, 'turnDone', now);
};

// The TV reports the running count of the team on turn (claps or key presses).
// Its last count may arrive a moment after the turn's time is up.
const CLASS_TAP_LATE_MS = 1500;
const classTap = (s, pid, count, now) => {
  const late = s.step === 'turnDone' && now - s.stepStartedAt <= CLASS_TAP_LATE_MS;
  if ((s.step !== 'active' && !late) || pid !== s.tap.order[s.tap.turn] || !s.players[pid]) return false;
  const seconds = Number(s.settings.timings.classTapSeconds) || 10;
  const n = Math.min(Math.floor(Number(count) || 0), Math.ceil((seconds + 1) * MAX_TAPS_PER_SECOND));
  if (n <= (s.tap.counts[pid] || 0)) return false;
  s.tap.counts[pid] = n;
  return true;
};

const finishClassTap = (s, now) => {
  const counts = {};
  Object.entries(s.tap.counts || {}).forEach(([pid, n]) => {
    if (s.players[pid] && n > 0) counts[pid] = n;
  });
  const bonusWinners = topTappers(counts);
  Object.keys(counts).forEach((pid) => award(s, pid, tapPoints(counts[pid]), 'tap', now));
  bonusWinners.forEach((pid) => award(s, pid, SCORING.tapTopBonus, 'tapTop', now));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  s.tap.results = { counts, bonusWinners, total };
  setStep(s, 'results', now);
};

const startTapTally = (s, now) => {
  s.tap.endedAt = Math.min(now, s.endsAt || now);
  setStep(s, 'tally', now, now + TAP_TALLY_MS);
};

export const tapCounts = (s) => {
  const counts = {};
  Object.keys(s.inputs || {}).forEach((pid) => {
    const n = Math.floor(Number(s.inputs[pid] && s.inputs[pid].count) || 0);
    if (n > 0) counts[pid] = n;
  });
  return counts;
};

const finishTap = (s, now) => {
  const seconds = Math.max(1, ((s.tap.endedAt || now) - (s.tap.startedAt || now)) / 1000);
  const maxTaps = Math.ceil((seconds + 1) * MAX_TAPS_PER_SECOND);
  const counts = {};
  Object.entries(tapCounts(s)).forEach(([pid, n]) => {
    if (s.players[pid]) counts[pid] = Math.min(n, maxTaps);
  });
  const bonusWinners = topTappers(counts);
  Object.keys(counts).forEach((pid) => award(s, pid, tapPoints(counts[pid]), 'tap', now));
  bonusWinners.forEach((pid) => award(s, pid, SCORING.tapTopBonus, 'tapTop', now));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  s.tap.results = { counts, bonusWinners, total };
  setStep(s, 'results', now);
};

// ---------------------------------------------------------------------------
// Stage 2 - מבחן הלבבות (trivia)

const startQuestion = (s, index, now) => {
  const questions = playableQuestions(s.settings);
  s.trivia.total = questions.length;
  s.trivia.reveal = null;
  if (index >= questions.length) {
    s.trivia.current = null;
    setStep(s, 'results', now);
    return;
  }
  const q = questions[index];
  const openAt = now + ms(s, 'triviaReadSeconds');
  const deadline = openAt + Math.max(3000, ms(s, 'triviaAnswerSeconds'));
  s.round = index;
  s.roundId = newRoundId(s, 'trivia');
  s.inputs = {};
  s.trivia.current = { index, q: q.q, options: q.options, correct: q.correct, openAt, deadline };
  setStep(s, 'question', now, deadline);
};

const answerOf = (s, pid) => {
  const input = s.inputs[pid];
  const choice = Number(input && input.choice);
  return Number.isInteger(choice) && choice >= 0 && choice < s.trivia.current.options.length ? choice : -1;
};

const revealTrivia = (s, now) => {
  const cur = s.trivia.current;
  const counts = cur.options.map(() => 0);
  const results = {};
  playerIds(s).forEach((pid) => {
    const choice = answerOf(s, pid);
    if (choice < 0) return;
    const rawAt = Number(s.inputs[pid].at) || now;
    const at = Math.min(Math.max(rawAt, cur.openAt), cur.deadline + TRIVIA_GRACE_MS);
    const correct = choice === cur.correct;
    const points = triviaPoints(correct, at, cur.deadline);
    counts[choice] += 1;
    results[pid] = { choice, correct, points };
    if (correct) {
      s.trivia.correctCounts = s.trivia.correctCounts || {};
      s.trivia.correctCounts[pid] = (s.trivia.correctCounts[pid] || 0) + 1;
    }
    award(s, pid, points, 'trivia', now);
  });
  s.trivia.reveal = { index: cur.index, correct: cur.correct, counts, results };
  setStep(s, 'reveal', now);
};

// Class mode: the teacher enters the card a team raised (-1 clears it). It
// counts as answered at the deadline - every team raises its card together.
const classAnswer = (s, pid, choice) => {
  const cur = s.trivia && s.trivia.current;
  if (!cur || (s.step !== 'question' && s.step !== 'mark') || !s.players[pid]) return false;
  const c = Number(choice);
  if (Number.isInteger(c) && c >= 0 && c < cur.options.length) {
    if (s.inputs[pid] && s.inputs[pid].choice === c) return false;
    s.inputs[pid] = { choice: c, at: cur.deadline };
  } else {
    if (!s.inputs[pid]) return false;
    delete s.inputs[pid];
  }
  return true;
};

const revealIfEveryoneAnswered = (s, now) => {
  const online = onlinePlayerIds(s);
  if (online.length && online.every((pid) => answerOf(s, pid) >= 0)) revealTrivia(s, now);
};

// ---------------------------------------------------------------------------
// Stage 3 - לב הפנטומימה (charades)

const drawConcept = (s, rng) => {
  const concepts = playableConcepts(s.settings);
  if (!concepts.length) return FALLBACK_CONCEPT;
  let unused = concepts.filter((c) => !s.charades.usedConcepts.includes(c));
  if (!unused.length) {
    s.charades.usedConcepts = [];
    unused = concepts;
  }
  const concept = pick(unused, rng);
  s.charades.usedConcepts.push(concept);
  return concept;
};

const startCharadesRound = (s, round, now, rng) => {
  const everyone = playerIds(s);
  const online = onlinePlayerIds(s);
  const pool = online.length ? online : everyone;
  if (round >= s.charades.rounds || !pool.length) {
    s.charades.current = null;
    setStep(s, 'results', now);
    return;
  }
  let candidates = pool.filter((pid) => !s.charades.performed.includes(pid));
  if (!candidates.length) candidates = pool;
  const prev = s.charades.current;
  if (prev && prev.round === round && candidates.length > 1) {
    candidates = candidates.filter((pid) => pid !== prev.performerId);
  }
  s.round = round;
  s.roundId = newRoundId(s, 'charades');
  s.inputs = {};
  s.charades.current = {
    round,
    performerId: pick(candidates, rng),
    concept: drawConcept(s, rng),
    swapsUsed: 0,
    pool,
    startedAt: 0,
    success: null,
  };
  setStep(s, 'pick', now, now + CHARADES_PICK_MS);
};

const startCharadesPerform = (s, now) => {
  s.charades.current.startedAt = now;
  setStep(s, 'perform', now, now + ms(s, 'charadesSeconds'));
};

const finishCharades = (s, success, now) => {
  const cur = s.charades.current;
  cur.success = success;
  s.charades.performed.push(cur.performerId);
  s.charades.results.push({ round: cur.round, performerId: cur.performerId, concept: cur.concept, success });
  if (success && s.classMode) award(s, cur.performerId, SCORING.charadesTeam, 'charades', now);
  else if (success) award(s, null, SCORING.charadesGroup, 'charades', now, { from: cur.performerId });
  setStep(s, 'outcome', now);
};

const handleCharadesInput = (s, now, rng) => {
  const cur = s.charades.current;
  const input = cur && s.inputs[cur.performerId];
  if (!input) return;
  const wanted = Math.min(CHARADES_MAX_SWAPS, Math.floor(Number(input.swaps) || 0));
  while (cur.swapsUsed < wanted) {
    cur.concept = drawConcept(s, rng);
    cur.swapsUsed += 1;
  }
  if (s.step === 'ready' && input.started) startCharadesPerform(s, now);
  if (s.step === 'perform' && input.done) finishCharades(s, true, now);
};

// ---------------------------------------------------------------------------
// Stage 4 - מילת הלב (letters puzzle)

const startWordRound = (s, index, now, rng) => {
  const words = playableWords(s.settings);
  s.word.total = words.length;
  if (index >= words.length) {
    s.word.current = null;
    setStep(s, 'results', now);
    return;
  }
  const { word, hint } = words[index];
  const letters = wordLetters(word);
  const rest = shuffle(
    letters.map((_, i) => i).filter((i) => i > 0),
    rng
  );
  s.round = index;
  s.roundId = newRoundId(s, 'word');
  s.inputs = {};
  s.word.current = {
    index,
    answer: word,
    hint,
    shape: wordShape(word),
    letters: scrambleLetters(letters, rng),
    revealOrder: [0, ...rest], // the first letter is the first hint
    revealed: 0,
    maxReveal: Math.floor(letters.length / 2),
    startedAt: 0,
    firstSolveSeenAt: 0,
    winnerId: null,
  };
  setStep(s, 'countdown', now, now + COUNTDOWN_MS);
};

const startWordPlay = (s, now) => {
  s.word.current.startedAt = now;
  setStep(s, 'play', now, now + ms(s, 'wordSeconds'));
};

const validSolves = (s) => {
  const cur = s.word.current;
  return Object.keys(s.inputs || {})
    .filter((pid) => {
      const input = s.inputs[pid];
      return s.players[pid] && input && Number(input.solvedAt) > 0 && normalizeWord(input.attempt) === cur.answer;
    })
    .sort((a, b) => Number(s.inputs[a].solvedAt) - Number(s.inputs[b].solvedAt) || (a < b ? -1 : 1));
};

const finishWord = (s, winnerId, now) => {
  const cur = s.word.current;
  cur.winnerId = winnerId || null;
  s.word.results.push({ index: cur.index, answer: cur.answer, winnerId: cur.winnerId });
  if (winnerId) award(s, winnerId, SCORING.wordFirst, 'word', now);
  setStep(s, 'outcome', now);
};

const nextRevealAt = (s) => {
  const cur = s.word.current;
  const every = ms(s, 'wordRevealEverySeconds');
  if (!every || cur.revealed >= cur.maxReveal) return Infinity;
  return cur.startedAt + (cur.revealed + 1) * every;
};

const tickWord = (s, now) => {
  const cur = s.word.current;
  const every = ms(s, 'wordRevealEverySeconds');
  if (every) cur.revealed = Math.min(cur.maxReveal, Math.floor((now - cur.startedAt) / every));
  // Wait a moment after the first solve: an earlier solve may still be in flight.
  const settled = cur.firstSolveSeenAt && now >= cur.firstSolveSeenAt + WORD_SETTLE_MS;
  if (settled || now >= s.endsAt + WORD_SETTLE_MS) finishWord(s, validSolves(s)[0] || null, now);
};

// ---------------------------------------------------------------------------
// Stage 5 - מטר הברכות (blessings word cloud)

const startBlessings = (s, now) => {
  s.roundId = 'blessings';
  s.inputs = {};
  setStep(s, 'write', now);
};

const collectBlessings = (s, now) => {
  const max = Math.max(1, Number(s.settings.timings.blessingsPerPlayer) || 1);
  const fresh = [];
  Object.keys(s.inputs || {}).forEach((pid) => {
    const entries = s.inputs[pid];
    if (!s.players[pid] || !entries || typeof entries !== 'object') return;
    Object.keys(entries)
      .map((bid) => ({ bid, entry: entries[bid] }))
      .filter(({ entry }) => entry && entry.text)
      .sort((a, b) => (Number(a.entry.at) || 0) - (Number(b.entry.at) || 0))
      .slice(0, max)
      .forEach(({ bid, entry }) => {
        const id = `${pid}-${bid}`;
        const text = cleanText(entry.text, MAX_BLESSING_LENGTH);
        if (s.blessings.seen[id] || !text) return;
        s.blessings.seen[id] = true;
        fresh.push({ id, pid, text, at: Number(entry.at) || now });
      });
  });
  fresh
    .sort((a, b) => a.at - b.at)
    .forEach((b) => {
      s.blessings.list.push(b);
      award(s, null, SCORING.blessing, 'blessing', now, { from: b.pid, text: b.text });
    });
};

// Class mode: the teacher types a word.
const classBlessing = (s, text, now) => {
  const clean = cleanText(text, MAX_BLESSING_LENGTH);
  if (!clean || !s.blessings) return false;
  s.blessings.typed = (s.blessings.typed || 0) + 1;
  const b = { id: `class-${s.blessings.typed}`, pid: null, text: clean, at: now };
  s.blessings.list.push(b);
  award(s, null, SCORING.blessing, 'blessing', now, { text: clean });
  return true;
};

// ---------------------------------------------------------------------------
// Reducer

// When does the state change by itself (timers)? null = never.
export const nextDueAt = (s) => {
  switch (s.phase) {
    case 'tap':
      return ['countdown', 'active', 'tally'].includes(s.step) ? s.endsAt : null;
    case 'trivia':
      // (the grace is for phone answers still in flight - class mode has none)
      return s.step === 'question' ? s.trivia.current.deadline + (s.classMode ? 0 : TRIVIA_GRACE_MS) : null;
    case 'charades':
      return s.step === 'pick' || s.step === 'perform' ? s.endsAt : null;
    case 'word':
      if (s.step === 'countdown') return s.endsAt;
      if (s.step === 'play') {
        const cur = s.word.current;
        const due = [s.endsAt + WORD_SETTLE_MS, nextRevealAt(s)];
        if (cur.firstSolveSeenAt) due.push(cur.firstSolveSeenAt + WORD_SETTLE_MS);
        return Math.min(...due);
      }
      return null;
    case 'hunt':
      return s.classMode && s.step === 'reveal' ? s.endsAt : null;
    case 'finale':
      return s.step === 'fill' ? s.endsAt : null;
    default:
      return null;
  }
};

const onTick = (s, now) => {
  if (s.phase === 'tap') {
    if (s.step === 'countdown') startTapActive(s, now);
    else if (s.step === 'active' && s.classMode) endClassTapTurn(s, now);
    else if (s.step === 'active') startTapTally(s, now);
    else if (s.step === 'tally') finishTap(s, now);
  } else if (s.phase === 'trivia' && s.step === 'question') {
    if (s.classMode) setStep(s, 'mark', now);
    else revealTrivia(s, now);
  } else if (s.phase === 'charades') {
    if (s.step === 'pick') setStep(s, 'ready', now);
    else if (s.step === 'perform') finishCharades(s, false, now);
  } else if (s.phase === 'word') {
    if (s.step === 'countdown') startWordPlay(s, now);
    else if (s.step === 'play') tickWord(s, now);
  } else if (s.phase === 'hunt' && s.classMode && s.step === 'reveal') {
    afterClassReveal(s, now);
  } else if (s.phase === 'finale' && s.step === 'fill') {
    setStep(s, 'celebrate', now);
  }
};

// The host's main button ("המשך").
const onNext = (s, now, rng) => {
  const { phase, step } = s;
  if (phase === 'lobby') {
    if (!playerIds(s).length) return false;
    s.target = 0;
    ensureTarget(s);
    enterPhase(s, nextPhase(s, 'lobby'), now);
  } else if (step === 'results') {
    enterPhase(s, nextPhase(s, phase), now);
  } else if (phase === 'tap' && s.classMode) {
    if (step === 'intro') startClassTapTurn(s, 0, now);
    else if (step === 'turnDone') startClassTapTurn(s, s.tap.turn + 1, now);
    else return false;
  } else if (phase === 'tap') {
    if (step !== 'intro') return false;
    startTapCountdown(s, now);
  } else if (phase === 'trivia') {
    if (step === 'intro') startQuestion(s, 0, now);
    else if (step === 'question' && s.classMode) setStep(s, 'mark', now);
    else if (step === 'question' || step === 'mark') revealTrivia(s, now);
    else if (step === 'reveal') startQuestion(s, s.round + 1, now);
    else return false;
  } else if (phase === 'charades') {
    if (step === 'intro') startCharadesRound(s, 0, now, rng);
    else if (step === 'ready') startCharadesPerform(s, now);
    else if (step === 'perform') finishCharades(s, true, now);
    else if (step === 'outcome') startCharadesRound(s, s.round + 1, now, rng);
    else return false;
  } else if (phase === 'word') {
    if (step === 'intro') startWordRound(s, 0, now, rng);
    else if (step === 'outcome') startWordRound(s, s.round + 1, now, rng);
    else return false;
  } else if (phase === 'hunt' && s.classMode) {
    if (step === 'intro') startClassHuntTurn(s, 0, now, rng);
    else if (step === 'reveal') afterClassReveal(s, now);
    else if (step === 'turnDone') startClassHuntTurn(s, s.hunt.turn + 1, now, rng);
    else return false;
  } else if (phase === 'hunt') {
    if (step === 'intro') startHunt(s, now);
    else if (step === 'search') setStep(s, 'results', now);
    else return false;
  } else if (phase === 'blessings') {
    if (step === 'intro') startBlessings(s, now);
    else if (step === 'write') enterPhase(s, 'finale', now);
    else return false;
  } else {
    return false;
  }
  return true;
};

const onSkip = (s, now) => {
  const { phase, step } = s;
  if (phase === 'tap' && (step === 'countdown' || step === 'active') && s.classMode) endClassTapTurn(s, now);
  else if (phase === 'tap' && (step === 'countdown' || step === 'active')) startTapTally(s, now);
  else if (phase === 'trivia' && step === 'question' && s.classMode) setStep(s, 'mark', now);
  else if (phase === 'hunt' && s.classMode && step === 'exercise') classMath(s, null, now); // "we don't know"
  else if (phase === 'hunt' && s.classMode && step === 'pick') setStep(s, 'turnDone', now); // the turn ends early
  else if (phase === 'trivia' && step === 'question') revealTrivia(s, now);
  else if (phase === 'charades' && ['pick', 'ready', 'perform'].includes(step)) finishCharades(s, false, now);
  else if (phase === 'word' && (step === 'countdown' || step === 'play')) finishWord(s, null, now);
  else return false;
  return true;
};

// Re-check whatever depends on inputs/players.
const settle = (s, now, rng) => {
  if (s.phase === 'trivia' && s.step === 'question' && now >= s.trivia.current.openAt) {
    revealIfEveryoneAnswered(s, now);
  } else if (s.phase === 'charades' && (s.step === 'ready' || s.step === 'perform')) {
    handleCharadesInput(s, now, rng);
  } else if (s.phase === 'word' && s.step === 'play') {
    if (!s.word.current.firstSolveSeenAt && validSolves(s).length) s.word.current.firstSolveSeenAt = now;
  } else if (s.phase === 'blessings' && s.step === 'write') {
    collectBlessings(s, now);
  }
};

// reduce(state, action, { now, rng }) -> new state (or the same object if nothing changed).
export const reduce = (state, action, ctx) => {
  const now = ctx.now;
  const rng = ctx.rng || Math.random;
  if (action.type === 'tick') {
    const due = nextDueAt(state);
    if (due == null || now < due) return state;
  }
  if (action.type === 'inputs' && action.roundId !== state.roundId) return state;
  // class mode: no phones - the teams come from the teacher, the inputs too
  if (state.classMode && (action.type === 'players' || action.type === 'inputs')) return state;

  const s = clone(state);
  let changed = true;
  switch (action.type) {
    case 'players':
      s.players = action.players || {};
      Object.keys(s.players).forEach((pid) => {
        if (s.scores[pid] == null) s.scores[pid] = 0;
      });
      settle(s, now, rng);
      break;
    case 'inputs':
      s.inputs = action.inputs || {};
      settle(s, now, rng);
      break;
    case 'tick':
      onTick(s, now);
      break;
    case 'next':
      changed = onNext(s, now, rng);
      break;
    case 'skip':
      changed = onSkip(s, now);
      break;
    case 'repick':
      changed = s.phase === 'charades' && (s.step === 'ready' || s.step === 'pick');
      if (changed) startCharadesRound(s, s.round, now, rng);
      break;
    case 'charadesResult':
      changed = s.phase === 'charades' && (s.step === 'ready' || s.step === 'perform');
      if (changed) finishCharades(s, !!action.success, now);
      break;
    case 'goto':
      changed = PHASES.includes(action.phase);
      if (changed) enterPhase(s, action.phase, now);
      break;
    case 'huntAssign':
      changed = !s.classMode && s.phase === 'hunt' && (s.step === 'search' || s.step === 'results') && assignHeart(s, action.heartId, action.pid, now);
      break;
    case 'hideBlessing':
      changed = !!s.blessings;
      if (changed) s.blessings.hidden[action.id] = !s.blessings.hidden[action.id];
      break;
    case 'removePlayer':
      delete s.players[action.pid];
      delete s.scores[action.pid];
      break;
    case 'addTeam':
      changed = Boolean(s.classMode) && s.phase === 'lobby' && addTeam(s, action.color);
      break;
    case 'classTap':
      changed = Boolean(s.classMode) && s.phase === 'tap' && classTap(s, action.pid, action.count, now);
      break;
    case 'classAnswer':
      changed = Boolean(s.classMode) && s.phase === 'trivia' && classAnswer(s, action.pid, action.choice);
      break;
    case 'classSolve':
      changed = Boolean(s.classMode) && s.phase === 'word' && s.step === 'play' && Boolean(s.players[action.pid]);
      if (changed) finishWord(s, action.pid, now);
      break;
    case 'classPick':
      changed = Boolean(s.classMode) && s.phase === 'hunt' && classPick(s, action.n, now, rng);
      break;
    case 'classMath':
      changed = Boolean(s.classMode) && s.phase === 'hunt' && classMath(s, action.value, now);
      break;
    case 'classBlessing':
      changed = Boolean(s.classMode) && s.phase === 'blessings' && s.step === 'write' && classBlessing(s, action.text, now);
      break;
    case 'settings':
      s.settings = action.settings;
      break;
    default:
      changed = false;
  }
  return changed ? s : state;
};

// ---------------------------------------------------------------------------
// What the phones see (rooms/<code>/state)

const publicData = (s) => {
  switch (s.phase) {
    case 'tap': {
      const results = s.step === 'results' && s.tap.results ? { results: s.tap.results } : {};
      // class mode: whose turn it is (the teacher's phone shows it while it listens)
      if (s.classMode) return { order: s.tap.order || [], turn: s.tap.turn || 0, counts: s.tap.counts || {}, ...results };
      return results;
    }
    case 'trivia': {
      const cur = s.trivia.current;
      if (!cur || (s.step !== 'question' && s.step !== 'reveal')) return { total: s.trivia.total };
      const data = {
        index: cur.index,
        total: s.trivia.total,
        q: cur.q,
        options: cur.options,
        openAt: cur.openAt,
        deadline: cur.deadline,
      };
      return s.step === 'reveal' ? { ...data, reveal: s.trivia.reveal } : data;
    }
    case 'charades': {
      const cur = s.charades.current;
      const data = { round: s.round, rounds: s.charades.rounds };
      if (!cur || s.step === 'intro' || s.step === 'results') return data;
      return {
        ...data,
        performerId: cur.performerId,
        pool: cur.pool,
        startedAt: cur.startedAt,
        ...(s.step === 'outcome' ? { success: cur.success, concept: cur.concept } : {}),
      };
    }
    case 'word': {
      const cur = s.word.current;
      if (!cur || s.step === 'intro' || s.step === 'results') return { total: s.word.total };
      return {
        index: cur.index,
        total: s.word.total,
        hint: cur.hint,
        shape: cur.shape,
        letters: cur.letters,
        answer: cur.answer,
        revealed: cur.revealOrder.slice(0, cur.revealed),
        winnerId: cur.winnerId,
      };
    }
    case 'blessings':
      return {
        max: Math.max(1, Number(s.settings.timings.blessingsPerPlayer) || 1),
        suggestions: s.settings.blessingSuggestions || [],
        count: s.blessings ? s.blessings.list.length : 0,
      };
    case 'hunt':
      if (s.hunt && s.hunt.math) return { math: true, turn: s.hunt.turn, teams: s.hunt.order.length };
      return s.hunt
        ? {
            hearts: s.hunt.hearts.map((h) => ({ ...h, pid: s.hunt.found[h.id] ? s.hunt.found[h.id].pid : null })),
            startedAt: s.hunt.startedAt,
          }
        : {};
    case 'finale':
      return s.finale ? { ranking: s.finale.ranking, winners: s.finale.winners } : {};
    default:
      return {};
  }
};

export const toPublic = (s) => ({
  phase: s.phase,
  step: s.step,
  round: s.round,
  roundId: s.roundId,
  stepStartedAt: s.stepStartedAt,
  endsAt: s.endsAt || 0,
  bank: s.bank,
  target: s.target,
  meter: meterFraction(s.bank, s.target, { full: s.phase === 'finale' }),
  scores: s.scores,
  name: s.settings.birthdayName,
  classMode: Boolean(s.classMode),
  // class mode: the teams (no phones join, so the teacher's phone gets them here)
  ...(s.classMode ? { teams: s.players } : {}),
  stages: stageOrder(s.settings),
  badges: playerBadges(s),
  data: publicData(s),
});

// Secrets for one phone only (rooms/<code>/private/<pid>): the charades concept.
export const privateMessages = (s) => {
  if (s.classMode) return {}; // the teacher passes the concept on
  const cur = s.phase === 'charades' && s.charades && s.charades.current;
  if (!cur || !['pick', 'ready', 'perform'].includes(s.step)) return {};
  return {
    [cur.performerId]: {
      roundId: s.roundId,
      concept: cur.concept,
      swapsLeft: Math.max(0, CHARADES_MAX_SWAPS - cur.swapsUsed),
    },
  };
};
