import { useEffect, useState } from 'react';

// Live value at a room path. undefined = still loading, null = nothing there.
// throttleMs limits re-renders for chatty paths (e.g. the players list).
export const useRoomValue = (conn, path, { throttleMs = 0 } = {}) => {
  const [value, setValue] = useState(undefined);

  useEffect(() => {
    setValue(undefined);
    if (!conn || path == null) return undefined;
    let timer = null;
    let latest;
    let lastEmit = 0;
    const emit = () => {
      timer = null;
      lastEmit = Date.now();
      setValue(latest);
    };
    const unsubscribe = conn.subscribe(path, (v) => {
      latest = v;
      if (!throttleMs) {
        setValue(v);
        return;
      }
      const wait = throttleMs - (Date.now() - lastEmit);
      if (wait <= 0) emit();
      else if (!timer) timer = setTimeout(emit, wait);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [conn, path, throttleMs]);

  return value;
};

// The shared (server) clock, re-rendering every `intervalMs`.
export const useServerNow = (conn, intervalMs = 250) => {
  const [now, setNow] = useState(() => (conn ? conn.serverNow() : Date.now()));
  useEffect(() => {
    const read = () => setNow(conn ? conn.serverNow() : Date.now());
    read();
    const id = setInterval(read, intervalMs);
    return () => clearInterval(id);
  }, [conn, intervalMs]);
  return now;
};

export const useConnectionStatus = (conn) => {
  const [online, setOnline] = useState(true);
  useEffect(() => (conn ? conn.onConnection(setOnline) : undefined), [conn]);
  return online;
};
