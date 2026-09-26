import { useEffect, useRef, useState } from 'react';

// Smoothly counts from the previous value (or `from` on mount) to `target`.
const useAnimatedNumber = (target, duration = 900, from = target) => {
  const [value, setValue] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    const origin = current.current;
    if (origin === target) return undefined;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - k) ** 3;
      current.current = origin + (target - origin) * eased;
      setValue(current.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
};

export default useAnimatedNumber;
