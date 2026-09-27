import { useEffect, useRef } from 'react';
import { isLiteFx } from '../lib/effects';

// Runs draw(ctx, { w, h, dt, t }) every animation frame on a full-size,
// device-pixel-ratio aware canvas while `active` is true.
const useCanvasLoop = (draw, active = true) => {
  const canvasRef = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    const resize = () => {
      // a 4K canvas is 33 MB; lite mode (TVs) draws at 1x
      const dpr = Math.min(isLiteFx() ? 1 : 2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    let last = performance.now();
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      drawRef.current(ctx, { w, h, dt, t });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  return canvasRef;
};

export default useCanvasLoop;
