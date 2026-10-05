import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import TimerRing from '../../shared/TimerRing';
import { StageIntro, StageResults } from './common';

// Slot-machine style pick of the next performer (lands on the engine's choice).
const Roulette = ({ pool, performerId, players, title = 'מי יציג עכשיו?' }) => {
  const [shown, setShown] = useState(performerId);
  const [done, setDone] = useState(false);
  const playersRef = useRef(players);
  playersRef.current = players;
  // The engine hands out a fresh `pool` array on every state change - key on its contents.
  const poolKey = pool.join('|');

  useEffect(() => {
    const valid = poolKey.split('|').filter((pid) => playersRef.current[pid]);
    setDone(false);
    if (valid.length < 2) {
      setShown(performerId);
      setDone(true);
      return undefined;
    }
    const delays = [];
    for (let d = 55; d < 380; d *= 1.14) delays.push(d);
    let step = 0;
    let timer = null;
    const next = () => {
      if (step >= delays.length) {
        setShown(performerId);
        setDone(true);
        return;
      }
      setShown(valid[(valid.indexOf(performerId) + step + 1) % valid.length]);
      timer = setTimeout(next, delays[step]);
      step += 1;
    };
    next();
    return () => clearTimeout(timer);
  }, [poolKey, performerId]);

  return (
    <div className="hb-roulette">
      <GameTitle text={title} className="hb-roulette-title" />
      <motion.div className={`hb-roulette-window ${done ? 'is-done' : ''}`} animate={done ? { scale: [1, 1.18, 1] } : {}}>
        <MarqueeBulbs />
        <Avatar player={players[shown]} size="xxl" showName />
      </motion.div>
    </div>
  );
};

// Blinking light bulbs around the roulette, like a TV game show sign.
const BULBS = Array.from({ length: 22 }, (_, i) => {
  // walk around the rectangle: top, left side, bottom, right side
  const t = i / 22;
  if (t < 0.3) return { left: `${(t / 0.3) * 100}%`, top: '0%' };
  if (t < 0.5) return { left: '100%', top: `${((t - 0.3) / 0.2) * 100}%` };
  if (t < 0.8) return { left: `${100 - ((t - 0.5) / 0.3) * 100}%`, top: '100%' };
  return { left: '0%', top: `${100 - ((t - 0.8) / 0.2) * 100}%` };
});

const MarqueeBulbs = () => (
  <div className="hb-bulbs" aria-hidden="true">
    {BULBS.map((pos, i) => (
      <span key={i} className="hb-bulb" style={pos} />
    ))}
  </div>
);

const Spotlight = () => <div className="hb-spotlight" aria-hidden="true" />;

const Curtains = () => (
  <>
    <div className="hb-curtain hb-curtain-right" aria-hidden="true" />
    <div className="hb-curtain hb-curtain-left" aria-hidden="true" />
  </>
);

const EYES_MS = 3000;
const SHOW_MS = 6000;

// Class mode: the secret concept on the big screen, for the presenter only.
// First the whole class closes its eyes (3 seconds), then the concept shows
// for 6 seconds (a click hides it sooner). It covers the whole TV screen (top
// bar and buttons too), so it goes straight into it.
const ConceptPeek = ({ concept }) => {
  const [openedAt, setOpenedAt] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!openedAt) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - openedAt >= EYES_MS + SHOW_MS) setOpenedAt(0);
    }, 200);
    return () => clearInterval(id);
  }, [openedAt]);
  const eyesLeft = EYES_MS - (now - openedAt);
  const screen = openedAt ? document.querySelector('.hb-tv') : null;
  const overlay = (
    <div className="hb-peek" role="dialog" aria-label="המושג הסודי" onClick={() => setOpenedAt(0)} data-testid="peek-overlay">
      {eyesLeft > 0 ? (
        <motion.div key="eyes" className="hb-peek-eyes" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="hb-peek-emoji">🙈</span>
          <strong>כולם עוצמים עיניים!</strong>
          <span>
            רק הנציג/ה מסתכל/ת במסך... <b>{Math.ceil(eyesLeft / 1000)}</b>
          </span>
        </motion.div>
      ) : (
        <motion.div key="card" className="hb-peek-card" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}>
          <span>🤫 המושג הסודי:</span>
          <strong data-testid="peek-concept">{concept}</strong>
          <small>זוכרים? לחיצה מסתירה</small>
        </motion.div>
      )}
    </div>
  );
  return (
    <>
      <button
        type="button"
        className="hb-btn hb-btn-soft hb-peek-btn"
        onClick={(e) => {
          e.currentTarget.blur();
          const t = Date.now();
          setNow(t);
          setOpenedAt(t);
        }}
        data-testid="peek"
      >
        🙈 הצצה במושג על המסך
      </button>
      {screen && createPortal(overlay, screen)}
    </>
  );
};

