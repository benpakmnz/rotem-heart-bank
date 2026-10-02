import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { ANSWER_COLORS, heartKind, stageInfo, stageOrder, stageScoring, withName } from '../../config/game';
import { playerBadges, rankPlayers } from '../../engine/engine';
import { fmt, secondsLeft } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import Badges from '../../shared/Badges';
import GameTitle from '../../shared/GameTitle';
import { GlossyHeart, Heart } from '../../shared/Heart';
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
    screen = <GlossyHeart className="hb-pp-tap" />;
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
  } else if (stageId === 'hunt') {
    screen = (
      <div className="hb-pp-hunt">
        {['gold', 'silver', 'silver', 'silver', 'red', 'red'].map((kind, i) => (
          <span key={i} className={i < 2 ? 'is-found' : ''}>
            <GlossyHeart from={heartKind(kind).colors[0]} to={heartKind(kind).colors[1]} />
          </span>
        ))}
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

const pop = (delay, extra = {}) => ({ initial: { opacity: 0, ...extra }, animate: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }, transition: { delay, type: 'spring', stiffness: 200, damping: 16 } });

// The stage's big title card: badge slams in, the icon medal spins in, the
// title bounces, then the rules slide in one by one.
export const StageIntro = ({ state }) => {
  const stage = stageInfo(state.phase, stageOrder(state.settings));
  const name = state.settings.birthdayName;
  return (
    <div className="hb-intro">
      <div className="hb-intro-text">
        <motion.div className="hb-intro-badge" {...pop(0, { y: -80 })}>
          {stage.num ? `שלב ${stage.num} מתוך ${stage.total}` : 'שלב בונוס'}
        </motion.div>
        <div className="hb-intro-head">
          <motion.div className="hb-intro-medal" {...pop(0.15, { scale: 0, rotate: -200 })}>
            <GlossyHeart />
            <span className="hb-intro-medal-icon">{stage.icon}</span>
          </motion.div>
          <motion.div {...pop(0.35, { scale: 2.4 })}>
            <GameTitle text={stage.title} className="hb-intro-title" />
          </motion.div>
        </div>
        <motion.p className="hb-intro-sub" {...pop(0.6, { y: 20 })}>
          {withName(stage.subtitle, name)}
        </motion.p>
        <ol className="hb-intro-how">
          {stage.how.map((line, i) => (
            <motion.li key={line} {...pop(0.8 + i * 0.18, { x: 120 })}>
              <span className="hb-intro-step">{i + 1}</span>
              {withName(line, name)}
            </motion.li>
          ))}
        </ol>
        <motion.div className="hb-intro-chips" {...pop(1.1 + stage.how.length * 0.18, { y: 30 })}>
          {stageScoring(stage, state.settings).map((c) => (
            <span key={c} className="hb-chip hb-chip-gold">
              {c}
            </span>
          ))}
        </motion.div>
      </div>
      <motion.div
        className="hb-intro-phone"
        initial={{ opacity: 0, rotate: -25, x: -160 }}
        animate={{ opacity: 1, rotate: -5, x: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 110, damping: 13 }}
      >
        <PhonePreview stageId={stage.id} />
        <div className="hb-intro-phone-label">📱 בטלפון: {stage.phoneHint}</div>
      </motion.div>
    </div>
  );
};

const LeaderRow = ({ rank, player, score, max, badges }) => {
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
      <span className="hb-leader-name">
        {player.name} <Badges list={badges} />
      </span>
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
  const badges = playerBadges(state);
  return (
    <div className="hb-leaderboard hb-glass">
      <h2>🏦 {title}</h2>
      <ol>
        {ranking.map((pid, i) => (
          <LeaderRow key={pid} rank={i} player={state.players[pid]} score={state.scores[pid] || 0} max={max} badges={badges[pid]} />
        ))}
      </ol>
    </div>
  );
};

export const StageResults = ({ state, children }) => {
  const stage = stageInfo(state.phase, stageOrder(state.settings));
  const stats = state.stageStats[state.phase] || { gained: 0 };
  const gained = useAnimatedNumber(stats.gained, 1600);
  return (
    <div className="hb-results">
      <motion.div className="hb-results-head" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }}>
        <span className="hb-results-icon">{stage.icon}</span>
        <GameTitle text={`סוף ${stage.num ? `שלב ${stage.num}` : 'השלב'}: ${stage.title}`} tone="gold" className="hb-results-title" />
      </motion.div>
      <motion.div className="hb-results-gained" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <Heart className="hb-results-heart" color="#F0145A" />
        <b>+{fmt(gained)}</b> לבבות נכנסו לבנק בשלב הזה!
      </motion.div>
      <div className="hb-results-body">
        {children && <div className="hb-results-highlight">{children}</div>}
        <Leaderboard state={state} />
      </div>
    </div>
  );
};

// 3-2-1 in a beating heart, with a shock ring on every second.
export const BigCountdown = ({ endsAt, now, caption }) => {
  const n = secondsLeft(endsAt, now);
  return (
    <div className="hb-countdown">
      <div className="hb-countdown-stage">
        <motion.div
          key={`ring-${n}`}
          className="hb-countdown-ring"
          initial={{ scale: 0.5, opacity: 0.9 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <motion.div
          key={n}
          className={`hb-countdown-heart ${n > 0 ? '' : 'is-go'}`}
          initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 13 }}
        >
          <GlossyHeart />
          <span className="hb-countdown-num">{n > 0 ? n : 'יאללה!'}</span>
        </motion.div>
      </div>
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
