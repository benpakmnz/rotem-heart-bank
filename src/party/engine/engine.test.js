import { createGame, reduce, toPublic, privateMessages, nextDueAt, playableQuestions, nextPhase, playerBadges } from './engine';
import { createDefaultSettings } from '../config/content';
import { SCORING, CHARADES_PICK_MS, COUNTDOWN_MS, TAP_TALLY_MS, FINALE_FILL_MS, TRIVIA_GRACE_MS } from '../config/game';
import { createRng } from '../lib/random';

const PLAYERS = {
  a: { name: 'אנה', avatar: 'cat', joinedAt: 1, online: true },
  b: { name: 'בן', avatar: 'dog', joinedAt: 2, online: true },
  c: { name: 'גלי', avatar: 'fox', joinedAt: 3, online: true },
};

const makeGame = (settings = createDefaultSettings()) => {
  const g = {
    now: 1000000,
    rng: createRng(7),
    state: null,
  };
  g.state = createGame({ roomCode: '1234', settings, now: g.now });
  g.dispatch = (action) => {
    g.state = reduce(g.state, action, { now: g.now, rng: g.rng });
    return g.state;
  };
  g.advance = (ms) => {
    g.now += ms;
    return g.dispatch({ type: 'tick' });
  };
  g.inputs = (inputs) => g.dispatch({ type: 'inputs', roundId: g.state.roundId, inputs });
  g.dispatch({ type: 'players', players: PLAYERS });
  return g;
};

const startGame = () => {
  const g = makeGame();
  g.dispatch({ type: 'next' });
  return g;
};

const goToPhase = (g, phase) => g.dispatch({ type: 'goto', phase });

describe('lobby', () => {
  test('cannot start without players', () => {
    const g = makeGame();
    g.dispatch({ type: 'players', players: {} });
    const before = g.state;
    expect(g.dispatch({ type: 'next' })).toBe(before);
    expect(g.state.phase).toBe('lobby');
  });

  test('starting computes a bank target and opens stage 1', () => {
    const g = startGame();
    expect(g.state.phase).toBe('tap');
    expect(g.state.step).toBe('intro');
    expect(g.state.target).toBeGreaterThan(10000);
    expect(g.state.scores).toEqual({ a: 0, b: 0, c: 0 });
  });

  test('a manual bank target wins', () => {
    const settings = createDefaultSettings();
    settings.bankTarget = 42000;
    const g = makeGame(settings);
    g.dispatch({ type: 'next' });
    expect(g.state.target).toBe(42000);
  });
});

describe('stage 1 - speed tap', () => {
  test('10 hearts per tap, +500 to every top tapper, capped taps', () => {
    const g = startGame();
    g.dispatch({ type: 'next' });
    expect(g.state.step).toBe('countdown');
    const roundId = g.state.roundId;
    g.advance(COUNTDOWN_MS);
    expect(g.state.step).toBe('active');
    expect(g.state.endsAt).toBe(g.now + 60000);
    g.inputs({ a: { count: 300 }, b: { count: 250 }, c: { count: 300 } });
    g.advance(60000);
    expect(g.state.step).toBe('tally');
    g.inputs({ a: { count: 310 }, b: { count: 250 }, c: { count: 99999 } });
    g.advance(TAP_TALLY_MS);
    expect(g.state.step).toBe('results');
    expect(g.state.roundId).toBe(roundId);
    const maxTaps = (60 + 1) * 20;
    expect(g.state.tap.results.counts).toEqual({ a: 310, b: 250, c: maxTaps });
    expect(g.state.tap.results.bonusWinners).toEqual(['c']);
    expect(g.state.scores).toEqual({ a: 3100, b: 2500, c: maxTaps * 10 + SCORING.tapTopBonus });
    expect(g.state.bank).toBe(3100 + 2500 + maxTaps * 10 + SCORING.tapTopBonus);
  });

  test('ties share the bonus and skip ends early', () => {
    const g = startGame();
    g.dispatch({ type: 'next' });
    g.advance(COUNTDOWN_MS);
    g.inputs({ a: { count: 40 }, b: { count: 40 } });
    g.dispatch({ type: 'skip' });
    expect(g.state.step).toBe('tally');
    g.advance(TAP_TALLY_MS);
    expect(g.state.tap.results.bonusWinners).toEqual(['a', 'b']);
    expect(g.state.scores.a).toBe(400 + 500);
    expect(g.state.scores.c).toBe(0);
  });

  test('ticks before a timer is due return the same state object', () => {
    const g = startGame();
    g.dispatch({ type: 'next' });
    const before = g.state;
    expect(g.advance(100)).toBe(before);
  });
});

