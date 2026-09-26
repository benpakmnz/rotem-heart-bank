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
      <Heart color={ANSWER_COLORS[index]} />
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

const TriviaQuestion = ({ state, now }) => {
  const cur = state.trivia.current;
  const reveal = state.step === 'reveal' ? state.trivia.reveal : null;
  const reading = !reveal && now < cur.openAt;
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
    <div className={`hb-trivia ${reveal ? 'is-reveal' : ''}`}>
      <div className="hb-trivia-head">
        <span className="hb-chip">
          שאלה {cur.index + 1} מתוך {state.trivia.total}
        </span>
        {!reveal &&
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
      {reveal ? (
        <div className="hb-trivia-winners">
          {winners.length ? (
            winners.map((pid, i) => (
              <PlayerChip key={pid} player={state.players[pid]} className={i === 0 ? 'is-first' : ''}>
                {i === 0 && <span>⚡</span>}
                <b>+{fmt(reveal.results[pid].points)}</b>
              </PlayerChip>
            ))
          ) : (
            <span className="hb-muted">הפעם אף אחד לא צדק... בשאלה הבאה! 💪</span>
          )}
        </div>
      ) : (
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

const TriviaScreen = ({ state, now }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  if ((state.step === 'question' || state.step === 'reveal') && state.trivia.current) {
    return <TriviaQuestion state={state} now={now} />;
  }
  return (
    <StageResults state={state}>
      <TriviaSummary state={state} />
    </StageResults>
  );
};

export default TriviaScreen;
