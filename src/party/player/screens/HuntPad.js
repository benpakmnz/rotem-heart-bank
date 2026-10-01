import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { heartKind } from '../../config/game';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import { GlossyHeart } from '../../shared/Heart';
import { phoneBurst } from '../../shared/fx';

// "ציידי הלבבות" on the phone: who found which heart, live.
const HuntPad = ({ state, me, players }) => {
  const hearts = Array.isArray(state.data.hearts) ? state.data.hearts : [];
  const mine = hearts.filter((h) => h.pid === me.id);
  const found = hearts.filter((h) => h.pid).length;
  const last = mine[mine.length - 1];

  const seen = useRef(mine.length);
  useEffect(() => {
    if (mine.length > seen.current) {
      phoneBurst();
      if (navigator.vibrate) navigator.vibrate([60, 60, 120]);
    }
    seen.current = mine.length;
  }, [mine.length]);

  return (
    <div className="hb-pad hb-hunt-pad">
      <motion.div className="hb-prep-icon" animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>
        🔎
      </motion.div>
      <h1 className="hb-phone-title">{found === hearts.length && hearts.length ? 'כל הלבבות נמצאו! 🎉' : 'חפשו את הלבבות בבית!'}</h1>
      {last ? (
        <motion.div key={last.id} className="hb-hunt-mine" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
          מצאת {heartKind(last.kind).label}! <b>+{fmt(last.points)}</b>
        </motion.div>
      ) : (
        <p className="hb-phone-text">מצאתם לב? הראו אותו למנהל/ת המשחק 🙋</p>
      )}
      <div className="hb-hunt-mini">
        {hearts.map((h) => {
          const k = heartKind(h.kind);
          const finder = h.pid && players[h.pid];
          return (
            <div key={h.id} className={`hb-hunt-mini-heart ${finder ? 'is-found' : ''} ${h.pid === me.id ? 'is-mine' : ''}`}>
              <span className="hb-hunt-mini-shape">
                <GlossyHeart from={k.colors[0]} to={k.colors[1]} />
                {finder ? <Avatar player={finder} size="xs" /> : <b>?</b>}
              </span>
              <span>{finder ? finder.name : k.short}</span>
            </div>
          );
        })}
      </div>
      <p className="hb-phone-hint">
        {found} מתוך {hearts.length} לבבות נמצאו
      </p>
    </div>
  );
};

export default HuntPad;
