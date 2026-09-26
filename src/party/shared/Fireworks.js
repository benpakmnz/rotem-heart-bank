import React, { useRef } from 'react';
import useCanvasLoop from './useCanvasLoop';

const COLORS = ['#FF4D7E', '#FF8FAB', '#FFD166', '#FFB703', '#FFFFFF', '#F472B6', '#E11D48', '#C084FC'];

// Heart curve: x = 16 sin^3 t, y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
const heartPoint = (t) => ({
  x: 16 * Math.sin(t) ** 3,
  y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
});

// "זיקוקים של לבבות": rockets that explode into heart-shaped bursts.
const Fireworks = ({ active = true, onBurst }) => {
  const sim = useRef({ rockets: [], sparks: [], nextLaunch: 0 });
  const burstRef = useRef(onBurst);
  burstRef.current = onBurst;

  const canvasRef = useCanvasLoop((ctx, { w, h, dt, t }) => {
    const s = sim.current;
    // fade the previous frame -> light trails
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    if (t > s.nextLaunch) {
      s.nextLaunch = t + 350 + Math.random() * 650;
      s.rockets.push({
        x: w * (0.12 + Math.random() * 0.76),
        y: h + 10,
        vx: (Math.random() - 0.5) * 60,
        vy: -(h * 0.95 + Math.random() * h * 0.35),
        top: h * (0.12 + Math.random() * 0.35),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    s.rockets = s.rockets.filter((r) => {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.vy += h * 0.35 * dt;
      ctx.fillStyle = '#FFF4D6';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (r.y > r.top && r.vy < 0) return true;
      const size = Math.min(w, h) * (0.009 + Math.random() * 0.006);
      const n = 70;
      for (let i = 0; i < n; i += 1) {
        const p = heartPoint((i / n) * Math.PI * 2);
        s.sparks.push({ x: r.x, y: r.y, vx: p.x * size * 1.5, vy: p.y * size * 1.5, life: 1, decay: 0.55 + Math.random() * 0.25, color: r.color, r: 2.6 });
      }
      for (let i = 0; i < 26; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = Math.random() * size * 18;
        s.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.9 + Math.random() * 0.5, color: '#FFE9A8', r: 1.8 });
      }
      if (burstRef.current) burstRef.current();
      return false;
    });

    s.sparks = s.sparks.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vy = p.vy * (1 - 1.2 * dt) + h * 0.12 * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) return false;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + p.life * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    });
  }, active);

  return <canvas ref={canvasRef} className="hb-fx-canvas" aria-hidden="true" />;
};

export default Fireworks;
