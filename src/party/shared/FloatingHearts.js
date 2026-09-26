import React, { useMemo } from 'react';
import { Heart } from './Heart';
import { createRng } from '../lib/random';

const COLORS = ['#FFB3C6', '#FF8FAB', '#FFC2D1', '#FFD6E0', '#FFE3A3'];

// Soft hearts drifting up behind everything + the big corner heart of the blueprint.
const FloatingHearts = ({ count = 14, className = '' }) => {
  const hearts = useMemo(() => {
    const rng = createRng(2026);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rng() * 100,
      size: 1.2 + rng() * 3.2,
      delay: -rng() * 30,
      duration: 18 + rng() * 22,
      sway: 2 + rng() * 5,
      color: COLORS[i % COLORS.length],
      opacity: 0.25 + rng() * 0.35,
    }));
  }, [count]);

  return (
    <div className={`hb-floating ${className}`} aria-hidden="true">
      <Heart className="hb-corner-heart" color="#FFE4EA" />
      {hearts.map((h) => (
        <span
          key={h.id}
          className="hb-floating-heart"
          style={{
            left: `${h.left}%`,
            fontSize: `${h.size}em`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            opacity: h.opacity,
            '--hb-sway': `${h.sway}em`,
          }}
        >
          <Heart color={h.color} />
        </span>
      ))}
    </div>
  );
};

export default FloatingHearts;
