import React, { useCallback, useEffect, useState } from 'react';
import { allocateRoom, connectRoom, transportMode } from '../net/room';
import { createGame, PHASES } from '../engine/engine';
import { readJson, removeKey } from '../lib/storage';
import { LogoHeart } from '../shared/Heart';
import HostGame from './HostGame';
import useHostGame, { sessionKeyFor } from './useHostGame';
import ErrorBoundary from '../shared/ErrorBoundary';
import { loadSettings, settingsKeyFor } from './settingsStore';
import Screensaver from './Screensaver';
import { SAVER_PATH } from '../routes';
import './host.css';
import './stages.css';
import './class.css';

const SESSION_MAX_AGE = 12 * 60 * 60 * 1000;

// A database created in "locked mode" refuses everything until the game's rules are published.
const isPermissionError = (error) => /permission/i.test(String(error && error.message));

const CLASS_SERVER_WAIT_MS = 8000;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// Resume the TV's game after a refresh, or open a new room. Class mode has
// its own saved game and settings, and runs on this computer alone when the
// school network blocks the game server (the teacher's phone remote is the
// only thing that needs it).
const bootHost = async (classMode) => {
  let mode = transportMode();
  const saved = readJson(sessionKeyFor(classMode));
  const fresh =
    saved &&
    saved.state &&
    PHASES.includes(saved.state.phase) &&
    Boolean(saved.state.classMode) === Boolean(classMode) &&
    (saved.mode === mode || (classMode && saved.mode === 'local')) &&
    Date.now() - saved.savedAt < SESSION_MAX_AGE;
  if (fresh) {
    const conn = await connectRoom(saved.state.roomCode, { role: 'host', local: saved.mode === 'local' });
    return { conn, initialState: saved.state, mode: saved.mode };
  }
  let conn;
  if (classMode && mode !== 'local') {
    try {
      conn = await withTimeout(allocateRoom(), CLASS_SERVER_WAIT_MS);
    } catch (e) {
      conn = await allocateRoom({ local: true });
      mode = 'local';
    }
  } else {
    conn = await allocateRoom();
  }
  const settings = loadSettings(settingsKeyFor(classMode));
  return { conn, initialState: createGame({ roomCode: conn.code, settings, now: conn.serverNow(), classMode }), mode };
};

const HostRoom = ({ conn, initialState, mode, onNewGame, covered, onShowSaver, onUncover }) => {
  const [state, dispatch] = useHostGame(conn, initialState, mode);

  // Room metadata the phones check before joining, and the TV's presence.
  const { createdAt, settings } = state;
  useEffect(() => {
    conn.update('meta', { createdAt, name: settings.birthdayName, age: settings.age || 0, v: 1 });
  }, [conn, createdAt, settings.birthdayName, settings.age]);
  useEffect(() => conn.presence('meta/hostOnline'), [conn]);

  return (
    <HostGame
      conn={conn}
      state={state}
      dispatch={dispatch}
      mode={mode}
      onNewGame={onNewGame}
      covered={covered}
      onShowSaver={onShowSaver}
      onUncover={onUncover}
    />
  );
};

// While the room opens (or when it can't).
const BootCard = ({ boot, onRetry }) => (
  <div className="hb-tv hb-tv-center">
    <div className="hb-boot-card">
      <LogoHeart className="hb-boot-logo" />
      {boot.status === 'error' ? (
        <>
          {isPermissionError(boot.error) ? (
            <>
              <h1>Firebase חוסם את המשחק</h1>
              <p>
                צריך לפרסם את כללי המשחק: ב-Firebase Console פתחו את Realtime Database ואת הלשונית <b>Rules</b>, הדביקו שם
                את כל התוכן של הקובץ database.rules.json ולחצו <b>Publish</b>.
              </p>
            </>
          ) : (
            <>
              <h1>אופס, אין חיבור לשרת המשחק</h1>
              <p>בדקו את החיבור לאינטרנט ואת הגדרות Firebase (ראו README.md).</p>
            </>
          )}
          <p className="hb-boot-error">{String(boot.error && boot.error.message)}</p>
          <button type="button" className="hb-btn hb-btn-primary" onClick={onRetry}>
            🔄 לנסות שוב
          </button>
        </>
      ) : (
        <h1>פותחים את האוצר...</h1>
      )}
    </div>
  </div>
);

// `saver`: start behind the birthday screensaver (/saver). The room opens
// underneath, so a click shows the game right away. `classMode`: /class.
const HostApp = ({ saver = false, classMode = false }) => {
  const [boot, setBoot] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saverOn, setSaverOn] = useState(saver);

  const showSaver = useCallback(() => setSaverOn(true), []);
  const hideSaver = useCallback(() => {
    setSaverOn(false);
    // from here on a refresh opens the game itself
    const { pathname, search, hash } = window.location;
    if (pathname.replace(/\/+$/, '') === SAVER_PATH) window.history.replaceState(null, '', `/${search}${hash}`);
  }, []);

  useEffect(() => {
    let alive = true;
    setBoot({ status: 'loading' });
    bootHost(classMode)
      .then((result) => alive && setBoot({ status: 'ready', ...result }))
      .catch((error) => alive && setBoot({ status: 'error', error }));
    return () => {
      alive = false;
    };
  }, [attempt, classMode]);

  const sessionKey = sessionKeyFor(classMode);
  const newGame = useCallback(() => {
    removeKey(sessionKey);
    setAttempt((n) => n + 1);
  }, [sessionKey]);

  let content = null;
  if (boot.status === 'ready') {
    content = (
      <ErrorBoundary variant="tv" resetKey={sessionKey}>
        <HostRoom
          key={boot.conn.code}
          conn={boot.conn}
          initialState={boot.initialState}
          mode={boot.mode}
          onNewGame={newGame}
          covered={saverOn}
          onShowSaver={showSaver}
          onUncover={hideSaver}
        />
      </ErrorBoundary>
    );
  } else if (!saverOn) {
    content = <BootCard boot={boot} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  return (
    <>
      {content}
      {saverOn && <Screensaver onExit={hideSaver} classMode={classMode} />}
    </>
  );
};

export default HostApp;