describe('stage 2 - trivia', () => {
  const openQuestion = () => {
    const g = startGame();
    goToPhase(g, 'trivia');
    g.dispatch({ type: 'next' });
    return g;
  };

  test('1000 for a correct answer + 200 per full second left', () => {
    const g = openQuestion();
    const cur = g.state.trivia.current;
    expect(g.state.step).toBe('question');
    expect(cur.options).toHaveLength(4);
    expect(cur.deadline - cur.openAt).toBe(15000);
    g.now = cur.openAt;
    g.dispatch({ type: 'tick' });
    expect(g.state.step).toBe('question');
    g.now = cur.openAt + 2500;
    g.inputs({
      a: { choice: cur.correct, at: cur.openAt + 2500 }, // 12.5s left -> 12 * 200
      b: { choice: (cur.correct + 1) % 4, at: cur.openAt + 1000 },
    });
    expect(g.state.step).toBe('question'); // c hasn't answered yet
    g.now = cur.deadline - 400;
    g.inputs({
      a: { choice: cur.correct, at: cur.openAt + 2500 },
      b: { choice: (cur.correct + 1) % 4, at: cur.openAt + 1000 },
      c: { choice: cur.correct, at: cur.deadline - 400 }, // 0 full seconds left
    });
    expect(g.state.step).toBe('reveal'); // everyone answered -> reveal right away
    const { reveal } = g.state.trivia;
    expect(reveal.results.a).toEqual({ choice: cur.correct, correct: true, points: 1000 + 12 * 200 });
    expect(reveal.results.b.points).toBe(0);
    expect(reveal.results.c.points).toBe(1000);
    expect(reveal.counts[cur.correct]).toBe(2);
    expect(g.state.scores).toEqual({ a: 3400, b: 0, c: 1000 });
    expect(g.state.trivia.correctCounts).toEqual({ a: 1, c: 1 });
  });

  test('offline players do not block the reveal; the timer reveals anyway', () => {
    const g = openQuestion();
    const cur = g.state.trivia.current;
    g.dispatch({ type: 'players', players: { ...PLAYERS, c: { ...PLAYERS.c, online: false } } });
    g.now = cur.openAt + 1000;
    g.inputs({ a: { choice: 0, at: g.now } });
    expect(g.state.step).toBe('question');
    g.inputs({ a: { choice: 0, at: g.now }, b: { choice: 1, at: g.now } });
    expect(g.state.step).toBe('reveal');

    g.dispatch({ type: 'next' });
    const next = g.state.trivia.current;
    expect(next.index).toBe(1);
    g.now = next.deadline + TRIVIA_GRACE_MS;
    g.dispatch({ type: 'tick' });
    expect(g.state.step).toBe('reveal');
    expect(g.state.trivia.reveal.results).toEqual({});
  });

  test('answers stamped before the answers open get the max bonus, not more', () => {
    const g = openQuestion();
    const cur = g.state.trivia.current;
    g.now = cur.openAt + 10;
    g.inputs({ a: { choice: cur.correct, at: cur.openAt - 5000 } });
    g.dispatch({ type: 'skip' });
    expect(g.state.trivia.reveal.results.a.points).toBe(1000 + 15 * 200);
  });

  test('walks through every playable question then shows results', () => {
    const g = openQuestion();
    const total = playableQuestions(g.state.settings).length;
    for (let i = 0; i < total; i += 1) {
      expect(g.state.trivia.current.index).toBe(i);
      g.dispatch({ type: 'skip' });
      g.dispatch({ type: 'next' });
    }
    expect(g.state.step).toBe('results');
    g.dispatch({ type: 'next' });
    expect(g.state.phase).toBe('hunt');
  });

  test('broken questions from the editor are skipped or remapped', () => {
    const questions = playableQuestions({
      trivia: [
        { q: 'ok', options: ['a', '', 'c', 'd'], correct: 2 },
        { q: '', options: ['a', 'b'], correct: 0 },
        { q: 'no correct', options: ['a', 'b', '', ''], correct: 3 },
        { q: 'one option', options: ['a', '', '', ''], correct: 0 },
      ],
    });
    expect(questions).toEqual([{ q: 'ok', options: ['a', 'c', 'd'], correct: 1 }]);
  });

  test('questions turned off stay in the pool but are not asked', () => {
    const settings = createDefaultSettings();
    settings.trivia = settings.trivia.map((item, i) => (i % 2 ? { ...item, off: true } : item));
    const g = makeGame(settings);
    g.dispatch({ type: 'next' });
    goToPhase(g, 'trivia');
    expect(g.state.trivia.total).toBe(Math.ceil(settings.trivia.length / 2));
    g.dispatch({ type: 'next' });
    expect(g.state.trivia.current.q).toBe(settings.trivia[0].q);
    g.dispatch({ type: 'skip' });
    g.dispatch({ type: 'next' });
    expect(g.state.trivia.current.q).toBe(settings.trivia[2].q);
  });
});

