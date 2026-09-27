import React from 'react';
import { motion } from 'framer-motion';
import { GlossyHeart } from './Heart';

// Throw slots: pending / in / missed.
const ThrowSlots = ({ throws = [], total }) => (
  <div className="hb-throws">
    {Array.from({ length: total }, (_, i) => {
      const t = throws[i];
      const state = t === true ? 'hit' : t === false ? 'miss' : i === throws.length ? 'next' : 'wait';
      return (
        <motion.span
          key={`${i}-${state}`}
          className={`hb-throw is-${state}`}
          initial={state === 'hit' || state === 'miss' ? { scale: 1.8, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12 }}
        >
          <GlossyHeart from={state === 'miss' ? '#C9C3D6' : '#FF9ED2'} to={state === 'miss' ? '#7A7190' : '#E0126A'} />
          <b>{state === 'hit' ? '✓' : state === 'miss' ? '✕' : i + 1}</b>
        </motion.span>
      );
    })}
  </div>
);

export default ThrowSlots;
