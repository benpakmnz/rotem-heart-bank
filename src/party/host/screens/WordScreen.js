import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { playerIds } from '../../engine/engine';
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

// Class mode: the scrambled letters for everyone to see (the ones already
// shown as hints fade out).
const LetterTiles = ({ letters, hints }) => {
  const used = new Set();
  hints.forEach((letter) => {
    const i = letters.findIndex((l, k) => l === letter && !used.has(k));
    if (i >= 0) used.add(i);
  });
  return (
    <div className="hb-word-tiles" aria-label="האותיות המבולבלות">
      {letters.map((l, i) => (
        <motion.span
          key={i}
          className={`hb-word-tile ${used.has(i) ? 'is-used' : ''}`}
          initial={{ y: -40, opacity: 0, rotate: (i % 2 ? 1 : -1) * 20 }}
          animate={{ y: 0, opacity: 1, rotate: (i % 3) - 1 }}
          transition={{ delay: 0.05 * i, type: 'spring', stiffness: 260, damping: 14 }}
        >
          {l}
        </motion.span>
      ))}
    </div>
  );
};

const ARM_MS = 4000;

// Class mode: the teacher clicks the team that called out the word first -
// and once more to confirm (a slip of the mouse doesn't give the word away).
const SolvePicker = ({ state, dispatch }) => {
  const [armed, setArmed] = useState(null);
  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <div className="hb-solve" data-testid="solve-picker">
      <span className="hb-solve-label">✋ פיצחתם? מרימים יד וקוראים בקול! איזו קבוצה פיצחה ראשונה?</span>
      <div className="hb-solve-teams">
        {playerIds(state).map((pid) => {
          const team = state.players[pid];
          const isArmed = armed === pid;
          return (
            <button
              key={pid}
              type="button"
              className={`hb-solve-team ${isArmed ? 'is-armed' : ''}`}
              onClick={(e) => {
                e.currentTarget.blur();
                if (isArmed) dispatch({ type: 'classSolve', pid });
                else setArmed(pid);
              }}
              data-testid={`solve-${pid}`}
            >
              <Avatar player={team} size="xs" />
              <span>{isArmed ? `${team.name} - לאישור לוחצים שוב ✔` : team.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WordRound = ({ state, now, dispatch }) => {
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
      {state.step === 'play' && state.classMode && <LetterTiles letters={cur.letters} hints={visible.map((i) => letters[i])} />}
      {state.step === 'play' ? (
        <div className="hb-word-foot">
          {state.classMode ? (
            <SolvePicker state={state} dispatch={dispatch} />
          ) : (
            <span>📱 סדרו את האותיות בטלפון - הראשון שמפצח מקבל {fmt(SCORING.wordFirst)} לבבות!</span>
          )}
          {nextHintIn > 0 && <span className="hb-chip hb-chip-soft">רמז נוסף בעוד {nextHintIn} שניות</span>}
        </div>
      ) : (
        <motion.div className="hb-word-outcome" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          {winner ? (
            <>
              <Avatar player={winner} size="xl" />
              <div>
                <div className="hb-word-winner">{state.classMode ? `🏆 כל הכבוד, ${winner.name}!` : `🏆 כל הכבוד ל${winner.name}!`}</div>
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

const WordScreen = ({ state, now, dispatch }) => {
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
  return <WordRound state={state} now={now} dispatch={dispatch} />;
};

export default WordScreen;
