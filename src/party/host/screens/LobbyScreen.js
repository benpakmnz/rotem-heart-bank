import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playerIds } from '../../engine/engine';
import { isFirebaseConfigured } from '../../net/firebaseConfig';
import { joinHint, joinUrl } from '../../routes';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import RotemPhoto from '../../shared/RotemPhoto';
import { useQrDataUrl } from './common';

const WavingPlayer = ({ player, waves, onRemove, index }) => (
  <motion.button
    type="button"
    layout
    className="hb-lobby-player"
    style={{ '--hb-bob-delay': `${-(index % 5) * 0.45}s` }}
    initial={{ scale: 0, opacity: 0, y: -60 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 320, damping: 14 }}
    onClick={() => {
      // eslint-disable-next-line no-alert
      if (window.confirm(`להוציא את ${player.name} מהמשחק?`)) onRemove();
    }}
    title="לחיצה מוציאה מהמשחק"
  >
    <motion.div key={waves || 0} animate={waves ? { y: [0, -26, 0, -12, 0], rotate: [0, -12, 10, -6, 0] } : {}} transition={{ duration: 0.8 }}>
      <Avatar player={player} size="lg" showName />
    </motion.div>
    {waves ? <span className="hb-wave-hand">👋</span> : null}
  </motion.button>
);

const LocalModeBanner = ({ code }) => (
  <div className="hb-local-banner">
    <strong>🧪 מצב הדגמה מקומי</strong>
    {isFirebaseConfigured() ? (
      <span>
        אפשר לשחק רק בחלונות של הדפדפן הזה (טלפונים לא יתחברו). כדי לשחק עם הטלפונים, פתחו את האתר בלי{' '}
        <bdi dir="ltr">?local=1</bdi> בכתובת.
      </span>
    ) : (
      <span>
        Firebase עדיין לא הוגדר, אז אפשר לשחק רק בחלונות של הדפדפן הזה (טלפונים לא יתחברו). ההוראות ב-README.md.
      </span>
    )}
    <button
      type="button"
      className="hb-btn hb-btn-soft"
      onClick={() => window.open(joinUrl(code, { local: true }), '_blank', 'popup,width=420,height=860')}
    >
      ➕ פתיחת שחקן לניסיון
    </button>
  </div>
);

const LobbyScreen = ({ state, mode, onRemovePlayer, onOpenSettings, onOpenAdmin }) => {
  const { roomCode, settings, players } = state;
  const isLocal = mode === 'local';
  const qr = useQrDataUrl(joinUrl(roomCode, { local: isLocal }));
  const ids = playerIds(state);
  const waves = state.inputs || {};

  return (
    <div className="hb-lobby">
      <section className="hb-lobby-hero">
        <motion.div
          initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 130, damping: 10 }}
        >
          <RotemPhoto size="lg" age={settings.age} beat />
        </motion.div>
        <motion.div initial={{ y: 40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.35, type: 'spring' }}>
          <GameTitle text={`בנק הלבבות של ${settings.birthdayName}`} className="hb-lobby-title" />
        </motion.div>
        <motion.p className="hb-lobby-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {settings.age ? <span className="hb-chip hb-chip-gold">🎂 יום הולדת {settings.age}</span> : null}
          המטרה: למלא את הבנק ב-100% אהבה!
        </motion.p>

        <div className="hb-lobby-players hb-glass">
          <h2>
            מי כבר בפנים? <span className="hb-count-pill">{ids.length}</span>
          </h2>
          <div className="hb-lobby-grid">
            <AnimatePresence>
              {ids.map((pid, i) => (
                <WavingPlayer
                  key={pid}
                  index={i}
                  player={players[pid]}
                  waves={waves[pid] && waves[pid].waves}
                  onRemove={() => onRemovePlayer(pid)}
                />
              ))}
            </AnimatePresence>
          </div>
          {!ids.length && <p className="hb-lobby-empty">עוד אין אף אחד... סרקו את הקוד והצטרפו! 📱</p>}
        </div>

        <div className="hb-lobby-links">
          <button type="button" className="hb-link-btn" onClick={onOpenSettings}>
            ⚙️ עריכת השאלות, המושגים והמילים
          </button>
          <button type="button" className="hb-link-btn" onClick={onOpenAdmin}>
            📱 שליטה מהטלפון (מנהל/ת)
          </button>
        </div>
      </section>

      <section className="hb-lobby-join">
        <motion.div
          className="hb-qr-card"
          initial={{ opacity: 0, x: -80, rotate: -6 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 110, damping: 13 }}
        >
          <div className="hb-qr-ribbon">📱 סורקים ומצטרפים!</div>
          {qr ? <img className="hb-qr" src={qr} alt={`QR להצטרפות: ${joinUrl(roomCode)}`} /> : <div className="hb-qr hb-qr-empty" />}
          <div className="hb-qr-hint">בלי אפליקציה - רק מצלמה</div>
        </motion.div>
        <div className="hb-join-manual">
          <span>או היכנסו ל-</span>
          <strong dir="ltr">{joinHint()}</strong>
        </div>
        <div className="hb-room-code" data-testid="room-code">
          <span>קוד המשחק</span>
          <strong dir="ltr">{roomCode}</strong>
        </div>
      </section>

      {isLocal && <LocalModeBanner code={roomCode} />}
    </div>
  );
};

export default LobbyScreen;
