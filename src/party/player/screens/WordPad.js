import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { fmt } from '../../lib/format';
import { joinByShape, normalizeWord, wordLetters } from '../../lib/text';
import { useRoomValue } from '../../net/hooks';
import { phoneBurst } from '../../shared/fx';
import { PhoneTimer } from './common';

const asArray = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);

// Scrambled letter tiles ("מקלדת אותיות מעוצבת") - build the word first!
const WordPad = ({ conn, state, me, players, now }) => {
  const { data } = state;
  const letters = asArray(data.letters);
  const shape = asArray(data.shape);
  const revealed = asArray(data.revealed);
  const answer = data.answer || '';
  const answerLetters = wordLetters(answer);
  const path = `inputs/${state.roundId}/${me.id}`;
  const mine = useRoomValue(conn, path);
  const solved = Boolean(mine && mine.solvedAt);
  const [slots, setSlots] = useState(() => letters.map(() => null)); // tile index per slot
  const [wrong, setWrong] = useState(false);
  const wrongTimer = useRef(null);

  useEffect(() => {
    setSlots(asArray(data.letters).map(() => null));
    setWrong(false);
  }, [state.roundId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(wrongTimer.current), []);
  useEffect(() => {
    if (state.step === 'outcome' && data.winnerId === me.id) phoneBurst();
  }, [state.step, data.winnerId, me.id]);

  if (state.step === 'outcome') {
    const winner = data.winnerId ? players[data.winnerId] : null;
    const iWon = data.winnerId === me.id;
    return (
      <div className={`hb-pad hb-verdict ${iWon ? 'is-good' : ''}`}>
        <div className="hb-verdict-icon">{iWon ? '🏆' : winner ? '👏' : '⏰'}</div>
        <h1 className="hb-phone-title">{iWon ? 'ניצחת בסיבוב הזה!' : winner ? `כל הכבוד ל${winner.name}!` : 'הזמן נגמר!'}</h1>
        <div className="hb-verdict-answer">
          <span>המילה:</span>
          <strong>{answer}</strong>
        </div>
        {iWon && <div className="hb-verdict-points">+{fmt(SCORING.wordFirst)} ❤️</div>}
      </div>
    );
  }

  const used = new Set(slots.filter((t) => t != null));
  const place = (tile) => {
    if (solved || used.has(tile) || wrong) return;
    const i = slots.indexOf(null);
    if (i < 0) return;
    const next = slots.slice();
    next[i] = tile;
    setSlots(next);
    if (navigator.vibrate) navigator.vibrate(10);
    if (next.every((t) => t != null)) {
      const attempt = joinByShape(
        next.map((t) => letters[t]),
        shape,
      );
      if (normalizeWord(attempt) === normalizeWord(answer)) {
        conn.set(path, { solvedAt: conn.serverNow(), attempt });
        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      } else {
        setWrong(true);
        if (navigator.vibrate) navigator.vibrate(120);
        wrongTimer.current = setTimeout(() => {
          setWrong(false);
          setSlots(letters.map(() => null));
        }, 700);
      }
    }
  };
  const unplace = (i) => {
    if (solved || wrong || slots[i] == null) return;
    const next = slots.slice();
    next[i] = null;
    setSlots(next);
  };

  let offset = 0;
  const longest = Math.max(1, ...shape);
  return (
    <div className="hb-pad hb-word-pad">
      <PhoneTimer endsAt={state.endsAt} now={now} total={state.endsAt - state.stepStartedAt} />
      <div className="hb-word-pad-hint">💡 {data.hint}</div>
      <div className="hb-word-pad-board">
        <div
          className={`hb-slots ${wrong ? 'is-wrong' : ''} ${solved ? 'is-solved' : ''}`}
          style={{ '--hb-slot-w': `min(3.6rem, calc((100vw - 2.5rem) / ${longest} - 0.4rem))` }}
        >
          {shape.map((len, w) => {
            const start = offset;
            offset += len;
            return (
              <div key={w} className="hb-slots-word">
                {Array.from({ length: len }, (_, k) => {
                  const i = start + k;
                  const tile = solved ? null : slots[i];
                  const ghost = revealed.includes(i) ? answerLetters[i] : '';
                  return (
                    <button key={i} type="button" className={`hb-slot ${tile != null ? 'is-full' : ''}`} onClick={() => unplace(i)}>
                      {solved ? answerLetters[i] : tile != null ? letters[tile] : <span className="hb-slot-ghost">{ghost}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {solved && (
          <motion.div className="hb-solved" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
            🎉 פיצחת! מחכים לראות מי היה הכי מהיר...
          </motion.div>
        )}
      </div>
      {!solved && (
        <>
          <div className="hb-tiles">
            {letters.map((l, t) => (
              <button
                key={t}
                type="button"
                className={`hb-tile ${used.has(t) ? 'is-used' : ''}`}
                onClick={() => place(t)}
                disabled={used.has(t)}
                data-testid={`tile-${t}`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="hb-btn hb-btn-soft"
            onClick={() => setSlots(letters.map(() => null))}
            disabled={!used.size || wrong}
          >
            ↺ מתחילים מחדש
          </button>
        </>
      )}
    </div>
  );
};

export default WordPad;
