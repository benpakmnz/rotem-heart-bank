import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { onlinePlayerIds, playerIds, tapCounts } from '../../engine/engine';
import { fmt } from '../../lib/format';
import { HEART_PATH, useSvgId } from '../../shared/Heart';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import HeartRain, { SoftHeartRain } from '../../shared/HeartRain';
import { isLiteFx } from '../../lib/effects';
import TimerRing from '../../shared/TimerRing';
import useAnimatedNumber from '../../shared/useAnimatedNumber';
import useClapMeter, { CLAPS_PER_KEY, CLAPS_PER_SECOND } from '../useClapMeter';
import { isTypingTarget } from '../classTools';
import { BigCountdown, PlayerChip, StageIntro, StageResults } from './common';

// The heart that "grows and fills with golden light" as the family taps.
export const GoldenHeart = ({ fill, beating }) => {
  const clip = useSvgId('hb-gh-clip');
  const pink = useSvgId('hb-gh-pink');
  const gold = useSvgId('hb-gh-gold');
  const level = Math.max(0, Math.min(1, fill));
  return (
    <div
      className={`hb-golden-heart ${beating ? 'is-beating' : ''} ${level >= 1 ? 'is-full' : ''}`}
      style={{ '--hb-fill': level, transform: `scale(${0.72 + level * 0.43})` }}
    >
      <svg viewBox="-6 -6 112 104" aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <path d={HEART_PATH} />
          </clipPath>
          <linearGradient id={pink} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9ECF" />
            <stop offset="100%" stopColor="#E0126A" />
          </linearGradient>
          <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF1B8" />
            <stop offset="45%" stopColor="#FFC53D" />
            <stop offset="100%" stopColor="#E39B00" />
          </linearGradient>
        </defs>
        <path d={HEART_PATH} fill={`url(#${pink})`} />
        <g clipPath={`url(#${clip})`}>
          <g className="hb-gh-liquid" style={{ transform: `translateY(${92 - level * 94}px)` }}>
            <path
              className="hb-gh-wave"
              d="M-100 4 Q -87.5 -2 -75 4 T -50 4 T -25 4 T 0 4 T 25 4 T 50 4 T 75 4 T 100 4 T 125 4 T 150 4 T 175 4 T 200 4 V 200 H -100 Z"
              fill={`url(#${gold})`}
            />
          </g>
        </g>
        <path d={HEART_PATH} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.2" />
        <ellipse cx="28" cy="24" rx="11" ry="6" fill="rgba(255,255,255,0.4)" transform="rotate(-35 28 24)" />
      </svg>
    </div>
  );
};

