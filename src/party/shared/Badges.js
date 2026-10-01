import React from 'react';
import { heartKind } from '../config/game';
import { GlossyHeart } from './Heart';

// One badge: a found heart in its color.
export const HeartBadge = ({ kind, className = '' }) => {
  const k = heartKind(kind);
  return (
    <span className={`hb-badge hb-badge-${kind} ${className}`} title={k.label}>
      <GlossyHeart from={k.colors[0]} to={k.colors[1]} />
    </span>
  );
};

// A player's badges in a row (nothing when there are none).
const Badges = ({ list, className = '' }) =>
  list && list.length ? (
    <span className={`hb-badges ${className}`}>
      {list.map((kind, i) => (
        <HeartBadge key={`${kind}-${i}`} kind={kind} />
      ))}
    </span>
  ) : null;

export default Badges;
