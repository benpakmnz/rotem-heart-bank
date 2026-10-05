import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameTitle from '../shared/GameTitle';
import RotemPhoto from '../shared/RotemPhoto';
import PartyBackdrop from '../shared/PartyBackdrop';
import { Heart, HEART_PATH } from '../shared/Heart';
import useWakeLock from '../shared/useWakeLock';
import { initialLiteFx } from '../lib/effects';
import { createRng } from '../lib/random';
import { loadSettings, settingsKeyFor } from './settingsStore';
import Castle from './Castle';
import './saver.css';

// Birthday wishes that take turns under the title (after "happy birthday").
const WISHES = ['מלכת הלבבות שלנו 👑', 'אוהבים אותך המון ❤️', 'שתהיה לך שנה מתוקה 🍭', 'מאחלים לך הרבה שמחה ואהבה 💖', 'מזל טוב! 🎉'];
const WISH_MS = 6500;
const HINT_MS = 3000;

const FLAG_COLORS = ['#FF4D94', '#FFC53D', '#9B5DE5', '#4CC9F0', '#FF9FCB'];
const CONFETTI_COLORS = ['#FF4D94', '#FFC53D', '#FFFFFF', '#9B5DE5', '#4CC9F0', '#FF9FCB'];

// Bunting across the top: two swags of flags from the corners to the middle
// (the middle stays high, above the crown).
const Garland = () => {
  const flags = useMemo(() => {
    const swags = [
      [[0, 8], [400, 120], [800, 8]],
      [[800, 8], [1200, 120], [1600, 8]],
    ];
    const out = [];
    swags.forEach(([p0, p1, p2], s) => {
      for (let i = 0; i < 9; i += 1) {
        const t = 0.06 + (i / 8) * 0.84;
        const at = (k) => (1 - t) ** 2 * p0[k] + 2 * (1 - t) * t * p1[k] + t ** 2 * p2[k];
        const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
        const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
        const n = s * 9 + i;
        out.push({ id: n, x: at(0), y: at(1), angle: (Math.atan2(dy, dx) * 180) / Math.PI, color: FLAG_COLORS[n % FLAG_COLORS.length], heart: n % 2 === 1 });
      }
    });
    return out;
  }, []);
  return (
    <svg className="hb-saver-garland" viewBox="0 0 1600 130" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <path d="M0 8 Q 400 120 800 8 Q 1200 120 1600 8" fill="none" stroke="rgba(255, 240, 250, 0.75)" strokeWidth="3" />
      {flags.map((f) => (
        <g key={f.id} transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.angle.toFixed(1)})`}>
          <path d="M-25 0 L 25 0 L 0 56 Z" fill={f.color} />
          <path d="M-25 0 L 0 0 L 0 56 Z" fill="rgba(255, 255, 255, 0.18)" />
          {f.heart && <path d={HEART_PATH} fill="#fff" opacity="0.9" transform="translate(-7 14) scale(0.14)" />}
        </g>
      ))}
    </svg>
  );
};

// Slow confetti falling behind everything (a few small bits in lite effects).
const Confetti = ({ lite }) => {
  const bits = useMemo(() => {
    const rng = createRng(17);
    return Array.from({ length: lite ? 12 : 26 }, (_, i) => ({
      id: i,
      left: rng() * 100,
      size: 0.5 + rng() * 0.7,
      duration: (lite ? 14 : 9) + rng() * 9,
      delay: -rng() * 18,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      shape: i % 3,
    }));
  }, [lite]);
  return (
    <div className="hb-saver-confetti" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.id}
          className={`hb-saver-bit is-shape-${b.shape}`}
          style={{ left: `${b.left}%`, fontSize: `${b.size}em`, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
        >
          {b.shape === 2 ? <Heart color={b.color} /> : <i style={{ background: b.color }} />}
        </span>
      ))}
    </div>
  );
};

// The TV's screensaver until the game starts: "welcome to Rotem's kingdom of
// hearts" with Rotem, her palace, birthday wishes and a party - no game
// details or QR. A click (or a key) opens the game itself;
// F switches to full screen. Lite effects (screen mirroring) keep only small
// things moving: twinkles and a little confetti.
const Screensaver = ({ onExit, classMode = false }) => {
  const [lite] = useState(initialLiteFx);
  const { birthdayName: name, age } = useMemo(() => loadSettings(settingsKeyFor(classMode)), [classMode]);
  const wishes = useMemo(() => [age ? `יום הולדת ${age} שמח! 🎂` : 'יום הולדת שמח! 🎂', ...WISHES], [age]);
  const [wish, setWish] = useState(0);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef(0);
  useWakeLock(true);

  useEffect(() => {
    const id = setInterval(() => setWish((w) => (w + 1) % wishes.length), WISH_MS);
    return () => clearInterval(id);
  }, [wishes.length]);

  // moving the mouse shows the buttons (and the cursor) for a moment
  const showHint = useCallback(() => {
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
  }, []);
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(e.key)) return;
      e.preventDefault();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, toggleFullscreen]);

  return (
    <div
      className={`hb-tv hb-saver ${lite ? 'fx-lite' : ''} ${hint ? 'show-hint' : ''}`}
      onClick={onExit}
      onMouseMove={showHint}
      data-testid="screensaver"
    >
      <PartyBackdrop lite={lite} balloons hearts={18} />
      <Confetti lite={lite} />
      <Castle />
      <Garland />
      <div className="hb-saver-stage">
        <div className="hb-saver-photo">
          <RotemPhoto size="xl" age={age} beat />
        </div>
        <GameTitle as="div" text="ברוכים הבאים" tone="gold" className="hb-saver-sub" />
        <GameTitle text={`לממלכת הלבבות של ${name}`} className="hb-saver-title" />
        <div className="hb-saver-wish" key={wish}>
          {wishes[wish]}
        </div>
      </div>
      <div className="hb-saver-bar" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="hb-btn hb-btn-soft" onClick={toggleFullscreen}>
          ⛶ מסך מלא
        </button>
        <button type="button" className="hb-btn hb-btn-primary" onClick={onExit} data-testid="saver-exit">
          ▶ מעבר למשחק
        </button>
      </div>
    </div>
  );
};

export default Screensaver;
