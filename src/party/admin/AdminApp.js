import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { heartKind, stageInfo, stageOrder, STAGE_IDS } from '../config/game';
import { connectRoom } from '../net/room';
import { useConnectionStatus, useRoomValue } from '../net/hooks';
import { ADMIN_PATH, isValidRoomCode, ROOM_CODE_LENGTH } from '../routes';
import { readJson, writeJson } from '../lib/storage';
import { randomId } from '../lib/random';
import { fmt } from '../lib/format';
import Avatar from '../shared/Avatar';
import Badges from '../shared/Badges';
import { GlossyHeart } from '../shared/Heart';
import PartyBackdrop from '../shared/PartyBackdrop';
import PlayerPicker from '../shared/PlayerPicker';
import SettingsPanel from '../host/SettingsPanel';
import ErrorBoundary from '../shared/ErrorBoundary';
import '../player/player.css';
import '../host/host.css';
import './admin.css';

const pinKey = (code) => `hb-admin-pin-${code}`;
const ACK_TIMEOUT_MS = 8000;

const STEP_NAMES = {
  waiting: 'מחכים שכולם יצטרפו',
  intro: 'מסך הסבר',
  countdown: 'ספירה לאחור',
  active: 'משחקים!',
  tally: 'סופרים',
  question: 'שאלה על המסך',
  reveal: 'חשיפת התשובה',
  pick: 'בוחרים מציג',
  ready: 'המציג מתכונן',
  perform: 'מציגים!',
  outcome: 'תוצאה',
  play: 'מפצחים',
  search: 'מחפשים לבבות',
  write: 'כותבים ברכות',
  results: 'סיכום השלב',
  fill: 'האוצר מתמלא',
  celebrate: 'חגיגה!',
};

// Commands to the TV: rooms/<code>/admin/cmd/<id> -> answer in admin/ack/<id>.
const useCommands = (conn, pin) =>
  useCallback(
    (cmd) =>
      new Promise((resolve) => {
        if (!conn) {
          resolve({ ok: false, error: 'offline' });
          return;
        }
        const id = `c${Date.now().toString(36)}${randomId(5)}`;
        let finished = false;
        let unsubscribe = () => {};
        const finish = (result) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          unsubscribe();
          conn.remove(`admin/ack/${id}`);
          resolve(result);
        };
        const timer = setTimeout(() => {
          conn.remove(`admin/cmd/${id}`);
          finish({ ok: false, error: 'timeout' });
        }, ACK_TIMEOUT_MS);
        unsubscribe = conn.subscribe(`admin/ack/${id}`, (ack) => {
          if (ack) finish(ack);
        });
        conn.set(`admin/cmd/${id}`, { ...cmd, pin, at: conn.serverNow() });
      }),
    [conn, pin]
  );

const ERRORS = {
  pin: 'קוד המנהל לא נכון',
  timeout: 'הטלוויזיה לא עונה - בדקו שמסך המשחק פתוח',
  stale: 'המסך כבר התקדם - נסו שוב',
  unavailable: 'הפעולה כבר לא זמינה',
};

const Section = ({ title, children, className = '' }) => (
  <section className={`hb-admin-card ${className}`}>
    {title && <h2>{title}</h2>}
    {children}
  </section>
);

// ---------- stage tools ----------

