import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ANSWER_COLORS } from '../../config/game';
import { fmt, secondsLeft } from '../../lib/format';
import { useRoomValue } from '../../net/hooks';
import { Heart } from '../../shared/Heart';
import { phoneBurst } from '../../shared/fx';
import { LookAtTv, PhoneTimer } from './common';

const Reveal = ({ data, me }) => {
  const result = data.reveal && data.reveal.results ? data.reveal.results[me.id] : null;
  const correct = data.reveal ? data.reveal.correct : -1;
  const celebrated = useRef(false);
  useEffect(() => {
    if (result && result.correct && !celebrated.current) {
      celebrated.current = true;
      phoneBurst();
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    }
  }, [result]);

  if (result && result.correct) {
    return (
      <div className="hb-pad hb-verdict is-good">
        <motion.div className="hb-verdict-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          ✅
        </motion.div>
        <h1 className="hb-phone-title">נכון!</h1>
        <div className="hb-verdict-points">+{fmt(result.points)} ❤️</div>
      </div>
    );
  }
  return (
    <div className="hb-pad hb-verdict">
      <div className="hb-verdict-icon">{result ? '🙈' : '⏰'}</div>
      <h1 className="hb-phone-title">{result ? 'לא הפעם...' : 'לא הספקת לענות'}</h1>
      {correct >= 0 && (
        <div className="hb-verdict-answer" style={{ '--hb-option': ANSWER_COLORS[correct] }}>
          <span>התשובה הנכונה:</span>
          <strong>{data.options[correct]}</strong>
        </div>
      )}
    </div>
  );
};

// Question on the TV, four big colorful heart buttons here.
const TriviaPad = ({ conn, state, me, now }) => {
  const { data } = state;
  const path = `inputs/${state.roundId}/${me.id}`;
  const mine = useRoomValue(conn, path);

  if (state.step === 'reveal') return <Reveal data={data} me={me} />;
  if (!data || !data.options) return <LookAtTv />;

  const chosen = mine && mine.choice != null ? Number(mine.choice) : -1;
  const reading = now < data.openAt;
  const timeUp = now > data.deadline;

  const answer = (i) => {
    if (chosen >= 0 || conn.serverNow() > data.deadline) return;
    conn.set(path, { choice: i, at: conn.serverNow() });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div className="hb-pad hb-trivia-pad">
      <div className="hb-trivia-pad-q">
        <span className="hb-trivia-pad-num">
          שאלה {data.index + 1}/{data.total}
        </span>
        {data.q}
      </div>
      {reading && (
        <LookAtTv>
          <p className="hb-phone-text">קוראים את השאלה... הכפתורים נפתחים בעוד {secondsLeft(data.openAt, now)}</p>
        </LookAtTv>
      )}
      {!reading && chosen < 0 && !timeUp && (
        <>
          <PhoneTimer endsAt={data.deadline} now={now} total={data.deadline - data.openAt} />
          <div className="hb-answers">
            {data.options.map((opt, i) => (
              <motion.button
                key={opt + i}
                type="button"
                className="hb-answer"
                style={{ '--hb-option': ANSWER_COLORS[i] }}
                onClick={() => answer(i)}
                whileTap={{ scale: 0.92 }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`answer-${i}`}
              >
                <span className="hb-answer-heart">
                  <Heart color="rgba(255,255,255,0.95)" />
                  <b>{i + 1}</b>
                </span>
                <span className="hb-answer-text">{opt}</span>
              </motion.button>
            ))}
          </div>
        </>
      )}
      {chosen >= 0 && (
        <div className="hb-answered-card" style={{ '--hb-option': ANSWER_COLORS[chosen] }}>
          <div className="hb-answered-check">✔️ התשובה נשלחה!</div>
          <div className="hb-answered-choice">
            <Heart color={ANSWER_COLORS[chosen]} className="hb-answered-heart" /> {data.options[chosen]}
          </div>
          <p className="hb-phone-hint">מחכים לכולם... התשובה תיחשף בטלוויזיה</p>
        </div>
      )}
      {chosen < 0 && timeUp && <LookAtTv><p className="hb-phone-text">⏰ הזמן נגמר!</p></LookAtTv>}
    </div>
  );
};

export default TriviaPad;
