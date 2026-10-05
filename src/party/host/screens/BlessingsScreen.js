import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAX_BLESSING_LENGTH } from '../../config/game';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import WordCloud, { downloadCloudPng, useCloudLayout } from '../../shared/WordCloud';
import { StageIntro } from './common';

export const souvenirTitle = (settings) => `💌 הברכות של ${settings.birthdayName}`;
export const souvenirSubtitle = (settings, classMode = false) =>
  `${settings.age ? `יום הולדת ${settings.age} · ` : ''}אוצר הלבבות - ${classMode ? 'מזכרת מהכיתה' : 'מזכרת מהערב'}`;

export const saveSouvenir = (items, settings, classMode = false) =>
  downloadCloudPng(items, {
    title: souvenirTitle(settings),
    subtitle: souvenirSubtitle(settings, classMode),
    // ASCII only: some browsers replace non-Latin download names with "download"
    fileName: `heart-bank-blessings-${new Date().toISOString().slice(0, 10)}.png`,
  });

// Class mode: the teacher types the words the teams chose (Enter sends).
const TeacherPad = ({ dispatch }) => {
  const [text, setText] = useState('');
  const input = useRef(null);
  const send = (e) => {
    e.preventDefault();
    if (text.trim()) dispatch({ type: 'classBlessing', text });
    setText('');
    if (input.current) input.current.focus();
  };
  return (
    <form className="hb-bless-pad" onSubmit={send}>
      <input
        ref={input}
        className="hb-bless-input"
        value={text}
        maxLength={MAX_BLESSING_LENGTH}
        placeholder="מילה של ברכה..."
        aria-label="מילה של ברכה"
        onChange={(e) => setText(e.target.value)}
        data-testid="bless-input"
      />
      <button type="submit" className="hb-btn hb-btn-primary" disabled={!text.trim()}>
        💌 לשלוח
      </button>
    </form>
  );
};

const BlessingsWall = ({ state, dispatch }) => {
  const { list, hidden } = state.blessings;
  const items = useCloudLayout(list, hidden);
  const latest = list.filter((b) => !hidden[b.id]).slice(-4).reverse();
  const name = state.settings.birthdayName;

  const toggleWord = (item) => {
    // eslint-disable-next-line no-alert
    if (window.confirm(`להסתיר את "${item.text}" מהענן?`)) item.ids.forEach((id) => dispatch({ type: 'hideBlessing', id }));
  };

  return (
    <div className="hb-bless">
      <div className="hb-bless-side">
        <GameTitle text={`מה אנחנו מאחלים ל${name}?`} className="hb-bless-title" />
        <p className="hb-bless-sub">
          {state.classMode ? 'כל קבוצה בוחרת מילה של ברכה - המורה מקלידה אותה, והיא עפה ישר ללב!' : 'כתבו בטלפון מילה אחת של ברכה - והיא תעוף ישר ללב!'}
        </p>
        {state.classMode && <TeacherPad dispatch={dispatch} />}
        <div className="hb-bless-count">
          <strong>{fmt(list.length)}</strong> ברכות נשלחו
        </div>
        <div className="hb-bless-feed">
          <AnimatePresence initial={false}>
            {latest.map((b) => (
              <motion.div
                key={b.id}
                layout
                className="hb-bless-item"
                initial={{ opacity: 0, x: 60, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                {state.players[b.pid] ? (
                  <>
                    <Avatar player={state.players[b.pid]} size="xs" />
                    <span className="hb-bless-item-name">{state.players[b.pid].name}:</span>
                  </>
                ) : (
                  <span className="hb-bless-item-icon">💌</span>
                )}
                <strong>{b.text}</strong>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {items.length > 0 && (
          <button type="button" className="hb-link-btn" onClick={() => saveSouvenir(items, state.settings, state.classMode)}>
            ⬇️ שמירת ענן הברכות כתמונה
          </button>
        )}
      </div>
      <div className="hb-bless-cloud">
        {items.length ? (
          <WordCloud items={items} onWordClick={toggleWord} />
        ) : (
          <div className="hb-bless-empty">
            <WordCloud items={[]} />
            <span>הלב מחכה לברכה הראשונה...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const BlessingsScreen = ({ state, dispatch }) => {
  if (state.step === 'intro') return <StageIntro state={state} />;
  return <BlessingsWall state={state} dispatch={dispatch} />;
};

export default BlessingsScreen;
