import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playerIds } from '../../engine/engine';
import { isFirebaseConfigured } from '../../net/firebaseConfig';
import { joinHint, joinUrl } from '../../routes';
import Avatar from '../../shared/Avatar';
import { LogoHeart } from '../../shared/Heart';
import { useQrDataUrl } from './common';

const WavingPlayer = ({ player, waves, onRemove }) => (
  <motion.button
    type="button"
    layout
    className="hb-lobby-player"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
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

const LobbyScreen = ({ state, mode, onRemovePlayer, onOpenSettings }) => {
  const { roomCode, settings, players } = state;
  const isLocal = mode === 'local';
  const qr = useQrDataUrl(joinUrl(roomCode, { local: isLocal }));
  const ids = playerIds(state);
  const waves = state.inputs || {};

  return (
    <div className="hb-lobby">
      <section className="hb-lobby-info">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
          <LogoHeart className="hb-lobby-logo" />
        </motion.div>
        <h1 className="hb-lobby-title">בנק הלבבות של {settings.birthdayName}</h1>
        <p className="hb-lobby-sub">
          משחק משפחתי {settings.age ? `ליום הולדת ${settings.age} ` : ''}🎂 המטרה: למלא את הבנק ב-100% אהבה!
        </p>

        <div className="hb-lobby-players">
          <h2>
            מי כבר בפנים? <span className="hb-count-pill">{ids.length}</span>
          </h2>
          <div className="hb-lobby-grid">
            <AnimatePresence>
              {ids.map((pid) => (
                <WavingPlayer key={pid} player={players[pid]} waves={waves[pid] && waves[pid].waves} onRemove={() => onRemovePlayer(pid)} />
              ))}
            </AnimatePresence>
          </div>
          {!ids.length && <p className="hb-lobby-empty">עוד אין אף אחד... סרקו את הקוד והצטרפו! 📱</p>}
        </div>

        <button type="button" className="hb-link-btn" onClick={onOpenSettings}>
          ⚙️ עריכת השאלות, המושגים והמילים
        </button>
      </section>

      <section className="hb-lobby-join">
        <div className="hb-qr-card">
          <div className="hb-qr-title">סורקים ומצטרפים 📱</div>
          {qr ? <img className="hb-qr" src={qr} alt={`QR להצטרפות: ${joinUrl(roomCode)}`} /> : <div className="hb-qr hb-qr-empty" />}
          <div className="hb-qr-hint">בלי אפליקציה - רק מצלמה</div>
        </div>
        <div className="hb-join-manual">
          <span>או היכנסו ל-</span>
          <strong dir="ltr">{joinHint()}</strong>
        </div>
        <div className="hb-room-code" data-testid="room-code">
          קוד המשחק: <strong dir="ltr">{roomCode}</strong>
        </div>
      </section>

      {isLocal && <LocalModeBanner code={roomCode} />}
    </div>
  );
};

export default LobbyScreen;
