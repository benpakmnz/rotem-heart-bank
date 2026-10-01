import React, { useMemo } from 'react';
import { Heart } from './Heart';
import { createRng } from '../lib/random';

const HEART_COLORS = ['#FF4D94', '#FF9FCB', '#FFC53D', '#FFFFFF', '#C77DFF', '#FF6FAE'];
const BOKEH_COLORS = ['255, 77, 148', '155, 93, 229', '255, 197, 61', '255, 159, 203', '76, 201, 240'];
const BALLOON_COLORS = [
  ['#FF7AB6', '#D1115E'],
  ['#FFE27A', '#E39A00'],
  ['#C9A2FF', '#7B2FF7'],
  ['#8FE3FF', '#1E88C8'],
  ['#FFB0D5', '#E0457E'],
];

// Four-point twinkle star.
export const Sparkle = ({ className = '', style, color = '#FFF6D6' }) => (
  <svg viewBox="-10 -10 20 20" className={className} style={style} aria-hidden="true">
    <path d="M0 -10 C 1 -3, 3 -1, 10 0 C 3 1, 1 3, 0 10 C -1 3, -3 1, -10 0 C -3 -1, -1 -3, 0 -10 Z" fill={color} />
  </svg>
);

const Balloon = ({ colors }) => (
  <svg viewBox="0 0 40 112" aria-hidden="true">
    <path d="M20 54 C 17 66, 25 74, 19 86 C 14 96, 23 102, 20 112" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" fill="none" />
    <path d="M20 2 C 34 2, 40 14, 39 26 C 38 40, 28 50, 20 52 C 12 50, 2 40, 1 26 C 0 14, 6 2, 20 2 Z" fill={colors[0]} />
    <path d="M20 52 C 28 50, 38 40, 39 26 C 39 20, 37 14, 33 10 C 36 26, 30 44, 20 52 Z" fill={colors[1]} opacity="0.55" />
    <path d="M16.5 51 L 23.5 51 L 21.5 56 L 18.5 56 Z" fill={colors[1]} />
    <ellipse cx="12.5" cy="15" rx="4.2" ry="7.5" fill="rgba(255,255,255,0.5)" transform="rotate(-24 12.5 15)" />
  </svg>
);

// The party stage behind every screen: light rays, bokeh lights, hearts
// drifting up, twinkles and (for the lobby and the finale) balloons.
// `lite` (TV browsers, screen mirroring): everything stands still - no
// floating hearts or balloons, the lights and twinkles don't move. Every
// moving element is work for a weak TV, and a still picture is what screen
// mirroring sends without stuttering.
const PartyBackdrop = ({ balloons = false, rays = true, hearts = 12, lite = false, className = '' }) => {
  const layout = useMemo(() => {
    const rng = createRng(7);
    return {
      bokeh: Array.from({ length: lite ? 5 : 9 }, (_, i) => ({
        id: i,
        left: rng() * 100,
        top: rng() * 100,
        size: 10 + rng() * 22,
        color: BOKEH_COLORS[i % BOKEH_COLORS.length],
        alpha: 0.16 + rng() * 0.16,
        dx: (rng() - 0.5) * 16,
        dy: (rng() - 0.5) * 12,
        duration: 14 + rng() * 14,
        delay: -rng() * 20,
      })),
      hearts: Array.from({ length: lite ? 0 : hearts }, (_, i) => ({
        id: i,
        left: rng() * 100,
        size: 1 + rng() * 2.6,
        delay: -rng() * 30,
        duration: 16 + rng() * 20,
        sway: 2 + rng() * 5,
        color: HEART_COLORS[i % HEART_COLORS.length],
        opacity: 0.18 + rng() * 0.32,
      })),
      sparkles: Array.from({ length: lite ? 6 : 16 }, (_, i) => ({
        id: i,
        left: 3 + rng() * 94,
        top: 3 + rng() * 90,
        size: 0.6 + rng() * 1.1,
        duration: 1.8 + rng() * 2.4,
        delay: -rng() * 4,
      })),
      balloons: Array.from({ length: lite ? 0 : 7 }, (_, i) => ({
        id: i,
        left: (i / (lite ? 3 : 7)) * 100 + rng() * 8,
        size: 3.4 + rng() * 2.2,
        duration: 20 + rng() * 14,
        delay: -rng() * 34,
        colors: BALLOON_COLORS[i % BALLOON_COLORS.length],
      })),
    };
  }, [hearts, lite]);

  return (
    <div className={`hb-backdrop ${lite ? 'is-lite' : ''} ${className}`} aria-hidden="true">
      {rays && <div className="hb-bd-rays" />}
      {layout.bokeh.map((b) => (
        <span
          key={`b${b.id}`}
          className="hb-bd-bokeh"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}em`,
            height: `${b.size}em`,
            marginLeft: `${-b.size / 2}em`,
            marginTop: `${-b.size / 2}em`,
            background: `radial-gradient(circle, rgba(${b.color}, ${b.alpha}) 0%, rgba(${b.color}, 0) 70%)`,
            '--hb-dx': `${b.dx}em`,
            '--hb-dy': `${b.dy}em`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
      {layout.hearts.map((h) => (
        <span
          key={`h${h.id}`}
          className="hb-bd-heart"
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
      {layout.sparkles.map((s) => (
        <Sparkle
          key={`s${s.id}`}
          className="hb-bd-sparkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: `${s.size}em`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {balloons &&
        layout.balloons.map((b) => (
          <span
            key={`k${b.id}`}
            className="hb-bd-balloon"
            style={{ left: `${b.left}%`, fontSize: `${b.size / 4.2}em`, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
          >
            <Balloon colors={b.colors} />
          </span>
        ))}
      {!lite && <div className="hb-bd-vignette" />}
    </div>
  );
};

export default PartyBackdrop;