const TapArena = ({ state, now }) => {
  const counts = tapCounts(state);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const shownTotal = useAnimatedNumber(total, 400);
  const seconds = Number(state.settings.timings.tapSeconds) || 60;
  const expected = Math.max(40, onlinePlayerIds(state).length * 4.2 * seconds);
  const fill = total / expected;

  // taps per second, smoothed, for the heart rain and the heartbeat
  const rateRef = useRef(0);
  const sample = useRef({ total, at: now });
  useEffect(() => {
    const dt = (now - sample.current.at) / 1000;
    if (dt < 0.4) return;
    const rate = Math.max(0, (total - sample.current.total) / dt);
    rateRef.current = rateRef.current * 0.5 + rate * 0.5;
    sample.current = { total, at: now };
  }, [now, total]);

  const top = Object.keys(counts)
    .filter((pid) => state.players[pid])
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 5);
  const max = top.length ? counts[top[0]] : 0;
  const active = state.step === 'active';

  return (
    <div className="hb-tap" style={{ '--hb-fill': Math.min(1, fill) }}>
      {isLiteFx() ? <SoftHeartRain active={active} /> : <HeartRain rateRef={rateRef} active={active} />}
      <div className="hb-tap-side">
        {active ? (
          <TimerRing endsAt={state.endsAt} total={seconds * 1000} now={now} className="hb-tap-timer" />
        ) : (
          <div className="hb-tap-over">⏱️ נגמר הזמן!</div>
        )}
        <div className="hb-tap-top hb-glass">
          <h3>הכי מהירים ⚡</h3>
          {top.map((pid) => (
            <div key={pid} className="hb-tap-row">
              <Avatar player={state.players[pid]} size="xs" />
              <span className="hb-tap-name">{state.players[pid].name}</span>
              <span className="hb-tap-bar">
                <span style={{ width: `${max ? (counts[pid] / max) * 100 : 0}%` }} />
              </span>
              <span className="hb-tap-count">{fmt(counts[pid])}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hb-tap-center">
        <GoldenHeart fill={fill} beating={active && total > 0} />
        <div className="hb-tap-total">
          <strong>{fmt(shownTotal)}</strong> לחיצות
          <span className="hb-tap-hearts"> = {fmt(Math.round(shownTotal) * SCORING.tapPerTap)} לבבות</span>
        </div>
        {fill >= 1 && <div className="hb-tap-gold">✨ הלב זהוב! תמשיכו ללחוץ! ✨</div>}
        {state.step === 'tally' && <div className="hb-tap-counting">סופרים את הלבבות...</div>}
      </div>
    </div>
  );
};

const TapResults = ({ state }) => {
  const { counts = {}, bonusWinners = [], total = 0 } = state.tap.results || {};
  const unit = state.classMode ? 'מחיאות' : 'לחיצות';
  const ranking = Object.keys(counts)
    .filter((pid) => state.players[pid])
    .sort((a, b) => counts[b] - counts[a]);
  return (
    <div className="hb-tap-results">
      <div className="hb-big-stat">
        <strong>{fmt(total)}</strong>
        <span>{state.classMode ? 'מחיאות כפיים של כל הכיתה!' : 'לחיצות על הלב!'}</span>
      </div>
      {bonusWinners.length > 0 && (
        <motion.div className="hb-bonus-card" initial={{ scale: 0.5, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.4 }}>
          <div className="hb-bonus-title">{state.classMode ? '📣 הקבוצה הכי רועשת' : '⚡ הלוחצים הכי מהירים'}</div>
          <div className="hb-bonus-players">
            {bonusWinners
              .filter((pid) => state.players[pid])
              .map((pid) => (
                <div key={pid} className="hb-bonus-player">
                  <Avatar player={state.players[pid]} size="lg" showName />
                  <span>
                    {fmt(counts[pid])} {unit}
                  </span>
                </div>
              ))}
          </div>
          <div className="hb-bonus-amount">+{SCORING.tapTopBonus} בונוס!</div>
        </motion.div>
      )}
      {ranking.length > bonusWinners.length && (
        <div className="hb-chip-cloud">
          {ranking
            .filter((pid) => !bonusWinners.includes(pid))
            .map((pid) => (
              <PlayerChip key={pid} player={state.players[pid]}>
                <b>{fmt(counts[pid])}</b>
              </PlayerChip>
            ))}
        </div>
      )}
    </div>
  );
};

// ---------- class mode: the clap meter, one team at a time ----------

const FULL_CLAPS = 160; // the heart is all gold at this many claps
const LATE_ENTER_MS = 1500; // Enter right after a turn doesn't start the next one

// A row of lights like a sound system's level meter (green -> red).
const LevelBar = ({ level, segments = 14, vertical = false }) => (
  <div className={`hb-vu ${vertical ? 'is-vertical' : ''}`} aria-hidden="true">
    {Array.from({ length: segments }, (_, i) => (
      <span
        key={i}
        className={`hb-vu-seg ${level * segments > i + 0.01 ? 'is-lit' : ''}`}
        style={{ '--hb-vu-hue': Math.round(130 - (i / (segments - 1)) * 130) }}
      />
    ))}
  </div>
);

const MIC_TEXT = {
  asking: '🎤 אשרו בחלון של הדפדפן את השימוש במיקרופון',
  paused: '🎤 לחצו כאן כדי להפעיל את המיקרופון',
  on: '🎤 המיקרופון מקשיב - נסו למחוא כפיים!',
  blocked: '🔇 המיקרופון חסום. אפשר לאשר אותו בסמל שליד הכתובת, ואז "לנסות שוב" - או לשחק עם מקש הרווח.',
  none: '🔇 לא מצאנו מיקרופון במחשב - משחקים עם מקש הרווח.',
  idle: '',
};

// A click on a button here hands the keyboard back to the game (Enter = the main button).
const release = (e, run) => {
  e.currentTarget.blur();
  run();
};

// The microphone's state, its level right now and the mic / space bar switch.
const MicPanel = ({ meter, compact = false }) => {
  const { status, input, setInput, level, retry, resume } = meter;
  const canMic = status !== 'blocked' && status !== 'none';
  const text = input === 'keys' && canMic ? '⌨️ נציג/ה של הקבוצה מקיש/ה על מקש הרווח - כמה שיותר מהר!' : MIC_TEXT[status];
  return (
    <div className={`hb-mic hb-glass ${compact ? 'is-compact' : ''}`} data-testid="mic-panel" data-status={status} data-input={input}>
      {status === 'paused' && input === 'mic' ? (
        <button type="button" className="hb-btn hb-btn-primary hb-mic-text" onClick={(e) => release(e, resume)}>
          {text}
        </button>
      ) : (
        <span className="hb-mic-text">{text}</span>
      )}
      {input === 'mic' && status === 'on' && <LevelBar level={level} />}
      <div className="hb-mic-actions">
        <div className="hb-mic-switch" role="group" aria-label="איך סופרים את המחיאות">
          <button type="button" className={input === 'mic' ? 'is-on' : ''} disabled={!canMic} onClick={(e) => release(e, () => setInput('mic'))}>
            🎤 מיקרופון
          </button>
          <button type="button" className={input === 'keys' ? 'is-on' : ''} onClick={(e) => release(e, () => setInput('keys'))} data-testid="use-keys">
            ⌨️ מקש רווח
          </button>
        </div>
        {status === 'blocked' && (
          <button type="button" className="hb-link-btn" onClick={(e) => release(e, retry)}>
            🔄 לנסות שוב
          </button>
        )}
      </div>
    </div>
  );
};

// The teams in their order, with the claps of those who had their turn.
const TeamBoard = ({ state, current, live = 0 }) => {
  const order = ((state.tap.order || []).length ? state.tap.order : playerIds(state)).filter((pid) => state.players[pid]);
  const counts = { ...(state.tap.counts || {}) };
  if (current) counts[current] = Math.max(live, counts[current] || 0);
  const max = Math.max(1, ...order.map((pid) => counts[pid] || 0));
  const started = state.step !== 'intro';
  return (
    <div className="hb-tap-top hb-glass hb-ctap-board" data-testid="team-board">
      <h3>📣 מד הרעש</h3>
      {order.map((pid, i) => {
        const played = started && (i < state.tap.turn || (i === state.tap.turn && state.step === 'turnDone'));
        return (
          <div key={pid} className={`hb-tap-row ${pid === current ? 'is-current' : ''} ${played || pid === current ? '' : 'is-waiting'}`}>
            <Avatar player={state.players[pid]} size="xs" />
            <span className="hb-tap-name">{state.players[pid].name}</span>
            <span className="hb-tap-bar">
              <span style={{ width: `${((counts[pid] || 0) / max) * 100}%` }} />
            </span>
            <span className="hb-tap-count">{played || pid === current ? fmt(Math.floor(counts[pid] || 0)) : '⏳'}</span>
          </div>
        );
      })}
    </div>
  );
};

const teamOnTurn = (state) => (state.tap.order || [])[state.tap.turn];

// One team's turn: the microphone (or the space bar) fills the heart. The
// running count goes to the engine 4 times a second, and once more at the end.
const ClassTapArena = ({ state, now, conn, dispatch, meter, pressRef }) => {
  const pid = teamOnTurn(state);
  const team = state.players[pid];
  const seconds = Number(state.settings.timings.classTapSeconds) || 10;
  const [claps, setClaps] = useState(() => (state.tap.counts || {})[pid] || 0);
  const [keyLevel, setKeyLevel] = useState(0);
  const rateRef = useRef(0);
  const inputRef = useRef(meter.input);
  inputRef.current = meter.input;
  const levelRef = useRef(0);
  levelRef.current = meter.input === 'mic' ? meter.level : keyLevel;
  const start = useRef({ endsAt: state.endsAt, base: (state.tap.counts || {})[pid] || 0 });
  const { frameRef } = meter;

  useEffect(() => {
    const { endsAt, base } = start.current;
    const endLocal = performance.now() + Math.max(0, endsAt - conn.serverNow());
    const turn = { claps: base, sent: base, presses: [] };
    const counting = () => performance.now() <= endLocal;
    frameRef.current = (level, dt) => {
      if (inputRef.current === 'mic' && counting()) turn.claps += level * CLAPS_PER_SECOND * dt;
    };
    pressRef.current = () => {
      if (!counting()) return;
      turn.claps += CLAPS_PER_KEY;
      turn.presses.push(performance.now());
    };
    const send = () => {
      const n = Math.floor(turn.claps);
      if (n > turn.sent) {
        turn.sent = n;
        dispatch({ type: 'classTap', pid, count: n });
      }
    };
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      const t = performance.now();
      turn.presses = turn.presses.filter((at) => t - at < 1000);
      setKeyLevel(Math.min(1, turn.presses.length / 8));
      setClaps(turn.claps);
      rateRef.current = levelRef.current * 40;
      if (ticks % 3 === 0) send();
    }, 80);
    return () => {
      clearInterval(id);
      frameRef.current = null;
      pressRef.current = null;
      send();
    };
  }, [conn, dispatch, frameRef, pid, pressRef]);

  const level = levelRef.current;
  const fill = Math.min(1, claps / FULL_CLAPS);
  return (
    <div className="hb-tap hb-ctap" style={{ '--hb-fill': fill }} data-testid="clap-arena">
      {isLiteFx() ? <SoftHeartRain active /> : <HeartRain rateRef={rateRef} active />}
      <div className="hb-tap-side">
        <TimerRing endsAt={state.endsAt} total={seconds * 1000} now={now} className="hb-tap-timer" />
        <TeamBoard state={state} current={pid} live={claps} />
      </div>
      <div className="hb-tap-center">
        <div className="hb-ctap-team">
          <Avatar player={team} size="md" />
          <GameTitle text={`התור של ${team.name}!`} className="hb-ctap-title" />
        </div>
        <div className="hb-ctap-heart">
          <LevelBar level={level} vertical segments={16} />
          <div style={{ transform: `scale(${1 + level * 0.12})` }} className="hb-ctap-pulse">
            <GoldenHeart fill={fill} beating={level > 0.15} />
          </div>
        </div>
        <div className="hb-tap-total" data-testid="clap-count">
          <strong>{fmt(Math.floor(claps))}</strong> מחיאות
          <span className="hb-tap-hearts"> = {fmt(Math.floor(claps) * SCORING.tapPerTap)} לבבות</span>
        </div>
        <div className="hb-ctap-shout">{meter.input === 'keys' ? '⌨️ מהר מהר על מקש הרווח!' : '👏 חזק יותר! עוד! עוד!'}</div>
      </div>
    </div>
  );
};

