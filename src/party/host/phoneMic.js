import { useEffect, useRef, useState } from 'react';

// The teacher's phone as the clap meter's microphone. The phone measures each
// turn by the shared clock - from the TV's start of the turn to its end - and
// reports a few times a second in rooms/<code>/admin/mic:
//   { pin, at, level (0..1 now), roundId (the turn), claps (that turn's) }
// The TV answers in admin/micHeard: { input ('phone' / 'mic' / 'keys'), at }.
export const PHONE_MIC_PATH = 'admin/mic';
export const PHONE_MIC_HEARD_PATH = 'admin/micHeard';
export const PHONE_STALE_MS = 2500;

// TV side: the phone's latest report, and whether the phone is listening now.
export const usePhoneMicFeed = (conn, pin, enabled) => {
  const [feed, setFeed] = useState(null);
  const [live, setLive] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      feedRef.current = null;
      setFeed(null);
      return undefined;
    }
    return conn.subscribe(PHONE_MIC_PATH, (report) => {
      const ok = report && typeof report === 'object' && String(report.pin || '') === String(pin || '');
      feedRef.current = ok ? report : null;
      setFeed(feedRef.current);
    });
  }, [conn, pin, enabled]);

  // the phone stopped reporting (it went off, or its screen locked)
  useEffect(() => {
    const check = () => setLive(Boolean(feedRef.current) && conn.serverNow() - Number(feedRef.current.at) < PHONE_STALE_MS);
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, [conn, feed]);

  return { feed, feedRef, live, level: live && feed ? Math.max(0, Math.min(1, Number(feed.level) || 0)) : 0 };
};