const CharadesRound = ({ state, now }) => {
  const cur = state.charades.current;
  const cls = Boolean(state.classMode);
  const performer = state.players[cur.performerId];
  const name = performer ? performer.name : '';
  const seconds = Number(state.settings.timings.charadesSeconds) || 60;
  const roundLabel = `סיבוב ${state.round + 1} מתוך ${state.charades.rounds}`;

  if (state.step === 'pick') {
    return <Roulette pool={cur.pool} performerId={cur.performerId} players={state.players} title={cls ? 'איזו קבוצה מציגה עכשיו?' : undefined} />;
  }

  if (state.step === 'ready' && cls) {
    return (
      <div className="hb-charades">
        <Curtains />
        <Spotlight />
        <span className="hb-chip">{roundLabel}</span>
        <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Avatar player={performer} size="xxl" />
        </motion.div>
        <GameTitle text={`התור של ${name}!`} className="hb-charades-title" />
        <p className="hb-charades-sub">🙋 נציג/ה של הקבוצה ניגש/ת למורה לקבל את המושג הסודי</p>
        <p className="hb-charades-hint">המושג מופיע בטלפון של המורה, או כאן - כשכל הכיתה עוצמת עיניים. כשמוכנים: &quot;הפעלת השעון&quot;</p>
        <ConceptPeek concept={cur.concept} />
      </div>
    );
  }

  if (state.step === 'ready') {
    return (
      <div className="hb-charades">
        <Curtains />
        <Spotlight />
        <span className="hb-chip">{roundLabel}</span>
        <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Avatar player={performer} size="xxl" />
        </motion.div>
        <GameTitle text={`התור של ${name} להציג!`} className="hb-charades-title" />
        <p className="hb-charades-sub">🤫 המושג הסודי מחכה בטלפון של {name} - בלי להראות לאף אחד!</p>
        <p className="hb-charades-hint">כשמוכנים לוחצים בטלפון על "מתחילים" והשעון יוצא לדרך</p>
      </div>
    );
  }

  if (state.step === 'perform') {
    return (
      <div className="hb-charades is-performing">
        <Curtains />
        <Spotlight />
        <span className="hb-chip">{roundLabel}</span>
        <div className="hb-charades-stage">
          <motion.div animate={{ y: [0, -14, 0], rotate: [0, 4, -4, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <Avatar player={performer} size="xxl" showName />
          </motion.div>
          <TimerRing endsAt={state.endsAt} total={seconds * 1000} now={now} className="hb-charades-timer" />
        </div>
        <GameTitle text={cls ? `${name} - נחשו בקול רם!` : 'נחשו בקול רם!'} className="hb-charades-title" />
        <p className="hb-charades-sub">{cls ? 'רק הקבוצה של המציג/ה מנחשת - רק תנועות, בלי מילים!' : 'רק תנועות, בלי מילים - מי יגלה ראשון?'}</p>
      </div>
    );
  }

  // outcome
  return (
    <div className={`hb-charades hb-charades-outcome ${cur.success ? 'is-success' : 'is-fail'}`}>
      <Curtains />
      <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 11 }}>
        <GameTitle text={cur.success ? 'הצלחה!' : 'נגמר הזמן!'} tone={cur.success ? 'gold' : 'pink'} className="hb-charades-title" />
      </motion.div>
      <div className="hb-charades-concept">
        <span>המושג היה:</span>
        <strong>{cur.concept}</strong>
      </div>
      {cur.success ? (
        <div className="hb-charades-bonus">
          {cls ? `+${fmt(SCORING.charadesTeam)} לבבות לאוצר של ${name}! 💖` : `+${fmt(SCORING.charadesGroup)} לבבות לאוצר של כל המשפחה! 💖`}
        </div>
      ) : (
        <div className="hb-charades-bonus is-soft">לא נורא - ננסה בסיבוב הבא!</div>
      )}
      <Avatar player={performer} size="lg" showName />
    </div>
  );
};

const CharadesSummary = ({ state }) => (
  <div className="hb-charades-summary">
    {state.charades.results.map((r) => (
      <div key={r.round} className={`hb-charades-summary-row ${r.success ? 'is-success' : ''}`}>
        <Avatar player={state.players[r.performerId]} size="sm" />
        <span className="hb-charades-summary-concept">{r.concept}</span>
        <span>{r.success ? `✅ +${fmt(state.classMode ? SCORING.charadesTeam : SCORING.charadesGroup)}` : '⏰'}</span>
      </div>
    ))}
  </div>
);

const CharadesScreen = ({ state, now }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  if (state.step === 'results' || !state.charades.current) {
    return (
      <StageResults state={state}>
        <CharadesSummary state={state} />
      </StageResults>
    );
  }
  return <CharadesRound state={state} now={now} />;
};

export default CharadesScreen;