const ClassTapCountdown = ({ state, now, meter }) => {
  const team = state.players[teamOnTurn(state)];
  return (
    <div className="hb-ctap-countdown">
      <div className="hb-ctap-team">
        <Avatar player={team} size="lg" />
        <GameTitle text={`התור של ${team ? team.name : ''}!`} className="hb-ctap-title" />
      </div>
      <BigCountdown
        endsAt={state.endsAt}
        now={now}
        caption={meter.input === 'keys' ? '⌨️ אצבע על מקש הרווח... מוכנים?' : '👏 ידיים למעלה... מוכנים למחוא כפיים?'}
      />
    </div>
  );
};

const ClassTapDone = ({ state, meter }) => {
  const pid = teamOnTurn(state);
  const team = state.players[pid];
  const count = (state.tap.counts || {})[pid] || 0;
  const next = state.players[(state.tap.order || [])[state.tap.turn + 1]];
  return (
    <div className="hb-tap hb-ctap is-done">
      <div className="hb-tap-side">
        <TeamBoard state={state} />
      </div>
      <div className="hb-tap-center">
        <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 11 }}>
          <Avatar player={team} size="xl" />
        </motion.div>
        <GameTitle text={count ? `כל הכבוד, ${team ? team.name : ''}!` : 'הפעם היה שקט מדי...'} tone="gold" className="hb-ctap-title" />
        <div className="hb-tap-total">
          <strong>{fmt(count)}</strong> מחיאות
          <span className="hb-tap-hearts"> = {fmt(count * SCORING.tapPerTap)} לבבות</span>
        </div>
        <div className="hb-ctap-next">{next ? `👉 התור הבא: ${next.name}` : '🏁 כל הקבוצות מחאו כפיים - לסיכום!'}</div>
        <MicPanel meter={meter} compact />
      </div>
    </div>
  );
};

