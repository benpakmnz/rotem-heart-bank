import React, { useEffect, useMemo, useState } from 'react';
import { connectRoom, transportMode } from '../net/room';
import { useConnectionStatus, useRoomValue } from '../net/hooks';
import { isValidRoomCode, JOIN_PATH, ROOM_CODE_LENGTH } from '../routes';
import { readJson, writeJson } from '../lib/storage';
import { randomId } from '../lib/random';
import { LogoHeart } from '../shared/Heart';
import useWakeLock from '../shared/useWakeLock';
import JoinScreen from './JoinScreen';
import PlayerGame from './PlayerGame';
import './player.css';

// Each phone remembers who it is per room, so a refresh rejoins as the same
// player. In the one-browser demo mode every tab is its own player.
const identityStore = () => (transportMode() === 'local' ? 'session' : 'local');
const identityKey = (code) => `hb-player-${code}`;

const Centered = ({ children }) => (
  <div className="hb-phone hb-phone-center">
    <LogoHeart className="hb-phone-logo" />
    {children}
  </div>
);

const CodeEntry = ({ onSubmit, initial = '' }) => {
  const [code, setCode] = useState(initial);
  const valid = isValidRoomCode(code);
  return (
    <Centered>
      <h1 className="hb-phone-title">בנק הלבבות 💖</h1>
      <p className="hb-phone-text">הקלידו את הקוד שמופיע בטלוויזיה</p>
      <form
        className="hb-code-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(code);
        }}
      >
        <input
          className="hb-input hb-code-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={ROOM_CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder={'0'.repeat(ROOM_CODE_LENGTH)}
          aria-label="קוד המשחק"
          dir="ltr"
        />
        <button type="submit" className="hb-btn hb-btn-primary hb-btn-block" disabled={!valid}>
          כניסה למשחק
        </button>
      </form>
    </Centered>
  );
};

const PlayerSession = ({ conn, code, meta }) => {
  const store = identityStore();
  const [identity, setIdentity] = useState(() => readJson(identityKey(code), store));
  const myPath = identity ? `players/${identity.id}` : null;
  const me = useRoomValue(conn, myPath);
  const online = useConnectionStatus(conn);
  const joined = Boolean(identity && me && me.name);
  useWakeLock(joined);

  // online=true while this phone is connected (false when it drops).
  useEffect(() => (joined ? conn.presence(`${myPath}/online`) : undefined), [conn, joined, myPath]);

  const join = ({ name, avatar }) => {
    const id = (identity && identity.id) || `p${randomId(10)}`;
    const next = { id, name, avatar };
    writeJson(identityKey(code), next, store);
    setIdentity(next);
    conn.set(`players/${id}`, { name, avatar, joinedAt: conn.serverNow(), online: true });
  };

  if (identity && me === undefined) return <Centered><p className="hb-phone-text">מתחברים...</p></Centered>;

  return (
    <>
      {!online && <div className="hb-phone-banner">📡 אין חיבור... מנסים להתחבר שוב</div>}
      {online && meta.hostOnline === false && <div className="hb-phone-banner">📺 הטלוויזיה התנתקה - מחכים שתחזור</div>}
      {joined ? (
        <PlayerGame conn={conn} me={{ ...me, id: identity.id }} />
      ) : (
        <JoinScreen name={meta.name} defaults={identity} onJoin={join} removed={Boolean(identity && me === null)} />
      )}
    </>
  );
};

const PlayerRoom = ({ code, onChangeCode }) => {
  const [conn, setConn] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    connectRoom(code, { role: 'player' })
      .then((c) => alive && setConn(c))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [code]);

  const meta = useRoomValue(conn, 'meta');

  if (error) {
    return (
      <Centered>
        <h1 className="hb-phone-title">אין חיבור לשרת 😕</h1>
        <p className="hb-phone-text">בדקו את החיבור לאינטרנט ונסו שוב.</p>
        <button type="button" className="hb-btn hb-btn-primary" onClick={() => window.location.reload()}>
          🔄 לנסות שוב
        </button>
      </Centered>
    );
  }
  if (!conn || meta === undefined) {
    return (
      <Centered>
        <p className="hb-phone-text">מתחברים למשחק {code}...</p>
      </Centered>
    );
  }
  if (!meta) {
    return (
      <Centered>
        <h1 className="hb-phone-title">לא מצאנו משחק עם הקוד {code} 🤔</h1>
        {transportMode() === 'local' ? (
          <p className="hb-phone-text">
            המשחק רץ במצב הדגמה מקומי, שבו רק חלונות באותו מחשב יכולים להצטרף. כדי לשחק מהטלפונים צריך להגדיר Firebase (ראו README.md).
          </p>
        ) : (
          <p className="hb-phone-text">בדקו שמסך הטלוויזיה פתוח ושהקוד נכון.</p>
        )}
        <button type="button" className="hb-btn hb-btn-primary" onClick={onChangeCode}>
          הקלדת קוד אחר
        </button>
      </Centered>
    );
  }
  return <PlayerSession conn={conn} code={code} meta={meta} />;
};

const PlayerApp = ({ initialCode }) => {
  const [code, setCode] = useState(initialCode);
  const search = useMemo(() => window.location.search, []);

  const go = (next) => {
    window.history.replaceState(null, '', `${JOIN_PATH}${next ? `/${next}` : ''}${search}`);
    setCode(next);
  };

  if (!code) return <CodeEntry onSubmit={go} />;
  return <PlayerRoom key={code} code={code} onChangeCode={() => go(null)} />;
};

export default PlayerApp;