describe('stage 5 - charades', () => {
  const openRound = () => {
    const g = startGame();
    goToPhase(g, 'charades');
    g.dispatch({ type: 'next' });
    return g;
  };

  test('performer gets a secret concept, "הצלחתי!" charges the bank by 5000', () => {
    const g = openRound();
    expect(g.state.step).toBe('pick');
    const { performerId, concept } = g.state.charades.current;
    expect(Object.keys(PLAYERS)).toContain(performerId);
    expect(privateMessages(g.state)).toEqual({
      [performerId]: { roundId: g.state.roundId, concept, swapsLeft: 2 },
    });
    expect(toPublic(g.state).data.concept).toBeUndefined();

    g.advance(CHARADES_PICK_MS);
    expect(g.state.step).toBe('ready');
    g.inputs({ [performerId]: { swaps: 1 } });
    const swapped = g.state.charades.current.concept;
    expect(swapped).not.toBe(concept);
    expect(privateMessages(g.state)[performerId].swapsLeft).toBe(1);

    g.inputs({ [performerId]: { swaps: 1, started: true } });
    expect(g.state.step).toBe('perform');
    expect(g.state.charades.current.concept).toBe(swapped);

    const bank = g.state.bank;
    g.inputs({ [performerId]: { swaps: 1, started: true, done: true } });
    expect(g.state.step).toBe('outcome');
    expect(g.state.bank).toBe(bank + SCORING.charadesGroup);
    expect(Object.values(g.state.scores).every((v) => v === 0)).toBe(true);
    expect(toPublic(g.state).data).toMatchObject({ success: true, concept: swapped, performerId });
  });

  test('only other players (or the host) can be next; time out = no bonus', () => {
    const g = openRound();
    const first = g.state.charades.current.performerId;
    g.dispatch({ type: 'skip' });
    g.dispatch({ type: 'next' });
    expect(g.state.charades.current.performerId).not.toBe(first);
    g.advance(CHARADES_PICK_MS);
    g.dispatch({ type: 'next' }); // host starts the clock
    expect(g.state.step).toBe('perform');
    const bank = g.state.bank;
    g.advance(60000);
    expect(g.state.step).toBe('outcome');
    expect(g.state.charades.current.success).toBe(false);
    expect(g.state.bank).toBe(bank);
  });

  test('re-pick keeps the round and chooses someone else', () => {
    const g = openRound();
    const first = g.state.charades.current.performerId;
    g.dispatch({ type: 'repick' });
    expect(g.state.round).toBe(0);
    expect(g.state.charades.current.performerId).not.toBe(first);
  });

  test('after the configured rounds, results then the basket', () => {
    const g = openRound();
    for (let r = 0; r < 3; r += 1) {
      expect(g.state.step).toBe('pick');
      g.dispatch({ type: 'charadesResult', success: true }); // ignored while the roulette spins
      expect(g.state.step).toBe('pick');
      g.advance(CHARADES_PICK_MS);
      g.dispatch({ type: 'charadesResult', success: true });
      g.dispatch({ type: 'next' });
    }
    expect(g.state.step).toBe('results');
    const performers = g.state.charades.results.map((r) => r.performerId);
    expect(new Set(performers).size).toBe(3); // everyone performed once
    g.dispatch({ type: 'next' });
    expect(g.state.phase).toBe('basket');
  });
});

