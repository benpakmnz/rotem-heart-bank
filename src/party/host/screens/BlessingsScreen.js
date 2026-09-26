import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import WordCloud, { downloadCloudPng, useCloudLayout } from '../../shared/WordCloud';
import { StageIntro } from './common';

export const souvenirTitle = (settings) => `💌 הברכות של ${settings.birthdayName}`;
export const souvenirSubtitle = (settings) =>
  `${settings.age ? `יום הולדת ${settings.age} · ` : ''}בנק הלבבות - מזכרת מהערב`;

export const saveSouvenir = (items, settings) =>
  downloadCloudPng(items, {
    title: souvenirTitle(settings),
    subtitle: souvenirSubtitle(settings),
    // ASCII only: some browsers replace non-Latin download names with "download"
    fileName: `heart-bank-blessings-${new Date().toISOString().slice(0, 10)}.png`,
  });

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
        <h1 className="hb-bless-title">💌 מה אנחנו מאחלים ל{name}?</h1>
        <p className="hb-bless-sub">כתבו בטלפון מילה אחת של ברכה - והיא תעוף ישר ללב!</p>
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
                <Avatar player={state.players[b.pid]} size="xs" />
                <span className="hb-bless-item-name">{state.players[b.pid] ? state.players[b.pid].name : ''}:</span>
                <strong>{b.text}</strong>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {items.length > 0 && (
          <button type="button" className="hb-link-btn" onClick={() => saveSouvenir(items, state.settings)}>
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
