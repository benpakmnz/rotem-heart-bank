import React, { useCallback, useEffect, useState } from 'react';
import { allocateRoom, connectRoom, transportMode } from '../net/room';
import { createGame } from '../engine/engine';
import { readJson, removeKey } from '../lib/storage';
import { LogoHeart } from '../shared/Heart';
import HostGame from './HostGame';
import useHostGame, { SESSION_KEY } from './useHostGame';
import { loadSettings } from './settingsStore';
import './host.css';
import './stages.css';

const SESSION_MAX_AGE = 12 * 60 * 60 * 1000;

// A database created in "locked mode" refuses everything until the game's rules are published.
const isPermissionError = (error) => /permission/i.test(String(error && error.message));

// Resume the TV's game after a refresh, or open a new room.
const bootHost = async () => {
  const mode = transportMode();
  const saved = readJson(SESSION_KEY);
  const fresh = saved && saved.state && saved.mode === mode && Date.now() - saved.savedAt < SESSION_MAX_AGE;
  if (fresh) {
    const conn = await connectRoom(saved.state.roomCode, { role: 'host' });
    return { conn, initialState: saved.state, mode };
  }
  const conn = await allocateRoom();
  return { conn, initialState: createGame({ roomCode: conn.code, settings: loadSettings(), now: conn.serverNow() }), mode };
};

const HostRoom = ({ conn, initialState, mode, onNewGame }) => {
  const [state, dispatch] = useHostGame(conn, initialState, mode);

  // Room metadata the phones check before joining, and the TV's presence.
  const { createdAt, settings } = state;
  useEffect(() => {
    conn.update('meta', { createdAt, name: settings.birthdayName, age: settings.age || 0, v: 1 });
  }, [conn, createdAt, settings.birthdayName, settings.age]);
  useEffect(() => conn.presence('meta/hostOnline'), [conn]);

  return <HostGame conn={conn} state={state} dispatch={dispatch} mode={mode} onNewGame={onNewGame} />;
};

const HostApp = () => {
  const [boot, setBoot] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setBoot({ status: 'loading' });
    bootHost()
      .then((result) => alive && setBoot({ status: 'ready', ...result }))
      .catch((error) => alive && setBoot({ status: 'error', error }));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const newGame = useCallback(() => {
    removeKey(SESSION_KEY);
    setAttempt((n) => n + 1);
  }, []);

  if (boot.status === 'ready') {
    return <HostRoom key={boot.conn.code} conn={boot.conn} initialState={boot.initialState} mode={boot.mode} onNewGame={newGame} />;
  }

  return (
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
            <button type="button" className="hb-btn hb-btn-primary" onClick={() => setAttempt((n) => n + 1)}>
              🔄 לנסות שוב
            </button>
          </>
        ) : (
          <h1>פותחים את הבנק...</h1>
        )}
      </div>
    </div>
  );
};

export default HostApp;
