import React from 'react';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { fmt, secondsLeft } from '../../lib/format';
import { wordLetters } from '../../lib/text';
import Avatar from '../../shared/Avatar';
import TimerRing from '../../shared/TimerRing';
import { BigCountdown, PlayerChip, StageIntro, StageResults } from './common';

// Empty boxes on the TV; hint letters pop in over time, the whole word at the end.
export const LetterBoxes = ({ shape, letters, visible, solved }) => {
  let offset = 0;
  const longest = Math.max(1, ...shape);
  return (
    <div className="hb-boxes" style={{ '--hb-box-w': `${Math.min(8, 76 / longest)}em` }}>
      {shape.map((len, w) => {
        const start = offset;
        offset += len;
        return (
          <div key={w} className="hb-boxes-word">
            {Array.from({ length: len }, (_, k) => {
              const i = start + k;
              const show = solved || visible.includes(i);
              return (
                <motion.div
                  key={i}
                  className={`hb-box ${show ? 'is-filled' : ''} ${solved ? 'is-solved' : ''}`}
                  animate={show ? { rotateY: [90, 0], scale: [0.8, 1] } : {}}
                  transition={{ delay: solved ? 0.08 * i : 0, duration: 0.45 }}
                >
                  {show ? <span className="hb-box-letter">{letters[i]}</span> : ''}
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const WordRound = ({ state, now }) => {
  const cur = state.word.current;
  const letters = wordLetters(cur.answer);
  const visible = cur.revealOrder.slice(0, cur.revealed);
  const seconds = Number(state.settings.timings.wordSeconds) || 90;
  const every = Number(state.settings.timings.wordRevealEverySeconds) || 0;
  const nextHintIn =
    state.step === 'play' && every && cur.revealed < cur.maxReveal
      ? secondsLeft(cur.startedAt + (cur.revealed + 1) * every * 1000, now)
      : 0;
  const winner = cur.winnerId && state.players[cur.winnerId];
  const label = `מילה ${cur.index + 1} מתוך ${state.word.total}`;

  if (state.step === 'countdown') {
    return <BigCountdown endsAt={state.endsAt} now={now} caption={`🔤 ${label} - מוכנים לפצח?`} />;
  }

  return (
    <div className="hb-word">
      <div className="hb-word-head">
        <span className="hb-chip">{label}</span>
        {state.step === 'play' && <TimerRing endsAt={state.endsAt} total={seconds * 1000} now={now} />}
      </div>
      <div className="hb-word-hint">
        <span className="hb-word-hint-label">💡 רמז:</span> {cur.hint || '...'}
      </div>
      <LetterBoxes shape={cur.shape} letters={letters} visible={visible} solved={state.step === 'outcome'} />
      {state.step === 'play' ? (
        <div className="hb-word-foot">
          <span>📱 סדרו את האותיות בטלפון - הראשון שמפצח מקבל {fmt(SCORING.wordFirst)} לבבות!</span>
          {nextHintIn > 0 && <span className="hb-chip hb-chip-soft">רמז נוסף בעוד {nextHintIn} שניות</span>}
        </div>
      ) : (
        <motion.div className="hb-word-outcome" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          {winner ? (
            <>
              <Avatar player={winner} size="xl" />
              <div>
                <div className="hb-word-winner">🏆 כל הכבוד ל{winner.name}!</div>
                <div className="hb-word-prize">פיצוח ראשון: +{fmt(SCORING.wordFirst)} לבבות</div>
              </div>
            </>
          ) : (
            <div className="hb-word-winner is-soft">⏰ הפעם אף אחד לא הספיק - הנה המילה!</div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const WordScreen = ({ state, now }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  if (state.step === 'results' || !state.word.current) {
    return (
      <StageResults state={state}>
        <div className="hb-word-summary">
          {state.word.results.map((r) => (
            <div key={r.index} className="hb-word-summary-row">
              <strong>{r.answer}</strong>
              {r.winnerId && state.players[r.winnerId] ? (
                <PlayerChip player={state.players[r.winnerId]}>
                  <b>+{fmt(SCORING.wordFirst)}</b>
                </PlayerChip>
              ) : (
                <span className="hb-muted">לא פוצחה</span>
              )}
            </div>
          ))}
        </div>
      </StageResults>
    );
  }
  return <WordRound state={state} now={now} />;
};

export default WordScreen;
