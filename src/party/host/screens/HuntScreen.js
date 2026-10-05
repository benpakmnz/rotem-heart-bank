import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HEART_KINDS, heartKind } from '../../config/game';
import { playerIds } from '../../engine/engine';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import { GlossyHeart } from '../../shared/Heart';
import PlayerPicker from '../../shared/PlayerPicker';
import TimerRing from '../../shared/TimerRing';
import { StageIntro, StageResults } from './common';

// One hidden heart: a glowing "?" until someone finds it, then the finder.
export const HuntHeart = ({ heart, finder, onClick, size = 'md' }) => {
  const k = heartKind(heart.kind);
  const found = Boolean(finder);
  return (
    <motion.button
      type="button"
      className={`hb-hunt-heart hb-hunt-${heart.kind} hb-hunt-${size} ${found ? 'is-found' : ''}`}
      onClick={onClick}
      disabled={!onClick}
      layout
      animate={found ? { scale: [1, 1.25, 1], rotate: [0, -8, 6, 0] } : { scale: 1 }}
      transition={{ duration: 0.7 }}
      data-testid={`heart-${heart.id}`}
    >
      <span className="hb-hunt-shape">
        <GlossyHeart from={k.colors[0]} to={k.colors[1]} />
        {!found && <span className="hb-hunt-q">?</span>}
        {found && (
          <motion.span className="hb-hunt-finder" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
            <Avatar player={finder} size={size === 'lg' ? 'lg' : 'sm'} />
          </motion.span>
        )}
      </span>
      <span className="hb-hunt-label">{k.label}</span>
      <span className="hb-hunt-points">{found ? finder.name : `${fmt(heart.points)} לבבות`}</span>
    </motion.button>
  );
};

// The latest find, announced in big letters.
const LatestFind = ({ state }) => {
  const { hearts, found } = state.hunt;
  const last = Object.keys(found).sort((a, b) => found[b].at - found[a].at)[0];
  const heart = last && hearts.find((h) => h.id === last);
  const player = heart && state.players[found[last].pid];
  return (
    <div className="hb-hunt-latest">
      <AnimatePresence mode="wait">
        {player ? (
          <motion.div
            key={last + found[last].pid}
            className="hb-hunt-latest-card"
            initial={{ scale: 0.3, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            <Avatar player={player} size="sm" />
            <span>
              🎉 <b>{player.name}</b> {state.classMode ? 'מצאו' : 'מצא/ה'} {heartKind(heart.kind).label}! <b className="hb-hunt-latest-points">+{fmt(heart.points)}</b>
            </span>
          </motion.div>
        ) : (
          <motion.div key="none" className="hb-hunt-latest-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {state.classMode ? 'מצאתם לב? הביאו אותו למורה 🙋' : 'מצאתם לב? הראו אותו למנהל/ת המשחק 🙋'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HuntBoard = ({ state, now, dispatch }) => {
  const [picking, setPicking] = useState(null);
  const { hearts, found } = state.hunt;
  const count = Object.keys(found).length;
  const all = count === hearts.length && hearts.length > 0;
  const timeUp = state.endsAt && now >= state.endsAt;
  const pickingHeart = picking && hearts.find((h) => h.id === picking);

  return (
    <div className="hb-hunt">
      <div className="hb-hunt-head">
        <GameTitle text={all ? 'כל הלבבות נמצאו!' : 'חפשו את הלבבות!'} tone={all ? 'gold' : 'pink'} className="hb-hunt-title" />
        <div className="hb-hunt-status">
          {state.endsAt && !timeUp ? (
            <TimerRing endsAt={state.endsAt} total={state.endsAt - state.stepStartedAt} now={now} />
          ) : null}
          {timeUp && !all ? <span className="hb-chip hb-chip-gold">⏰ נגמר הזמן!</span> : null}
          <span className="hb-hunt-count">
            <b>{count}</b> / {hearts.length} נמצאו
          </span>
        </div>
      </div>
      <div className="hb-hunt-board">
        {hearts.map((h) => (
          <HuntHeart
            key={h.id}
            heart={h}
            size={h.kind === HEART_KINDS[0].id ? 'lg' : 'md'}
            finder={found[h.id] ? state.players[found[h.id].pid] : null}
            onClick={() => setPicking(h.id)}
          />
        ))}
      </div>
      <LatestFind state={state} />
      {pickingHeart && (
        <PlayerPicker
          title={state.classMode ? `איזו קבוצה מצאה את ${heartKind(pickingHeart.kind).the}?` : `מי מצא את ${heartKind(pickingHeart.kind).the}?`}
          players={state.players}
          ids={playerIds(state)}
          selected={found[picking] ? found[picking].pid : null}
          onPick={(pid) => {
            dispatch({ type: 'huntAssign', heartId: picking, pid });
            setPicking(null);
          }}
          onClear={() => {
            dispatch({ type: 'huntAssign', heartId: picking, pid: null });
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
};

const HuntSummary = ({ state }) => {
  const { hearts, found } = state.hunt;
  return (
    <div className="hb-hunt-summary">
      {hearts.map((h) => {
        const player = found[h.id] && state.players[found[h.id].pid];
        return (
          <div key={h.id} className={`hb-hunt-summary-row ${player ? 'is-found' : ''}`}>
            <span className="hb-hunt-summary-heart">
              <GlossyHeart from={heartKind(h.kind).colors[0]} to={heartKind(h.kind).colors[1]} />
            </span>
            <span className="hb-hunt-summary-kind">{heartKind(h.kind).label}</span>
            {player ? (
              <span className="hb-player-chip">
                <Avatar player={player} size="xs" />
                <span>{player.name}</span>
                <b>+{fmt(h.points)}</b>
              </span>
            ) : (
              <span className="hb-muted">עדיין מחכה במחבוא... 🙈</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const HuntScreen = ({ state, now, dispatch }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  if (state.step === 'search') return <HuntBoard state={state} now={now} dispatch={dispatch} />;
  return (
    <StageResults state={state}>
      <HuntSummary state={state} />
    </StageResults>
  );
};

export default HuntScreen;
