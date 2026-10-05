import { useCallback, useEffect, useRef, useState } from 'react';
import { reduce, toPublic, privateMessages } from '../engine/engine';
import { writeJson } from '../lib/storage';

export const SESSION_KEY = 'hb-host-session-v1';
export const CLASS_SESSION_KEY = 'hb-class-session-v1';
export const sessionKeyFor = (classMode) => (classMode ? CLASS_SESSION_KEY : SESSION_KEY);

// Wires the pure engine to the room: listens to players and inputs, runs the
// clock, publishes the public state and the performer's secret, and saves
// everything locally so a refresh of the TV continues the same game.
const useHostGame = (conn, initialState, mode) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);

  const dispatch = useCallback(
    (action) => {
      const next = reduce(stateRef.current, action, { now: conn.serverNow() });
      if (next !== stateRef.current) {
        stateRef.current = next;
        setState(next);
      }
      return next;
    },
    [conn]
  );

  // Players (ignore half-written entries without a name).
  useEffect(
    () =>
      conn.subscribe('players', (players) => {
        const clean = {};
        Object.entries(players || {}).forEach(([pid, p]) => {
          if (p && p.name) clean[pid] = p;
        });
        dispatch({ type: 'players', players: clean });
      }),
    [conn, dispatch]
  );

  // Inputs of the current round, batched (taps arrive many times a second).
  const { roundId } = state;
  useEffect(() => {
    let timer = null;
    let latest = {};
    const flush = () => {
      timer = null;
      dispatch({ type: 'inputs', roundId, inputs: latest || {} });
    };
    const unsubscribe = conn.subscribe(`inputs/${roundId}`, (inputs) => {
      latest = inputs;
      if (!timer) timer = setTimeout(flush, 120);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [conn, roundId, dispatch]);

  // Clock.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 200);
    return () => clearInterval(id);
  }, [dispatch]);

  // Public state for the phones.
  const published = useRef('');
  useEffect(() => {
    const pub = toPublic(state);
    const json = JSON.stringify(pub);
    if (json === published.current) return;
    published.current = json;
    conn.set('state', pub);
  }, [conn, state]);

  // Secrets (the charades concept goes to the performer's phone only).
  const secrets = useRef({});
  useEffect(() => {
    const next = privateMessages(state);
    const prev = secrets.current;
    Object.keys(prev).forEach((pid) => {
      if (!next[pid]) conn.remove(`private/${pid}`);
    });
    Object.keys(next).forEach((pid) => {
      if (JSON.stringify(next[pid]) !== JSON.stringify(prev[pid])) conn.set(`private/${pid}`, next[pid]);
    });
    secrets.current = next;
  }, [conn, state]);

  // Save at most once a second (and on the way out).
  const lastSave = useRef(0);
  useEffect(() => {
    const save = () => {
      lastSave.current = Date.now();
      writeJson(sessionKeyFor(stateRef.current.classMode), { savedAt: Date.now(), mode, state: stateRef.current });
    };
    const wait = 1000 - (Date.now() - lastSave.current);
    if (wait <= 0) {
      save();
      return undefined;
    }
    const timer = setTimeout(save, wait);
    window.addEventListener('pagehide', save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [state, mode]);

  return [state, dispatch];
};

export default useHostGame;
