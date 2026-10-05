import { SCORING } from '../config/game';

export const tapPoints = (taps) => Math.max(0, Math.floor(taps || 0)) * SCORING.tapPerTap;

// "+200 על כל שנייה של מהירות": every full second left on the clock.
export const triviaSpeedBonus = (answeredAt, deadline) =>
  SCORING.triviaPerSecond * Math.max(0, Math.floor((deadline - answeredAt) / 1000));

export const triviaPoints = (correct, answeredAt, deadline) =>
  correct ? SCORING.triviaCorrect + triviaSpeedBonus(answeredAt, deadline) : 0;

// Everyone tied for the most taps gets the "fastest tapper" bonus.
export const topTappers = (counts) => {
  const values = Object.values(counts || {});
  const max = values.length ? Math.max(...values) : 0;
  if (max <= 0) return [];
  return Object.keys(counts)
    .filter((pid) => counts[pid] === max)
    .sort();
};

// How many hearts fill Rotem's bank. Calibrated so an average family ends
// the five stages close to the target (a typical kid taps ~4.5 times/second,
// answers ~60% correctly with ~8 seconds left, most charades/words succeed).
// The hunt adds every hidden heart (huntPoints = all of them get found).
// classMode: the "players" are teams - a clap turn scores ~110 claps, a correct
// card has no speed bonus, and a team's charades success is worth less.
export const computeBankTarget = ({
  players,
  questions,
  charadesRounds,
  words,
  tapSeconds,
  blessings = true,
  huntPoints = 0,
  classMode = false,
}) => {
  const tap = classMode ? (tapSeconds ? 110 * SCORING.tapPerTap : 0) : 4.5 * tapSeconds * SCORING.tapPerTap;
  const answer = classMode ? SCORING.triviaCorrect : SCORING.triviaCorrect + 8 * SCORING.triviaPerSecond;
  const perPlayer = tap + questions * 0.6 * answer + (blessings ? 1.5 * SCORING.blessing : 0);
  const charades = classMode ? SCORING.charadesTeam : SCORING.charadesGroup;
  const group = charadesRounds * 0.8 * charades + words * 0.9 * SCORING.wordFirst + huntPoints;
  const raw = Math.max(1, players) * perPlayer + group;
  return Math.max(10000, Math.round(raw / 1000) * 1000);
};

// Share of the bank that's full (0..1). Linear up to 80%, then it keeps
// creeping towards 99% but never reaches 100% - that moment belongs to the
// finale ("100% אהבה!"), whatever the final score.
const KNEE = 0.8;
const CAP = 0.99;

export const meterFraction = (bank, target, { full = false } = {}) => {
  if (full) return 1;
  if (!target || target <= 0) return 0;
  const x = Math.max(0, bank / target);
  if (x <= KNEE) return x;
  const room = CAP - KNEE;
  return KNEE + room * (1 - Math.exp(-(x - KNEE) / room));
};

export const meterPercent = (bank, target, opts) =>
  Math.floor(meterFraction(bank, target, opts) * 100 + 1e-9);
