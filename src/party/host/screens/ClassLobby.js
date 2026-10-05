import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AVATARS } from '../../config/avatars';
import { MAX_TEAM_NAME, MAX_TEAMS, playerIds } from '../../engine/engine';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import RotemPhoto from '../../shared/RotemPhoto';
import { openAnswerCards } from '../classTools';

// The next animal no other team has (a click on a team's picture).
const nextAvatar = (state, pid) => {
  const used = new Set(playerIds(state).filter((id) => id !== pid).map((id) => state.players[id].avatar));
  const start = AVATARS.findIndex((a) => a.id === state.players[pid].avatar);
  for (let i = 1; i <= AVATARS.length; i += 1) {
    const a = AVATARS[(start + i) % AVATARS.length];
    if (!used.has(a.id)) return a.id;
  }
  return state.players[pid].avatar;
};

// One team: its animal (a click changes it), its name (typed in place) and ✕.
const TeamCard = ({ pid, team, index, canRemove, autoFocus, onRename, onNextAvatar, onRemove }) => {
  const [draft, setDraft] = useState(team.name);
  const [editing, setEditing] = useState(false);
  const input = useRef(null);
  // the engine keeps a cleaned-up name; show it whenever the box isn't being typed in
  useEffect(() => {
    if (!editing) setDraft(team.name);
  }, [team.name, editing]);
  useEffect(() => {
    if (autoFocus && input.current) {
      input.current.focus();
      input.current.select();
    }
  }, [autoFocus]);

  return (
    <motion.div
      layout
      className="hb-team-card"
      initial={{ opacity: 0, scale: 0.6, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: autoFocus ? 0 : 0.08 * index }}
      data-testid={`team-${pid}`}
    >
      <button
        type="button"
        className="hb-team-avatar"
        onClick={(e) => {
          e.currentTarget.blur(); // Enter stays "start the game"
          onNextAvatar();
        }}
        title="לחיצה מחליפה חיה"
        aria-label={`החלפת החיה של ${team.name}`}
      >
        <Avatar player={team} size="md" />
        <span className="hb-team-swap" aria-hidden="true">
          🔄
        </span>
      </button>
      <input
        ref={input}
        className="hb-team-name"
        value={draft}
        maxLength={MAX_TEAM_NAME}
        aria-label="שם הקבוצה"
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          setDraft(e.target.value);
          onRename(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
        }}
      />
      {canRemove && (
        <button type="button" className="hb-team-remove" onClick={onRemove} aria-label={`הוצאת ${team.name}`} title="הוצאת הקבוצה">
          ✕
        </button>
      )}
    </motion.div>
  );
};

// Class mode's lobby: the teacher sets up the teams (no QR - nobody joins
// with a phone), and gets the answer cards ready.
const ClassLobby = ({ state, dispatch, mode, onRemovePlayer, onOpenSettings, onOpenAdmin, onShowSaver }) => {
  const { settings, players } = state;
  const ids = playerIds(state);
  // focus the name of a team the teacher just added
  const [added, setAdded] = useState(null);
  const count = useRef(ids.length);
  useEffect(() => {
    if (ids.length > count.current) setAdded(ids[ids.length - 1]);
    count.current = ids.length;
  }, [ids]);

  return (
    <div className="hb-lobby hb-class-lobby">
      <section className="hb-lobby-hero">
        <motion.div
          initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 130, damping: 10 }}
        >
          <RotemPhoto size="lg" age={settings.age} beat />
        </motion.div>
        <motion.div initial={{ y: 40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.35, type: 'spring' }}>
          <GameTitle text={`אוצר הלבבות של ${settings.birthdayName}`} className="hb-lobby-title" />
        </motion.div>
        <motion.p className="hb-lobby-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <span className="hb-chip hb-chip-gold">🏫 משחק כיתתי</span>
          כל הכיתה ממלאת יחד את האוצר ב-100% אהבה!
        </motion.p>
        <div className="hb-lobby-links">
          <button type="button" className="hb-link-btn" onClick={onOpenSettings}>
            ⚙️ עריכת השם, השאלות, המושגים והמילים
          </button>
          {mode !== 'local' && (
            <button type="button" className="hb-link-btn" onClick={onOpenAdmin}>
              📱 שליטה מהטלפון
            </button>
          )}
          {onShowSaver && (
            <button type="button" className="hb-link-btn" onClick={onShowSaver}>
              🎈 שומר מסך
            </button>
          )}
        </div>
      </section>

      <div className="hb-class-side">
        <section className="hb-class-teams hb-glass" data-testid="class-teams">
          <h2>
            🏫 הקבוצות <span className="hb-count-pill">{ids.length}</span>
            <small>לחיצה על החיה מחליפה אותה, ועל השם - עורכת אותו</small>
          </h2>
          <div className="hb-team-grid">
            <AnimatePresence>
              {ids.map((pid, i) => (
                <TeamCard
                  key={pid}
                  pid={pid}
                  team={players[pid]}
                  index={i}
                  canRemove={ids.length > 1}
                  autoFocus={added === pid}
                  onRename={(name) => dispatch({ type: 'updateTeam', pid, team: { name } })}
                  onNextAvatar={() => dispatch({ type: 'updateTeam', pid, team: { avatar: nextAvatar(state, pid) } })}
                  onRemove={() => {
                    // eslint-disable-next-line no-alert
                    if (window.confirm(`להוציא את הקבוצה "${players[pid].name}"?`)) onRemovePlayer(pid);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
          {ids.length < MAX_TEAMS ? (
            <button type="button" className="hb-btn hb-btn-soft hb-team-add" onClick={() => dispatch({ type: 'addTeam' })} data-testid="add-team">
              ➕ עוד קבוצה
            </button>
          ) : (
            <p className="hb-team-max">אפשר עד {MAX_TEAMS} קבוצות</p>
          )}
        </section>

        <motion.div className="hb-class-tips hb-glass" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <h2>📋 לפני שמתחילים</h2>
          <ul>
            <li>
              <span className="hb-class-tip-icon">🎨</span>
              <span>
                כל קבוצה מקבלת 4 כרטיסי צבע - <b>אדום 1, כחול 2, כתום 3, ירוק 4</b> - לשלב הטריוויה.
              </span>
              <button type="button" className="hb-btn hb-btn-soft hb-class-tip-btn" onClick={openAnswerCards}>
                🖨️ הדפסה
              </button>
            </li>
            <li>
              <span className="hb-class-tip-icon">🎤</span>
              <span>
                במטר מחיאות הכפיים המחשב יבקש רשות להשתמש במיקרופון - לוחצים <b>&quot;אישור&quot;</b>. אין מיקרופון? מקישים על מקש הרווח.
              </span>
            </li>
            <li>
              <span className="hb-class-tip-icon">📱</span>
              <span>
                {mode === 'local'
                  ? 'הכול עובד מהמחשב הזה. (השליטה מהטלפון צריכה חיבור לשרת המשחק, ואין חיבור כרגע.)'
                  : 'אפשר לנהל מהמחשב, או מהטלפון של המורה - שם רואים גם את המושגים הסודיים של הפנטומימה.'}
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default ClassLobby;
