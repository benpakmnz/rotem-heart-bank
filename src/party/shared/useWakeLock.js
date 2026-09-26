import { useEffect } from 'react';

// Keep the screen on (TV laptop and phones) while the game runs.
const useWakeLock = (enabled = true) => {
  useEffect(() => {
    if (!enabled || !navigator.wakeLock) return undefined;
    let lock = null;
    let alive = true;
    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (alive) lock = l;
          else l.release();
        })
        .catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', request);
      if (lock) lock.release().catch(() => {});
    };
  }, [enabled]);
};

export default useWakeLock;
