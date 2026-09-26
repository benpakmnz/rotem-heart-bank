import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { ANSWER_COLORS, stageById, withName } from '../../config/game';
import { rankPlayers } from '../../engine/engine';
import { fmt, secondsLeft } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import { Heart } from '../../shared/Heart';
import useAnimatedNumber from '../../shared/useAnimatedNumber';

export const useQrDataUrl = (text) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1E2433', light: '#FFFFFF' } })
      .then((svg) => alive && setUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [text]);
  return url;
};

// Mini phone showing what each stage looks like on the guests' phones.
export const PhonePreview = ({ stageId }) => {
  let screen = null;
  if (stageId === 'tap') {
    screen = <Heart className="hb-pp-tap" color="#FF5C8A" />;
  } else if (stageId === 'trivia') {
    screen = (
      <div className="hb-pp-grid">
        {ANSWER_COLORS.map((c, i) => (
          <div key={c} className="hb-pp-answer" style={{ background: c }}>
            <Heart color="rgba(255,255,255,.9)" />
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
    );
  } else if (stageId === 'charades') {
    screen = (
      <div className="hb-pp-secret">
        <div className="hb-pp-card">🤫 מושג סודי</div>
        <div className="hb-pp-btn">הצלחתי!</div>
      </div>
    );
  } else if (stageId === 'word') {
    screen = (
      <div className="hb-pp-word">
        <div className="hb-pp-slots">
          <span>א</span>
          <span />
          <span />
          <span />
        </div>
        <div className="hb-pp-tiles">
          {['ה', 'ב', 'ה'].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
    );
  } else if (stageId === 'blessings') {
    screen = (
      <div className="hb-pp-bless">
        <div className="hb-pp-input">שמחה</div>
        <div className="hb-pp-btn">💌 שליחה</div>
      </div>
    );
  }
  return (
    <div className="hb-phone-preview" aria-hidden="true">
      <div className="hb-pp-notch" />
      <div className="hb-pp-screen">{screen}</div>
    </div>
  );
};

export const StageIntro = ({ state }) => {
  const stage = stageById(state.phase);
  const name = state.settings.birthdayName;
  return (
    <div className="hb-intro">
      <motion.div className="hb-intro-text" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="hb-intro-badge">
          שלב {stage.num} מתוך 5
        </div>
        <h1 className="hb-intro-title">
          <span className="hb-intro-icon">{stage.icon}</span>
          {stage.title}
        </h1>
        <p className="hb-intro-sub">{withName(stage.subtitle, name)}</p>
        <ul className="hb-intro-how">
          {stage.how.map((line) => (
            <li key={line}>
              <Heart className="hb-bullet" color="#FF5C8A" />
              {withName(line, name)}
            </li>
          ))}
        </ul>
        <div className="hb-intro-chips">
          {stage.scoring.map((c) => (
            <span key={c} className="hb-chip hb-chip-gold">
              {c}
            </span>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="hb-intro-phone"
        initial={{ opacity: 0, rotate: -8, y: 40 }}
        animate={{ opacity: 1, rotate: -4, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <PhonePreview stageId={stage.id} />
        <div className="hb-intro-phone-label">📱 בטלפון: {stage.phoneHint}</div>
      </motion.div>
    </div>
  );
};

const LeaderRow = ({ rank, player, score, max }) => {
  const shown = useAnimatedNumber(score, 1400);
  const medal = ['🥇', '🥈', '🥉'][rank] || `${rank + 1}`;
  return (
    <motion.li
      className="hb-leader-row"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * rank }}
    >
      <span className="hb-leader-rank">{medal}</span>
      <Avatar player={player} size="sm" />
      <span className="hb-leader-name">{player.name}</span>
      <span className="hb-leader-bar">
        <span style={{ width: `${max ? Math.max(4, (score / max) * 100) : 4}%` }} />
      </span>
      <span className="hb-leader-score">{fmt(shown)}</span>
    </motion.li>
  );
};

// Personal heart banks ("הבנק האישי") of the top players.
export const Leaderboard = ({ state, limit = 5, title = 'הבנקים האישיים' }) => {
  const ranking = rankPlayers(state).slice(0, limit);
  const max = ranking.length ? state.scores[ranking[0]] || 0 : 0;
  return (
    <div className="hb-leaderboard">
      <h2>{title}</h2>
      <ol>
        {ranking.map((pid, i) => (
          <LeaderRow key={pid} rank={i} player={state.players[pid]} score={state.scores[pid] || 0} max={max} />
        ))}
      </ol>
    </div>
  );
};

export const StageResults = ({ state, children }) => {
  const stage = stageById(state.phase);
  const stats = state.stageStats[state.phase] || { gained: 0 };
  const gained = useAnimatedNumber(stats.gained, 1600);
  return (
    <div className="hb-results">
      <motion.h1 className="hb-results-title" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        {stage.icon} סוף שלב {stage.num}: {stage.title}
      </motion.h1>
      <div className="hb-results-gained">
        <Heart className="hb-results-heart" color="#E11D48" />+{fmt(gained)} לבבות נכנסו לבנק בשלב הזה!
      </div>
      <div className="hb-results-body">
        {children && <div className="hb-results-highlight">{children}</div>}
        <Leaderboard state={state} />
      </div>
    </div>
  );
};

export const BigCountdown = ({ endsAt, now, caption }) => {
  const n = secondsLeft(endsAt, now);
  return (
    <div className="hb-countdown">
      <motion.div
        key={n}
        className="hb-countdown-num"
        initial={{ scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        {n > 0 ? n : 'יאללה!'}
      </motion.div>
      {caption && <div className="hb-countdown-caption">{caption}</div>}
    </div>
  );
};

export const PlayerChip = ({ player, children, className = '' }) => (
  <span className={`hb-player-chip ${className}`}>
    <Avatar player={player} size="xs" />
    <span>{player ? player.name : ''}</span>
    {children}
  </span>
);
