import React, { useRef } from 'react';
import useCanvasLoop from './useCanvasLoop';

const COLORS = ['#FF5C8A', '#FF8FAB', '#E11D48', '#FFB3C6', '#FFC53D'];

let heartPath = null;
const getHeartPath = () => {
  if (!heartPath) {
    heartPath = new Path2D('M0 7 C -2.8 4.9, -5 3.1, -5 1 C -5 -0.6, -3.9 -1.7, -2.4 -1.7 C -1.4 -1.7, -0.5 -1.1, 0 -0.3 C 0.5 -1.1, 1.4 -1.7, 2.4 -1.7 C 3.9 -1.7, 5 -0.6, 5 1 C 5 3.1, 2.8 4.9, 0 7 Z');
  }
  return heartPath;
};

// "מטר הלבבות": hearts rain down on the TV - the faster the family taps,
// the heavier the rain. `rateRef.current` = taps per second.
const HeartRain = ({ rateRef, active = true }) => {
  const sim = useRef({ hearts: [], carry: 0 });

  const canvasRef = useCanvasLoop((ctx, { w, h, dt }) => {
    const s = sim.current;
    ctx.clearRect(0, 0, w, h);
    const rate = Math.min(45, 2 + (rateRef.current || 0) * 0.8);
    s.carry += rate * dt;
    while (s.carry >= 1 && s.hearts.length < 160) {
      s.carry -= 1;
      s.hearts.push({
        x: Math.random() * w,
        y: -20,
        vy: h * (0.12 + Math.random() * 0.18),
        size: 1.6 + Math.random() * 2.6,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 1.5,
        rot: (Math.random() - 0.5) * 0.6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    const path = getHeartPath();
    s.hearts = s.hearts.filter((p) => {
      p.y += p.vy * dt;
      p.phase += dt * 2;
      p.rot += p.spin * dt;
      if (p.y > h + 30) return false;
      ctx.save();
      ctx.translate(p.x + Math.sin(p.phase) * 12, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.size, p.size);
      ctx.globalAlpha = Math.min(1, (h + 30 - p.y) / (h * 0.3)) * 0.85;
      ctx.fillStyle = p.color;
      ctx.fill(path);
      ctx.restore();
      return true;
    });
  }, active);

  return <canvas ref={canvasRef} className="hb-fx-canvas hb-heart-rain" aria-hidden="true" />;
};

export default HeartRain;