describe('stage 4 - letters', () => {
  const openWord = () => {
    const g = startGame();
    goToPhase(g, 'word');
    g.dispatch({ type: 'next' });
    g.advance(COUNTDOWN_MS);
    return g;
  };

  test('scrambled letters, progressive hints, earliest correct solve wins 2500', () => {
    const g = openWord();
    const cur = g.state.word.current;
    expect(g.state.step).toBe('play');
    expect(cur.answer).toBe('אהבה');
    expect(cur.shape).toEqual([4]);
    expect(cur.letters.slice().sort()).toEqual(['א', 'ב', 'ה', 'ה']);
    expect(cur.letters.join('')).not.toBe('אהבה');
    expect(cur.revealOrder[0]).toBe(0);

    g.advance(15000);
    expect(g.state.word.current.revealed).toBe(1);
    g.advance(15000);
    expect(g.state.word.current.revealed).toBe(2);
    g.advance(15000);
    expect(g.state.word.current.revealed).toBe(2); // at most half of the letters

    const t = g.now;
    g.inputs({ b: { solvedAt: t, attempt: 'אהבה' }, c: { solvedAt: t - 5000, attempt: 'הבהא' } });
    expect(g.state.step).toBe('play');
    g.now += 300;
    g.inputs({
      b: { solvedAt: t, attempt: 'אהבה' },
      c: { solvedAt: t - 5000, attempt: 'הבהא' }, // wrong - ignored
      a: { solvedAt: t - 200, attempt: 'אהבה' }, // arrived later but solved first
    });
    g.advance(700);
    expect(g.state.step).toBe('outcome');
    expect(g.state.word.current.winnerId).toBe('a');
    expect(g.state.scores.a).toBe(SCORING.wordFirst);
    expect(g.state.scores.b).toBe(0);
  });

  test('multi-word answers and timeouts', () => {
    const g = openWord();
    g.dispatch({ type: 'skip' });
    expect(g.state.word.current.winnerId).toBe(null);
    g.dispatch({ type: 'next' });
    g.advance(COUNTDOWN_MS);
    expect(g.state.word.current.answer).toBe('משפחה');
    g.advance(90000 + 700);
    expect(g.state.step).toBe('outcome');
    expect(g.state.word.current.winnerId).toBe(null);
    g.dispatch({ type: 'next' });
    g.advance(COUNTDOWN_MS);
    const cur = g.state.word.current;
    expect(cur.answer).toBe('מזל טוב');
    expect(cur.shape).toEqual([3, 3]);
    expect(cur.letters).toHaveLength(6);
    g.inputs({ c: { solvedAt: g.now, attempt: 'מזל  טוב' } });
    g.advance(700);
    expect(g.state.word.current.winnerId).toBe('c');
    g.dispatch({ type: 'next' });
    expect(g.state.step).toBe('results');
  });

  test('a solve that lands right after time is up still counts', () => {
    const g = openWord();
    g.now = g.state.endsAt + 300;
    g.inputs({ b: { solvedAt: g.state.endsAt - 100, attempt: 'אהבה' } });
    g.advance(400);
    expect(g.state.step).toBe('outcome');
    expect(g.state.word.current.winnerId).toBe('b');
  });
});

describe('stage 5 - blessings and the finale', () => {
  test('blessings charge the bank, capped per player, finale ranks players', () => {
    const g = startGame();
    goToPhase(g, 'blessings');
    g.dispatch({ type: 'next' });
    expect(g.state.step).toBe('write');
    expect(g.state.roundId).toBe('blessings');
    const t = g.now;
    g.inputs({
      a: {
        k1: { text: 'אהבה', at: t + 1 },
        k2: { text: '  המון   שמחה ', at: t + 2 },
        k3: { text: 'בריאות', at: t + 3 },
        k4: { text: 'עוד אחת', at: t + 4 },
      },
      b: { k1: { text: 'אהבה', at: t + 5 } },
    });
    const list = g.state.blessings.list;
    expect(list.map((b) => b.text)).toEqual(['אהבה', 'המון שמחה', 'בריאות', 'אהבה']);
    expect(g.state.bank).toBe(4 * SCORING.blessing);
    expect(g.state.scores).toEqual({ a: 0, b: 0, c: 0 });

    // the same snapshot again changes nothing
    g.inputs(g.state.inputs);
    expect(g.state.blessings.list).toHaveLength(4);

    g.dispatch({ type: 'hideBlessing', id: list[0].id });
    expect(g.state.blessings.hidden[list[0].id]).toBe(true);

    g.state = { ...g.state, scores: { a: 100, b: 900, c: 900 } };
    g.dispatch({ type: 'next' });
    expect(g.state.phase).toBe('finale');
    expect(g.state.step).toBe('fill');
    expect(g.state.finale.ranking).toEqual(['b', 'c', 'a']);
    expect(g.state.finale.winners).toEqual(['b', 'c']);
    expect(toPublic(g.state).meter).toBe(1);
    g.advance(FINALE_FILL_MS);
    expect(g.state.step).toBe('celebrate');
    expect(nextDueAt(g.state)).toBe(null);
  });
});

