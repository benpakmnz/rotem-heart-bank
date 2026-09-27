import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { basketThrower } from '../../engine/engine';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import Badges from '../../shared/Badges';
import GameTitle from '../../shared/GameTitle';
import { GlossyHeart } from '../../shared/Heart';
import ThrowSlots from '../../shared/ThrowSlots';
import { StageIntro, StageResults } from './common';

// A woven basket with the hearts that went in piled on top.
export const Basket = ({ hits = 0, className = '' }) => (
  <div className={`hb-basket ${className}`}>
    <div className="hb-basket-pile">
      <AnimatePresence>
        {Array.from({ length: Math.min(hits, 12) }, (_, i) => (
          <motion.span
            key={i}
            className="hb-basket-heart"
            style={{ left: `${14 + ((i * 29) % 64)}%`, bottom: `${6 + Math.floor(i / 3) * 12}%`, rotate: `${((i * 37) % 50) - 25}deg` }}
            initial={{ y: -260, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 11 }}
          >
            <GlossyHeart />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
    <svg viewBox="0 0 200 130" className="hb-basket-svg" aria-hidden="true">
      <defs>
        <linearGradient id="hb-basket-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9B06A" />
          <stop offset="100%" stopColor="#A5642B" />
        </linearGradient>
      </defs>
      <path d="M12 22 L 188 22 L 166 124 L 34 124 Z" fill="url(#hb-basket-wood)" stroke="#7A4418" strokeWidth="3" strokeLinejoin="round" />
      {[40, 62, 84, 106].map((y) => (
        <path key={y} d={`M${12 + (y - 22) * 0.21} ${y} L ${188 - (y - 22) * 0.21} ${y}`} stroke="#8A5220" strokeWidth="3" opacity="0.7" />
      ))}
      {[40, 70, 100, 130, 160].map((x) => (
        <path key={x} d={`M${x} 24 L ${100 + (x - 100) * 0.75} 122`} stroke="#8A5220" strokeWidth="2.5" opacity="0.5" />
      ))}
      <rect x="4" y="12" width="192" height="16" rx="8" fill="#D08A45" stroke="#7A4418" strokeWidth="3" />
      <path d="M40 60 C 80 70, 120 70, 160 60" stroke="rgba(255,255,255,0.35)" strokeWidth="4" fill="none" />
      <path d="M84 84 C 84 78 92 76 100 84 C 108 76 116 78 116 84 C 116 92 100 100 100 100 C 100 100 84 92 84 84 Z" fill="#FF4D94" stroke="#fff" strokeWidth="2" />
    </svg>
  </div>
);

const hitsOf = (list) => (list || []).filter(Boolean).length;

const BasketTurn = ({ state, badges }) => {
  const b = state.basket;
  const pid = basketThrower(state);
  const player = state.players[pid];
  const mine = b.throws[pid] || [];
  const nextUp = b.order.slice(b.turn + 1).find((id) => state.players[id]);
  const done = mine.length >= b.perPlayer;
  const perfect = b.perfect.includes(pid);
  return (
    <div className="hb-basket-stage">
      <div className="hb-basket-player">
        <motion.div key={pid} initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          <Avatar player={player} size="xxl" />
        </motion.div>
        <GameTitle text={`התור של ${player ? player.name : ''}!`} className="hb-basket-title" />
        <ThrowSlots throws={mine} total={b.perPlayer} />
        <div className="hb-basket-line">
          {perfect ? (
            <motion.span className="hb-chip hb-chip-gold hb-basket-perfect" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}>
              🎯 קלע מושלם! +{fmt(b.perfectBonus)}
            </motion.span>
          ) : done ? (
            <span>
              {hitsOf(mine)} מתוך {b.perPlayer} נכנסו לסל!
            </span>
          ) : (
            <span>
              זורקים {b.perPlayer} לבבות לסל - כל קליעה {fmt(b.hitPoints)} לבבות
            </span>
          )}
        </div>
        {nextUp && <div className="hb-basket-next">הבא/ה בתור: {state.players[nextUp].name}</div>}
      </div>
      <div className="hb-basket-side">
        <Basket hits={hitsOf(mine)} />
        <div className="hb-basket-board hb-glass">
          {b.order
            .filter((id) => state.players[id])
            .map((id, i) => (
              <div key={id} className={`hb-basket-row ${id === pid ? 'is-current' : ''} ${i < b.turn ? 'is-done' : ''}`}>
                <Avatar player={state.players[id]} size="xs" />
                <span className="hb-basket-row-name">{state.players[id].name}</span>
                <Badges list={(badges[id] || []).filter((k) => k === 'basket')} />
                <span className="hb-basket-row-hits">{b.throws[id] ? `${hitsOf(b.throws[id])}/${b.perPlayer}` : ''}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const BasketSummary = ({ state }) => {
  const b = state.basket;
  const rows = b.order
    .filter((id) => state.players[id] && b.throws[id])
    .sort((x, y) => hitsOf(b.throws[y]) - hitsOf(b.throws[x]));
  return (
    <div className="hb-basket-summary">
      {rows.map((id) => (
        <div key={id} className="hb-basket-summary-row">
          <Avatar player={state.players[id]} size="sm" />
          <span className="hb-basket-row-name">{state.players[id].name}</span>
          <ThrowSlots throws={b.throws[id]} total={b.perPlayer} />
          {b.perfect.includes(id) && <span className="hb-badge-basket">🎯</span>}
        </div>
      ))}
    </div>
  );
};

const BasketScreen = ({ state, badges }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  if (state.step === 'throw') return <BasketTurn state={state} badges={badges} />;
  return (
    <StageResults state={state}>
      <BasketSummary state={state} />
    </StageResults>
  );
};

export default BasketScreen;