const HuntTools = ({ state, players, send }) => {
  const [picking, setPicking] = useState(null);
  const hearts = Array.isArray(state.data.hearts) ? state.data.hearts : [];
  const ids = Object.keys(players).sort((a, b) => (players[a].joinedAt || 0) - (players[b].joinedAt || 0));
  const heart = hearts.find((h) => h.id === picking);
  return (
    <Section title="🔎 מי מצא איזה לב?">
      <div className="hb-admin-hearts">
        {hearts.map((h) => {
          const k = heartKind(h.kind);
          const finder = h.pid && players[h.pid];
          return (
            <button key={h.id} type="button" className={`hb-admin-heart ${finder ? 'is-found' : ''}`} onClick={() => setPicking(h.id)} data-testid={`admin-heart-${h.id}`}>
              <span className="hb-admin-heart-icon">
                <GlossyHeart from={k.colors[0]} to={k.colors[1]} />
              </span>
              <span className="hb-admin-heart-text">
                <b>{k.label}</b>
                <small>{fmt(h.points)} לבבות</small>
              </span>
              <span className="hb-admin-heart-finder">
                {finder ? (
                  <>
                    <Avatar player={finder} size="xs" /> {finder.name}
                  </>
                ) : (
                  'לבחירת המוצא/ת ◂'
                )}
              </span>
            </button>
          );
        })}
      </div>
      {heart && (
        <PlayerPicker
          title={`מי מצא את ${heartKind(heart.kind).the}?`}
          players={players}
          ids={ids}
          selected={heart.pid}
          onPick={(pid) => {
            send({ type: 'huntAssign', heartId: heart.id, pid });
            setPicking(null);
          }}
          onClear={() => {
            send({ type: 'huntAssign', heartId: heart.id, pid: null });
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </Section>
  );
};

// ---------- the console ----------

const Console = ({ conn, code, send, onLogout }) => {
  const state = useRoomValue(conn, 'state');
  const view = useRoomValue(conn, 'admin/view');
  const players = useRoomValue(conn, 'players', { throttleMs: 400 }) || {};
  const online = useConnectionStatus(conn);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showJump, setShowJump] = useState(false);

  const flash = (text, good = false) => {
    setMessage({ text, good, at: Date.now() });
  };
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(id);
  }, [message]);

  const run = async (cmd, key) => {
    setBusy(key || cmd.type);
    const res = await send(cmd);
    setBusy(null);
    if (!res.ok) flash(ERRORS[res.error] || 'משהו השתבש - נסו שוב');
    return res;
  };

  const playing = Object.keys(players)
    .filter((pid) => players[pid] && players[pid].name)
    .sort((a, b) => ((state && state.scores && state.scores[b]) || 0) - ((state && state.scores && state.scores[a]) || 0));
  const order = (state && state.stages) || STAGE_IDS;
  const stage = state && stageInfo(state.phase, order);

  if (settings) {
    return (
      <SettingsPanel
        className="is-phone"
        settings={settings.settings}
        started={settings.started}
        onClose={() => setSettings(null)}
        onSave={async (next) => {
          const res = await run({ type: 'saveSettings', settings: next });
          if (res.ok) {
            setSettings(null);
            flash('✅ נשמר! הטלוויזיה עודכנה', true);
          }
        }}
      />
    );
  }

  return (
    <div className="hb-phone hb-admin">
      <PartyBackdrop rays={false} hearts={6} />
      <header className="hb-admin-head">
        <div>
          <div className="hb-admin-title">🎛️ ניהול המשחק</div>
          <div className="hb-admin-sub">
            קוד משחק <b dir="ltr">{code}</b> {online ? '· 🟢 מחובר' : '· 🔴 אין חיבור'}
          </div>
        </div>
        <button type="button" className="hb-btn hb-btn-soft hb-admin-logout" onClick={onLogout}>
          יציאה
        </button>
      </header>

      {message && <div className={`hb-admin-toast ${message.good ? 'is-good' : ''}`}>{message.text}</div>}

      <Section className="hb-admin-now">
        <div className="hb-admin-now-stage">
          <span className="hb-admin-now-icon">{state ? (stage ? stage.icon : state.phase === 'lobby' ? '🏠' : '🎂') : '⏳'}</span>
          <div>
            <b>{!state ? 'מתחברים...' : stage ? `שלב ${stage.num || ''} · ${stage.title}` : state.phase === 'lobby' ? 'לובי' : 'הגמר'}</b>
            <small>{state ? STEP_NAMES[state.step] || state.step : ''}</small>
          </div>
        </div>
        <div className="hb-admin-actions">
          {view && view.actions && view.actions.length ? (
            view.actions.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`hb-btn ${a.primary ? 'hb-btn-primary' : 'hb-btn-soft'} hb-admin-action`}
                disabled={a.disabled || busy === a.key}
                onClick={() => run({ type: 'action', key: a.key, roundId: view.roundId, step: view.step }, a.key)}
                data-testid={`admin-action-${a.key}`}
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))
          ) : (
            <p className="hb-admin-help">אין כרגע כפתורים - המשחק רץ לבד ⏳</p>
          )}
        </div>
        {view && view.concept && (
          <div className="hb-admin-secret">
            🤫 המושג בפנטומימה: <b>{view.concept}</b>
          </div>
        )}
      </Section>

      {state && state.phase === 'hunt' && (state.step === 'search' || state.step === 'results') && <HuntTools state={state} players={players} send={run} />}

      <Section title={`👨‍👩‍👧 משתתפים (${playing.length})`}>
        <div className="hb-admin-players">
          {playing.map((pid) => (
            <div key={pid} className="hb-admin-player">
              <Avatar player={players[pid]} size="xs" />
              <span className="hb-admin-player-name">
                {players[pid].name} <Badges list={state && state.badges ? state.badges[pid] : null} />
              </span>
              <b>{fmt((state && state.scores && state.scores[pid]) || 0)}</b>
              <button
                type="button"
                className="hb-admin-remove"
                aria-label={`הוצאת ${players[pid].name}`}
                onClick={() => {
                  // eslint-disable-next-line no-alert
                  if (window.confirm(`להוציא את ${players[pid].name} מהמשחק?`)) run({ type: 'removePlayer', pid });
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {!playing.length && <p className="hb-admin-help">עוד אין משתתפים</p>}
        </div>
      </Section>

      <Section title="🧭 קפיצה לשלב">
        <button type="button" className="hb-btn hb-btn-soft hb-btn-block" onClick={() => setShowJump((v) => !v)}>
          {showJump ? 'סגירה' : 'לבחירת שלב...'}
        </button>
        {showJump && (
          <div className="hb-admin-jump">
            {stageOrder({ stages: order }).map((id, i) => (
              <button
                key={id}
                type="button"
                className={`hb-btn hb-btn-soft ${state && state.phase === id ? 'is-current' : ''}`}
                onClick={() => {
                  // eslint-disable-next-line no-alert
                  if (window.confirm(`לקפוץ לשלב ${i + 1}: ${stageInfo(id).title}?`)) {
                    setShowJump(false);
                    run({ type: 'goto', phase: id });
                  }
                }}
              >
                {stageInfo(id).icon} {i + 1}. {stageInfo(id).title}
              </button>
            ))}
            <button
              type="button"
              className="hb-btn hb-btn-soft"
              onClick={() => {
                // eslint-disable-next-line no-alert
                if (window.confirm('לקפוץ לגמר?')) {
                  setShowJump(false);
                  run({ type: 'goto', phase: 'finale' });
                }
              }}
            >
              🎂 הגמר
            </button>
          </div>
        )}
      </Section>

      <Section title="⚙️ תוכן והגדרות">
        <button
          type="button"
          className="hb-btn hb-btn-primary hb-btn-block"
          disabled={busy === 'getSettings'}
          onClick={async () => {
            const res = await run({ type: 'getSettings' }, 'getSettings');
            if (res.ok) setSettings(res);
          }}
          data-testid="admin-settings"
        >
          עריכת שאלות, מושגים, לבבות ושלבים
        </button>
      </Section>
    </div>
  );
};

// ---------- login ----------

const Login = ({ code: initialCode, pin: initialPin, error, onSubmit }) => {
  const [code, setCode] = useState(initialCode || '');
  const [pin, setPin] = useState(initialPin || '');
  const valid = isValidRoomCode(code) && /^\d{4,6}$/.test(pin);
  return (
    <div className="hb-phone hb-phone-center hb-admin">
      <PartyBackdrop rays={false} hearts={6} />
      <div className="hb-prep-icon">🎛️</div>
      <h1 className="hb-phone-title">כניסת מנהל/ת המשחק</h1>
      <p className="hb-phone-hint">את הקודים רואים בטלוויזיה: תפריט ☰ ← "שליטה מהטלפון"</p>
      <form
        className="hb-code-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(code, pin);
        }}
      >
        <input
          className="hb-input hb-code-input"
          inputMode="numeric"
          maxLength={ROOM_CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="קוד משחק"
          aria-label="קוד המשחק"
          dir="ltr"
        />
        <input
          className="hb-input hb-code-input"
          inputMode="numeric"
          type="password"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="קוד מנהל"
          aria-label="קוד מנהל"
          dir="ltr"
        />
        {error && <p className="hb-admin-error">{ERRORS[error] || 'אין חיבור - נסו שוב'}</p>}
        <button type="submit" className="hb-btn hb-btn-primary hb-btn-block" disabled={!valid}>
          כניסה
        </button>
      </form>
    </div>
  );
};

const AdminRoom = ({ code, pin, onFail, onLogout }) => {
  const [conn, setConn] = useState(null);
  const [status, setStatus] = useState('connecting');
  useEffect(() => {
    let alive = true;
    connectRoom(code, { role: 'player' })
      .then((c) => alive && setConn(c))
      .catch(() => alive && onFail('offline'));
    return () => {
      alive = false;
    };
  }, [code, onFail]);
  const send = useCommands(conn, pin);
  useEffect(() => {
    if (!conn) return undefined;
    let alive = true;
    send({ type: 'login' }).then((res) => {
      if (!alive) return;
      if (res.ok) setStatus('ok');
      else onFail(res.error);
    });
    return () => {
      alive = false;
    };
  }, [conn, send, onFail]);

  if (status !== 'ok') {
    return (
      <div className="hb-phone hb-phone-center hb-admin">
        <div className="hb-prep-icon">🎛️</div>
        <p className="hb-phone-text">מתחברים לטלוויזיה...</p>
      </div>
    );
  }
  return <Console conn={conn} code={code} send={send} onLogout={onLogout} />;
};

const hashPin = () => {
  const m = /pin=(\d{4,6})/.exec(window.location.hash || '');
  return m ? m[1] : null;
};

const AdminScreens = ({ initialCode }) => {
  const search = useMemo(() => window.location.search, []);
  const [code, setCode] = useState(initialCode);
  const [pin, setPin] = useState(() => {
    const fromLink = hashPin();
    if (fromLink && initialCode) writeJson(pinKey(initialCode), fromLink);
    return fromLink || (initialCode ? readJson(pinKey(initialCode)) : null);
  });
  const [error, setError] = useState(null);
  const tried = useRef(0);

  useEffect(() => {
    // keep the PIN out of the address bar (and the browser history)
    if (window.location.hash) window.history.replaceState(null, '', `${ADMIN_PATH}${code ? `/${code}` : ''}${search}`);
  }, [code, search]);

  const onFail = useCallback(
    (err) => {
      tried.current += 1;
      setError(err || 'offline');
      if (err === 'pin' && code) writeJson(pinKey(code), null);
      setPin(null);
    },
    [code]
  );

  if (!code || !pin) {
    return (
      <Login
        code={code}
        pin={pin}
        error={error}
        onSubmit={(c, p) => {
          writeJson(pinKey(c), p);
          window.history.replaceState(null, '', `${ADMIN_PATH}/${c}${search}`);
          setError(null);
          setCode(c);
          setPin(p);
        }}
      />
    );
  }
  return (
    <AdminRoom
      key={`${code}-${pin}-${tried.current}`}
      code={code}
      pin={pin}
      onFail={onFail}
      onLogout={() => {
        writeJson(pinKey(code), null);
        setPin(null);
      }}
    />
  );
};

const AdminApp = (props) => (
  <ErrorBoundary variant="phone">
    <AdminScreens {...props} />
  </ErrorBoundary>
);

export default AdminApp;
