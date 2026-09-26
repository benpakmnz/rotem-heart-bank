import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAX_BLESSING_LENGTH } from '../../config/game';
import { cleanText } from '../../lib/text';
import { randomId } from '../../lib/random';
import { useRoomValue } from '../../net/hooks';

// "כל אחד כותב בטלפון מילה אחת שמאחלים לרותם" - it flies to the TV's heart.
const BlessingPad = ({ conn, state, me }) => {
  const path = `inputs/blessings/${me.id}`;
  const mine = useRoomValue(conn, path);
  const [text, setText] = useState('');
  const [flying, setFlying] = useState(null);
  const sent = mine ? Object.values(mine).filter((b) => b && b.text) : [];
  const max = Number(state.data.max) || 1;
  const left = Math.max(0, max - sent.length);
  const suggestions = (Array.isArray(state.data.suggestions) ? state.data.suggestions : []).filter(
    (s) => !sent.some((b) => b.text === s)
  );
  const clean = cleanText(text, MAX_BLESSING_LENGTH);

  const send = (value) => {
    const word = cleanText(value, MAX_BLESSING_LENGTH);
    if (!word || left <= 0) return;
    conn.set(`${path}/${randomId(8)}`, { text: word, at: conn.serverNow() });
    setText('');
    setFlying({ id: Date.now(), word });
    if (navigator.vibrate) navigator.vibrate(30);
  };

  return (
    <div className="hb-pad hb-bless-pad">
      <AnimatePresence>
        {flying && (
          <motion.div
            key={flying.id}
            className="hb-flying-word"
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -500, opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.2, ease: 'easeIn' }}
            onAnimationComplete={() => setFlying(null)}
          >
            💌 {flying.word}
          </motion.div>
        )}
      </AnimatePresence>
      <h1 className="hb-phone-title">💌 מה אתם מאחלים ל{state.name}?</h1>
      {left > 0 ? (
        <>
          <p className="hb-phone-text">
            כתבו מילה אחת של ברכה {max > 1 ? `(אפשר עוד ${left})` : ''}
          </p>
          <form
            className="hb-bless-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input
              className="hb-input hb-bless-input"
              value={text}
              maxLength={MAX_BLESSING_LENGTH}
              onChange={(e) => setText(e.target.value)}
              placeholder="למשל: שמחה"
              enterKeyHint="send"
              aria-label="הברכה שלי"
            />
            <button type="submit" className="hb-btn hb-btn-primary hb-btn-block hb-btn-xl" disabled={!clean}>
              💌 שליחה ללב
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="hb-suggestions">
              <span className="hb-phone-hint">או בחרו מילה:</span>
              <div className="hb-suggestion-list">
                {suggestions.slice(0, 10).map((s) => (
                  <button key={s} type="button" className="hb-suggestion" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="hb-bless-done">
          <div className="hb-verdict-icon">💖</div>
          <p className="hb-phone-text">תודה! הברכות שלך כבר בלב בטלוויזיה 📺</p>
        </div>
      )}
      {sent.length > 0 && (
        <div className="hb-bless-sent">
          {sent.map((b) => (
            <span key={`${b.text}-${b.at}`} className="hb-chip hb-chip-soft">
              {b.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlessingPad;
