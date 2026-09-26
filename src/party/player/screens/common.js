import React from 'react';
import { motion } from 'framer-motion';
import { withName } from '../../config/game';
import { fmt, secondsLeft } from '../../lib/format';
import { useRoomValue } from '../../net/hooks';
import Avatar from '../../shared/Avatar';

export const myRank = (state, players, id) => {
  const scores = state.scores || {};
  const ids = Object.keys(players || {}).filter((pid) => players[pid] && players[pid].name);
  const sorted = ids.sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  return { rank: sorted.indexOf(id) + 1, of: sorted.length };
};

export const LookAtTv = ({ children }) => (
  <div className="hb-look">
    <motion.div className="hb-look-tv" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
      📺
    </motion.div>
    {children}
  </div>
);

export const LobbyWait = ({ conn, me }) => {
  const mine = useRoomValue(conn, `inputs/lobby/${me.id}`);
  const waves = (mine && mine.waves) || 0;
  return (
    <div className="hb-pad hb-lobby-wait">
      <h1 className="hb-phone-title">נכנסת למשחק! 🎉</h1>
      <motion.button
        type="button"
        className="hb-wave-btn"
        whileTap={{ scale: 0.85, rotate: -10 }}
        onClick={() => {
          conn.set(`inputs/lobby/${me.id}`, { waves: waves + 1 });
          if (navigator.vibrate) navigator.vibrate(15);
        }}
        aria-label="נפנוף לכולם"
      >
        <Avatar player={me} size="xxl" />
      </motion.button>
      <p className="hb-phone-text">לחצו על הדמות כדי לנפנף לכולם בטלוויזיה 👋</p>
      <p className="hb-phone-hint">מחכים שכל המשפחה תצטרף...</p>
    </div>
  );
};

export const StagePrep = ({ stage, name }) => (
  <div className="hb-pad hb-prep">
    <motion.div className="hb-prep-icon" initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -10, 10, 0] }}>
      {stage.icon}
    </motion.div>
    <div className="hb-prep-num">שלב {stage.num}</div>
    <h1 className="hb-phone-title">{stage.title}</h1>
    <ul className="hb-prep-how">
      {stage.how.map((line) => (
        <li key={line}>{withName(line, name)}</li>
      ))}
    </ul>
    <p className="hb-phone-hint">מתחילים עוד רגע - הסתכלו בטלוויזיה 📺</p>
  </div>
);

export const PhoneCountdown = ({ state, now }) => {
  const n = secondsLeft(state.endsAt, now);
  return (
    <div className="hb-pad hb-phone-countdown">
      <motion.div key={n} className="hb-phone-countdown-num" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        {n > 0 ? n : 'יאללה!'}
      </motion.div>
      <p className="hb-phone-text">{state.phase === 'tap' ? 'אצבעות על הלב!' : 'מתכוננים...'}</p>
    </div>
  );
};

export const StageDone = ({ state, players, me, stage }) => {
  const { rank, of } = myRank(state, players, me.id);
  const score = (state.scores && state.scores[me.id]) || 0;
  return (
    <div className="hb-pad hb-done">
      <div className="hb-prep-icon">{stage.icon}</div>
      <h1 className="hb-phone-title">סוף שלב {stage.num}!</h1>
      <div className="hb-done-score">
        <span>בבנק האישי שלך</span>
        <strong>{fmt(score)} ❤️</strong>
      </div>
      {rank > 0 && (
        <div className="hb-done-rank">
          מקום {rank} מתוך {of}
        </div>
      )}
      <LookAtTv>
        <p className="hb-phone-hint">עוד רגע ממשיכים!</p>
      </LookAtTv>
    </div>
  );
};

export const PhoneTimer = ({ endsAt, now, total }) => {
  const left = Math.max(0, endsAt - now);
  return (
    <div className={`hb-phone-timer ${left <= 5000 ? 'is-urgent' : ''}`}>
      <span className="hb-phone-timer-bar" style={{ width: `${total ? Math.min(100, (left / total) * 100) : 0}%` }} />
      <span className="hb-phone-timer-num">{Math.ceil(left / 1000)}</span>
    </div>
  );
};