// The whole clap stage: the microphone stays open from the intro to the last
// turn. The space bar belongs to the clap meter here (the main button is on
// Enter), and an Enter right after a turn doesn't start the next one.
const ClassTap = ({ state, now, conn, dispatch }) => {
  const meter = useClapMeter(state.step !== 'results', state.step);
  const pressRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const inputRef = useRef(meter.input);
  inputRef.current = meter.input;

  useEffect(() => {
    const onKey = (e) => {
      if (isTypingTarget(e.target)) return;
      const st = stateRef.current;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'keydown' && !e.repeat && st.step === 'active' && inputRef.current === 'keys' && pressRef.current) pressRef.current();
      } else if (e.key === 'Enter' && st.step === 'turnDone' && conn.serverNow() - st.stepStartedAt < LATE_ENTER_MS) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, [conn]);

  // a button clicked a moment ago keeps the keyboard; the turn shouldn't
  useEffect(() => {
    if (state.step === 'countdown' && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }, [state.step]);

  switch (state.step) {
    case 'intro':
      return (
        <StageIntro state={state}>
          <MicPanel meter={meter} />
        </StageIntro>
      );
    case 'countdown':
      return <ClassTapCountdown state={state} now={now} meter={meter} />;
    case 'active':
      return <ClassTapArena state={state} now={now} conn={conn} dispatch={dispatch} meter={meter} pressRef={pressRef} />;
    case 'turnDone':
      return <ClassTapDone state={state} meter={meter} />;
    default:
      return (
        <StageResults state={state}>
          <TapResults state={state} />
        </StageResults>
      );
  }
};

const TapScreen = ({ state, now, conn, dispatch }) => {
  if (state.classMode) return <ClassTap state={state} now={now} conn={conn} dispatch={dispatch} />;
  switch (state.step) {
    case 'intro':
      return <StageIntro state={state} />;
    case 'countdown':
      return <BigCountdown endsAt={state.endsAt} now={now} caption="📱 אצבעות על הלב... מוכנים?" />;
    case 'active':
    case 'tally':
      return <TapArena state={state} now={now} />;
    default:
      return (
        <StageResults state={state}>
          <TapResults state={state} />
        </StageResults>
      );
  }
};

export default TapScreen;
