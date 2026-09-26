import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { onlinePlayerIds, tapCounts } from '../../engine/engine';
import { fmt } from '../../lib/format';
import { HEART_PATH, useSvgId } from '../../shared/Heart';
import Avatar from '../../shared/Avatar';
import HeartRain from '../../shared/HeartRain';
import TimerRing from '../../shared/TimerRing';
import useAnimatedNumber from '../../shared/useAnimatedNumber';
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
            <stop offset="0%" stopColor="#FF9EB8" />
            <stop offset="100%" stopColor="#E11D48" />
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
    <div className="hb-tap">
      <HeartRain rateRef={rateRef} active={active} />
      <div className="hb-tap-side">
        {active ? (
          <TimerRing endsAt={state.endsAt} total={seconds * 1000} now={now} className="hb-tap-timer" />
        ) : (
          <div className="hb-tap-over">⏱️ נגמר הזמן!</div>
        )}
        <div className="hb-tap-top">
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
  const ranking = Object.keys(counts)
    .filter((pid) => state.players[pid])
    .sort((a, b) => counts[b] - counts[a]);
  return (
    <div className="hb-tap-results">
      <div className="hb-big-stat">
        <strong>{fmt(total)}</strong>
        <span>לחיצות על הלב!</span>
      </div>
      {bonusWinners.length > 0 && (
        <motion.div className="hb-bonus-card" initial={{ scale: 0.5, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.4 }}>
          <div className="hb-bonus-title">⚡ הלוחצים הכי מהירים</div>
          <div className="hb-bonus-players">
            {bonusWinners
              .filter((pid) => state.players[pid])
              .map((pid) => (
                <div key={pid} className="hb-bonus-player">
                  <Avatar player={state.players[pid]} size="lg" showName />
                  <span>{fmt(counts[pid])} לחיצות</span>
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

const TapScreen = ({ state, now }) => {
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
