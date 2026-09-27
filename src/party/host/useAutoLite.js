import { useEffect, useRef } from 'react';

const SAMPLE_MS = 6000;
const START_AFTER_MS = 1500; // let the first screen settle
const SLOW_FRAME_MS = 1000 / 30;

// Watches the frame rate for a few seconds; a screen that can't keep up
// 30 frames a second (a TV browser the detection missed) calls onSlow once.
const useAutoLite = (enabled, onSlow) => {
  const onSlowRef = useRef(onSlow);
  onSlowRef.current = onSlow;

  useEffect(() => {
    if (!enabled || typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    let first = 0;
    let last = 0;
    let frames = 0;
    const start = performance.now() + START_AFTER_MS;
    const frame = (t) => {
      if (t >= start) {
        if (!first) first = t;
        else frames += 1;
        last = t;
        if (last - first >= SAMPLE_MS) {
          if ((last - first) / frames > SLOW_FRAME_MS) onSlowRef.current();
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
};

export default useAutoLite;