describe('public state', () => {
  test('never leaks the trivia answer before the reveal', () => {
    const g = startGame();
    goToPhase(g, 'trivia');
    g.dispatch({ type: 'next' });
    const pub = toPublic(g.state);
    expect(pub.data.correct).toBeUndefined();
    expect(pub.data.reveal).toBeUndefined();
    expect(pub.data.options).toHaveLength(4);
    g.dispatch({ type: 'skip' });
    expect(toPublic(g.state).data.reveal.correct).toBe(g.state.trivia.current.correct);
  });

  test('meter stays below 100% until the finale', () => {
    const g = startGame();
    g.state = { ...g.state, bank: g.state.target * 5 };
    const pub = toPublic(g.state);
    expect(pub.meter).toBeLessThan(0.99 + 1e-9);
    expect(pub.meter).toBeGreaterThan(0.98);
  });

  test('state is JSON-serializable (Firebase/localStorage)', () => {
    const g = startGame();
    g.dispatch({ type: 'next' });
    const pub = toPublic(g.state);
    expect(JSON.parse(JSON.stringify(pub))).toEqual(pub);
    expect(JSON.stringify(g.state)).not.toMatch(/undefined|NaN|Infinity/);
  });
});

describe('stage order', () => {
  test('default order includes the real-life stages', () => {
    const g = startGame();
    const seen = [g.state.phase];
    for (let i = 0; i < 6; i += 1) seen.push(nextPhase(g.state, seen[seen.length - 1]));
    expect(seen).toEqual(['tap', 'trivia', 'hunt', 'word', 'charades', 'basket', 'blessings']);
    expect(nextPhase(g.state, 'blessings')).toBe('finale');
  });

  test('stages turned off in the settings are skipped', () => {
    const settings = createDefaultSettings();
    settings.stages = ['trivia', 'basket'];
    const g = makeGame(settings);
    g.dispatch({ type: 'next' });
    expect(g.state.phase).toBe('trivia');
    expect(nextPhase(g.state, 'trivia')).toBe('basket');
    expect(nextPhase(g.state, 'basket')).toBe('finale');
    // reached through the menu even though it's off: continue with the next enabled one
    expect(nextPhase(g.state, 'hunt')).toBe('basket');
    expect(toPublic(g.state).stages).toEqual(['trivia', 'basket']);
  });
});

