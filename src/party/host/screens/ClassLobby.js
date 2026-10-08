import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAX_TEAMS, playerIds } from '../../engine/engine';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import RotemPhoto from '../../shared/RotemPhoto';
import { openAnswerCards, openTeamSigns } from '../classTools';

// One team: its heart in its color (the same as the sign on its table) and ✕.
const TeamCard = ({ pid, team, index, canRemove, onRemove }) => (
  <motion.div
    layout
    className="hb-team-card"
    initial={{ opacity: 0, scale: 0.6, y: 30 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.6 }}
    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.06 * index }}
    data-testid={`team-${pid}`}
  >
    <Avatar player={team} size="lg" />
    <span className="hb-team-name">{team.name}</span>
    {canRemove && (
      <button
        type="button"
        className="hb-team-remove"
        onClick={(e) => {
          e.currentTarget.blur(); // Enter stays "start the game"
          onRemove();
        }}
        aria-label={`הוצאת ${team.name}`}
        title="הוצאת הקבוצה"
      >
        ✕
      </button>
    )}
  </motion.div>
);

// Class mode's lobby: the teacher picks how many teams play (their colors
// come in order - no names to type), and gets the signs and cards ready.
const ClassLobby = ({ state, dispatch, mode, onRemovePlayer, onOpenSettings, onOpenAdmin, onShowSaver }) => {
  const { settings, players } = state;
  const ids = playerIds(state);

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
            <small>כל קבוצה היא לב בצבע משלה - בדיוק כמו השלט שעל השולחן שלה</small>
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
                  onRemove={() => {
                    // eslint-disable-next-line no-alert
                    if (window.confirm(`להוציא את ${players[pid].name} מהמשחק?`)) onRemovePlayer(pid);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
          {ids.length < MAX_TEAMS ? (
            <button
              type="button"
              className="hb-btn hb-btn-soft hb-team-add"
              onClick={(e) => {
                e.currentTarget.blur();
                dispatch({ type: 'addTeam' });
              }}
              data-testid="add-team"
            >
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
              <span className="hb-class-tip-icon">🔺</span>
              <span>
                לכל קבוצה <b>שלט פירמידה</b> עם הלב בצבע שלה (דף לכל צבע) - מקפלים ומעמידים על השולחן.
              </span>
              <button type="button" className="hb-btn hb-btn-soft hb-class-tip-btn" onClick={openTeamSigns} data-testid="print-signs">
                🖨️ הדפסה
              </button>
            </li>
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
                {mode === 'local' ? (
                  <>
                    במטר מחיאות הכפיים המחשב יבקש רשות להשתמש במיקרופון - לוחצים <b>&quot;אישור&quot;</b>. אין מיקרופון? מקישים על מקש הרווח.
                  </>
                ) : (
                  <>
                    את מחיאות הכפיים שומע המיקרופון של המחשב - <b>או הטלפון שלך</b>: בשליטה מהטלפון לוחצים <b className="hb-nowrap">&quot;🎤 הטלפון מקשיב&quot;</b>.
                  </>
                )}
              </span>
            </li>
            <li>
              <span className="hb-class-tip-icon">📱</span>
              <span>
                {mode === 'local'
                  ? 'הכול עובד מהמחשב הזה. (השליטה מהטלפון צריכה חיבור לשרת המשחק, ואין חיבור כרגע.)'
                  : 'מקדמים את המשחק מהטלפון שלך (📱 שליטה מהטלפון) - שם רואים גם את המושגים הסודיים של הפנטומימה. אפשר לאפשר גם מהמחשב בתפריט ☰.'}
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default ClassLobby;
