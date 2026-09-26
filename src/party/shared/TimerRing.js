import React from 'react';

const R = 44;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Circular countdown. `total` is the full duration in ms.
const TimerRing = ({ endsAt, total, now, label, className = '' }) => {
  const left = Math.max(0, (endsAt || 0) - now);
  const seconds = Math.ceil(left / 1000);
  const fraction = total > 0 ? Math.min(1, left / total) : 0;
  return (
    <div className={`hb-timer ${seconds <= 5 && seconds > 0 ? 'is-urgent' : ''} ${className}`} role="timer" aria-live="off">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="hb-timer-track" />
        <circle
          cx="50"
          cy="50"
          r={R}
          className="hb-timer-bar"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="hb-timer-num">{seconds}</span>
      {label && <span className="hb-timer-label">{label}</span>}
    </div>
  );
};

export default TimerRing;