describe('stage "hunt" - hidden hearts', () => {
  const startHunt = () => {
    const g = startGame();
    goToPhase(g, 'hunt');
    g.dispatch({ type: 'next' });
    return g;
  };

  test('builds 1 gold, 3 silver and 2 red hearts by default', () => {
    const g = startHunt();
    expect(g.state.step).toBe('search');
    expect(g.state.hunt.hearts.map((h) => h.kind)).toEqual(['gold', 'silver', 'silver', 'silver', 'red', 'red']);
    expect(g.state.endsAt).toBe(g.now + 5 * 60000);
  });

  test('assigning a heart gives its points to the finder and the family bank', () => {
    const g = startHunt();
    const bank = g.state.bank;
    g.dispatch({ type: 'huntAssign', heartId: 'gold-1', pid: 'b' });
    expect(g.state.scores.b).toBe(3000);
    expect(g.state.bank).toBe(bank + 3000);
    expect(playerBadges(g.state)).toEqual({ b: ['gold'] });
    const pub = toPublic(g.state);
    expect(pub.data.hearts.find((h) => h.id === 'gold-1').pid).toBe('b');
    expect(pub.badges).toEqual({ b: ['gold'] });
  });

  test('fixing a mistake moves the points (and the badge) to the right player', () => {
    const g = startHunt();
    const bank = g.state.bank;
    g.dispatch({ type: 'huntAssign', heartId: 'silver-2', pid: 'a' });
    g.dispatch({ type: 'huntAssign', heartId: 'silver-2', pid: 'c' });
    expect(g.state.scores.a).toBe(0);
    expect(g.state.scores.c).toBe(1500);
    expect(g.state.bank).toBe(bank + 1500);
    g.dispatch({ type: 'huntAssign', heartId: 'silver-2', pid: null });
    expect(g.state.scores.c).toBe(0);
    expect(g.state.bank).toBe(bank);
    expect(playerBadges(g.state)).toEqual({});
  });

  test('the same assignment twice changes nothing; unknown hearts are ignored', () => {
    const g = startHunt();
    g.dispatch({ type: 'huntAssign', heartId: 'red-1', pid: 'a' });
    const before = g.state;
    expect(g.dispatch({ type: 'huntAssign', heartId: 'red-1', pid: 'a' })).toBe(before);
    expect(g.dispatch({ type: 'huntAssign', heartId: 'purple-9', pid: 'a' })).toBe(before);
  });

  test('custom hearts and points from the settings; next ends the search', () => {
    const settings = createDefaultSettings();
    settings.hunt = { minutes: 0, gold: { count: 2, points: 5000 }, silver: { count: 0, points: 0 }, red: { count: 1, points: 100 } };
    const g = makeGame(settings);
    g.dispatch({ type: 'next' });
    goToPhase(g, 'hunt');
    g.dispatch({ type: 'next' });
    expect(g.state.endsAt).toBe(0);
    expect(g.state.hunt.hearts.map((h) => `${h.id}:${h.points}`)).toEqual(['gold-1:5000', 'gold-2:5000', 'red-1:100']);
    g.dispatch({ type: 'next' });
    expect(g.state.step).toBe('results');
    g.dispatch({ type: 'huntAssign', heartId: 'red-1', pid: 'c' }); // late fixes still count
    expect(g.state.scores.c).toBe(100);
    g.dispatch({ type: 'next' });
    expect(g.state.phase).toBe('word');
  });
});

describe('stage "basket" - throwing hearts', () => {
  const startBasket = () => {
    const g = startGame();
    goToPhase(g, 'basket');
    g.dispatch({ type: 'next' });
    return g;
  };

  test('players throw in turn; every hit scores', () => {
    const g = startBasket();
    expect(g.state.step).toBe('throw');
    expect(toPublic(g.state).data.thrower).toBe('a');
    g.dispatch({ type: 'basketThrow', hit: true });
    g.dispatch({ type: 'basketThrow', hit: false });
    g.dispatch({ type: 'basketThrow', hit: true });
    expect(g.state.scores.a).toBe(1400);
    const full = g.state;
    expect(g.dispatch({ type: 'basketThrow', hit: true })).toBe(full); // only 3 throws
    g.dispatch({ type: 'next' });
    expect(toPublic(g.state).data.thrower).toBe('b');
  });

  test('3 out of 3 earns the bonus and a badge; undo takes them back', () => {
    const g = startBasket();
    [1, 2, 3].forEach(() => g.dispatch({ type: 'basketThrow', hit: true }));
    expect(g.state.scores.a).toBe(3 * 700 + 1000);
    expect(playerBadges(g.state)).toEqual({ a: ['basket'] });
    g.dispatch({ type: 'basketUndo' });
    expect(g.state.scores.a).toBe(2 * 700);
    expect(playerBadges(g.state)).toEqual({});
    expect(g.state.basket.throws.a).toEqual([true, true]);
  });

  test('skip moves on; after the last player come the results', () => {
    const g = startBasket();
    g.dispatch({ type: 'skip' });
    g.dispatch({ type: 'skip' });
    expect(toPublic(g.state).data.thrower).toBe('c');
    g.dispatch({ type: 'next' });
    expect(g.state.step).toBe('results');
    g.dispatch({ type: 'next' });
    expect(g.state.phase).toBe('blessings');
  });

  test('a player who joins during the stage gets a turn at the end', () => {
    const g = startBasket();
    g.dispatch({ type: 'players', players: { ...PLAYERS, d: { name: 'דן', avatar: 'owl', joinedAt: 9, online: true } } });
    g.dispatch({ type: 'next' });
    g.dispatch({ type: 'next' });
    g.dispatch({ type: 'next' });
    expect(toPublic(g.state).data.thrower).toBe('d');
  });
});
