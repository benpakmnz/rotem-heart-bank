import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import ThrowSlots from '../../shared/ThrowSlots';
import { phoneBurst } from '../../shared/fx';

// "קליעה ללב" on the phone: whose turn it is and how the throws went.
const BasketPad = ({ state, me, players }) => {
  const d = state.data;
  const order = Array.isArray(d.order) ? d.order : [];
  const thrower = d.thrower;
  const throws = (d.throws && d.throws[thrower]) || [];
  const isMe = thrower === me.id;
  const nextUp = order.slice((d.turn || 0) + 1).find((id) => players[id]);
  const hits = throws.filter(Boolean).length;
  const perfect = Array.isArray(d.perfect) && d.perfect.includes(me.id);

  const seen = useRef(hits);
  useEffect(() => {
    if (isMe && hits > seen.current && navigator.vibrate) navigator.vibrate(40);
    seen.current = hits;
  }, [hits, isMe]);
  useEffect(() => {
    if (perfect) phoneBurst();
  }, [perfect]);

  const player = players[thrower];
  return (
    <div className="hb-pad hb-basket-pad">
      <motion.div key={thrower} initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
        <Avatar player={player || me} size="xl" />
      </motion.div>
      <h1 className="hb-phone-title">{isMe ? 'התור שלך לזרוק! 🧺' : `${player ? player.name : ''} זורק/ת עכשיו`}</h1>
      <ThrowSlots throws={throws} total={d.perPlayer || 3} />
      {isMe ? (
        <p className="hb-phone-text">
          זרקו {d.perPlayer} לבבות לסל - כל קליעה {fmt(d.hitPoints)} לבבות{d.perfectBonus ? `, והכל נכנס? +${fmt(d.perfectBonus)}!` : ''}
        </p>
      ) : (
        <p className="hb-phone-text">{nextUp === me.id ? 'את/ה הבא/ה בתור - תתכוננו! 🔜' : 'תעודדו בקול! 📣'}</p>
      )}
      {perfect && <div className="hb-hunt-mine">🎯 קלע/ית מושלם/ת!</div>}
    </div>
  );
};

export default BasketPad;
