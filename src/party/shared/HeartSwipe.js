import React, { useEffect, useRef, useState } from 'react';
import { GlossyHeart } from './Heart';
import { createRng } from '../lib/random';

const COLORS = [
  ['#FF9ED2', '#E0126A'],
  ['#FFE9A0', '#F5A800'],
  ['#D6B4FF', '#7B2FF7'],
  ['#FFB8D9', '#FF4D94'],
];

const HEARTS = (() => {
  const rng = createRng(11);
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    top: -18 + (i % 8) * 14 + rng() * 6,
    size: 26 + rng() * 22,
    delay: (i % 8) * 0.035 + Math.floor(i / 8) * 0.12 + rng() * 0.05,
    spin: (rng() - 0.5) * 60,
    colors: COLORS[i % COLORS.length],
  }));
})();

const DURATION_MS = 1500;

// A wave of big hearts sweeps across the screen whenever `stage` changes
// (only the sound in lite mode: 16 big glowing layers are a lot for a TV).
const HeartSwipe = ({ stage, onSwipe, lite = false }) => {
  const [run, setRun] = useState(0);
  const last = useRef(stage);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  useEffect(() => {
    if (stage === last.current) return undefined;
    last.current = stage;
    if (onSwipeRef.current) onSwipeRef.current();
    if (lite) return undefined;
    setRun((n) => n + 1);
    const id = setTimeout(() => setRun(0), DURATION_MS);
    return () => clearTimeout(id);
  }, [stage, lite]);

  if (!run) return null;
  return (
    <div className="hb-swipe" key={run} aria-hidden="true">
      {HEARTS.map((h) => (
        <span
          key={h.id}
          className="hb-swipe-heart"
          style={{ top: `${h.top}%`, width: `${h.size}vmin`, height: `${h.size * 0.92}vmin`, animationDelay: `${h.delay}s`, '--hb-spin': `${h.spin}deg` }}
        >
          <GlossyHeart from={h.colors[0]} to={h.colors[1]} />
        </span>
      ))}
    </div>
  );
};

export default HeartSwipe;
