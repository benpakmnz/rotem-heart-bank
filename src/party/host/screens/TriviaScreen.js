import React from 'react';
import { motion } from 'framer-motion';
import { ANSWER_COLORS } from '../../config/game';
import { playerIds } from '../../engine/engine';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import { Heart } from '../../shared/Heart';
import TimerRing from '../../shared/TimerRing';
import { PlayerChip, StageIntro, StageResults } from './common';

const OptionCard = ({ index, text, status, voters, players }) => (
  <motion.div
    className={`hb-option is-${status}`}
    style={{ '--hb-option': ANSWER_COLORS[index], '--hb-option-soft': `${ANSWER_COLORS[index]}59` }}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0, scale: status === 'correct' ? 1.04 : 1 }}
    transition={{ delay: 0.08 * index }}
  >
    <div className="hb-option-heart">
      <Heart color="#fff" />
      <span>{index + 1}</span>
    </div>
    <div className="hb-option-text">{text}</div>
    {status === 'correct' && <div className="hb-option-check">✓</div>}
    {voters && voters.length > 0 && (
      <div className="hb-option-voters">
        {voters.map((pid) => (
          <Avatar key={pid} player={players[pid]} size="xs" />
        ))}
      </div>
    )}
  </motion.div>
);

// Class mode, when the time is up: every team raises a colored card and the
// teacher marks it here (a second click clears it). Then "show the answer".
const ClassMarkPanel = ({ state, dispatch }) => {
  const cur = state.trivia.current;
  const ids = playerIds(state);
  const choiceOf = (pid) => (state.inputs[pid] && Number.isInteger(state.inputs[pid].choice) ? state.inputs[pid].choice : -1);
  const marked = ids.filter((pid) => choiceOf(pid) >= 0).length;
  return (
    <motion.div className="hb-mark hb-glass" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} data-testid="mark-panel">
      <div className="hb-mark-head">
        <strong>איזה כרטיס הרימה כל קבוצה?</strong>
        <span className="hb-count-pill">
          {marked}/{ids.length}
        </span>
        <span className="hb-mark-tip">לחיצה על הצבע שהקבוצה הרימה (לחיצה נוספת מבטלת)</span>
      </div>
      <div className="hb-mark-grid">
        {ids.map((pid) => {
          const choice = choiceOf(pid);
          const team = state.players[pid];
          return (
            <div key={pid} className={`hb-mark-team ${choice >= 0 ? 'is-marked' : ''}`}>
              <Avatar player={team} size="sm" />
              <span className="hb-mark-name">{team.name}</span>
              <div className="hb-mark-cards">
                {cur.options.map((opt, i) => (
                  <button
                    key={`${opt}-${i}`}
                    type="button"
                    className={`hb-mark-card ${choice === i ? 'is-on' : ''} ${choice >= 0 && choice !== i ? 'is-off' : ''}`}
                    style={{ '--hb-mark-color': ANSWER_COLORS[i] }}
                    aria-pressed={choice === i}
                    aria-label={`${team.name}: כרטיס ${i + 1}`}
                    onClick={(e) => {
                      dispatch({ type: 'classAnswer', pid, choice: choice === i ? -1 : i });
                      e.currentTarget.blur(); // Enter / Space stay the main button (show the answer)
                    }}
                    data-testid={`mark-${pid}-${i}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const TriviaQuestion = ({ state, now, dispatch }) => {
  const cur = state.trivia.current;
  const cls = Boolean(state.classMode);
  const reveal = state.step === 'reveal' ? state.trivia.reveal : null;
  const marking = cls && state.step === 'mark';
  const reading = !reveal && !marking && now < cur.openAt;
  const ids = playerIds(state);
  const answered = ids.filter((pid) => {
    const input = state.inputs[pid];
    return input && Number.isInteger(Number(input.choice)) && input.choice !== null;
  });

  const votersFor = (i) =>
    reveal ? Object.keys(reveal.results).filter((pid) => reveal.results[pid].choice === i && state.players[pid]) : null;

  const winners = reveal
    ? Object.keys(reveal.results)
        .filter((pid) => reveal.results[pid].correct && state.players[pid])
        .sort((a, b) => reveal.results[b].points - reveal.results[a].points)
    : [];

  return (
    <div className={`hb-trivia ${reveal ? 'is-reveal' : ''} ${marking ? 'is-mark' : ''}`}>
      <div className="hb-trivia-head">
        <span className="hb-chip">
          שאלה {cur.index + 1} מתוך {state.trivia.total}
        </span>
        {marking && (
          <motion.div className="hb-raise" initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 11 }}>
            ✋ מרימים כרטיסים!
          </motion.div>
        )}
        {!reveal &&
          !marking &&
          (reading ? (
            <TimerRing endsAt={cur.openAt} total={cur.openAt - state.stepStartedAt} now={now} label="מתכוננים" className="is-reading" />
          ) : (
            <TimerRing endsAt={cur.deadline} total={cur.deadline - cur.openAt} now={now} />
          ))}
      </div>
      <motion.div className="hb-trivia-q" key={cur.index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        {cur.q}
      </motion.div>
      <div className="hb-trivia-options">
        {cur.options.map((opt, i) => {
          let status = 'idle';
          if (reveal) status = i === reveal.correct ? 'correct' : 'wrong';
          return <OptionCard key={opt + i} index={i} text={opt} status={status} voters={votersFor(i)} players={state.players} />;
        })}
      </div>
      {marking && <ClassMarkPanel state={state} dispatch={dispatch} />}
      {reveal && (
        <div className="hb-trivia-winners">
          {winners.length ? (
            winners.map((pid, i) => (
              // (class mode: every team answers at the same moment - no "fastest")
              <PlayerChip key={pid} player={state.players[pid]} className={i === 0 && !cls ? 'is-first' : ''}>
                {i === 0 && !cls && <span>⚡</span>}
                <b>+{fmt(reveal.results[pid].points)}</b>
              </PlayerChip>
            ))
          ) : (
            <span className="hb-muted">{cls ? 'הפעם אף קבוצה לא צדקה... בשאלה הבאה! 💪' : 'הפעם אף אחד לא צדק... בשאלה הבאה! 💪'}</span>
          )}
        </div>
      )}
      {!reveal && !marking && cls && (
        <div className="hb-answered">
          <span className="hb-answered-label">
            {reading ? '📖 קוראים את השאלה ביחד...' : '🤫 מתייעצים בשקט ובוחרים כרטיס - כשהזמן נגמר, כולם מרימים ביחד!'}
          </span>
        </div>
      )}
      {!reveal && !marking && !cls && (
        <div className="hb-answered">
          <span className="hb-answered-label">
            {reading ? '📱 הכפתורים יופיעו בטלפון עוד רגע...' : `ענו: ${answered.length} מתוך ${ids.length}`}
          </span>
          <div className="hb-answered-avatars">
            {ids.map((pid) => (
              <Avatar
                key={pid}
                player={state.players[pid]}
                size="xs"
                className={answered.includes(pid) ? 'is-answered' : 'is-waiting'}
                badge={answered.includes(pid) ? '✓' : null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TriviaSummary = ({ state }) => {
  const counts = state.trivia.correctCounts || {};
  const ids = playerIds(state).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  return (
    <div className="hb-trivia-summary">
      <h2>✅ כמה תשובות נכונות?</h2>
      <div className="hb-chip-cloud">
        {ids.map((pid, i) => (
          <PlayerChip key={pid} player={state.players[pid]} className={i === 0 && counts[pid] ? 'is-first' : ''}>
            <b>
              {counts[pid] || 0}/{state.trivia.total}
            </b>
          </PlayerChip>
        ))}
      </div>
    </div>
  );
};

const TriviaScreen = ({ state, now, dispatch }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  if (['question', 'mark', 'reveal'].includes(state.step) && state.trivia.current) {
    return <TriviaQuestion state={state} now={now} dispatch={dispatch} />;
  }
  return (
    <StageResults state={state}>
      <TriviaSummary state={state} />
    </StageResults>
  );
};

export default TriviaScreen;
