import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { fmt } from '../../lib/format';
import { phoneBurst } from '../../shared/fx';
import { myRank } from './common';

const FinalePad = ({ state, players, me }) => {
  const celebrating = state.step === 'celebrate';
  const winners = Array.isArray(state.data.winners) ? state.data.winners : [];
  const iWon = winners.includes(me.id);
  const { rank, of } = myRank(state, players, me.id);
  const score = (state.scores && state.scores[me.id]) || 0;

  useEffect(() => {
    if (!celebrating) return undefined;
    phoneBurst();
    const id = setInterval(phoneBurst, 2500);
    if (navigator.vibrate) navigator.vibrate([60, 80, 60, 80, 120]);
    return () => clearInterval(id);
  }, [celebrating]);

  if (!celebrating) {
    return (
      <div className="hb-pad hb-finale-pad">
        <motion.div className="hb-prep-icon" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
          💖
        </motion.div>
        <h1 className="hb-phone-title">הבנק מתמלא...</h1>
        <p className="hb-phone-text">הסתכלו בטלוויזיה! 📺</p>
      </div>
    );
  }

  return (
    <div className="hb-pad hb-finale-pad is-celebrating">
      <motion.h1 className="hb-finale-pad-title" initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
        100% אהבה!
      </motion.h1>
      <p className="hb-phone-text">הבנק מלא - {state.name} מוכנה לעוגה! 🎂</p>
      {iWon && <div className="hb-finale-pad-win">🏆 במקום הראשון!</div>}
      <div className="hb-done-score">
        <span>אספת ל{state.name}</span>
        <strong>{fmt(score)} ❤️</strong>
      </div>
      {rank > 0 && !iWon && (
        <div className="hb-done-rank">
          מקום {rank} מתוך {of}
        </div>
      )}
      <p className="hb-phone-hint">תודה ששיחקתם! 💕</p>
    </div>
  );
};

export default FinalePad;
