import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANSWER_COLORS, heartKind, MAX_BLESSING_LENGTH, stageInfo, stageOrder, STAGE_IDS } from '../config/game';
import { connectRoom } from '../net/room';
import { useConnectionStatus, useRoomValue, useServerNow } from '../net/hooks';
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
import { PHONE_MIC_HEARD_PATH } from '../host/phoneMic';
import usePhoneMic from './usePhoneMic';
import useCooldown, { useConfirmTap } from '../shared/useCooldown';
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
  mark: 'מסמנים את הכרטיסים',
  reveal: 'חשיפת התשובה',
  pick: 'בוחרים מציג',
  ready: 'המציג מתכונן',
  perform: 'מציגים!',
  outcome: 'תוצאה',
  play: 'מפצחים',
  turnDone: 'סוף התור של הקבוצה',
  search: 'מחפשים לבבות',
  write: 'כותבים ברכות',
  results: 'סיכום השלב',
  fill: 'האוצר מתמלא',
  celebrate: 'חגיגה!',
  // the same step in another stage
  'hunt:pick': 'בוחרים לב',
  'hunt:exercise': 'פותרים תרגיל',
  'hunt:reveal': 'הלב נפתח',
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

// Class mode: which card each team raised (the TV's marking panel, on the phone).
const ClassMark = ({ mark, players, send }) => (
  <Section title="✋ איזה כרטיס כל קבוצה הרימה?">
    <div className="hb-admin-mark">
      {(mark.teams || [])
        .filter((t) => players[t.pid])
        .map((t) => (
          <div key={t.pid} className="hb-admin-mark-row">
            <Avatar player={players[t.pid]} size="xs" />
            <span className="hb-admin-mark-name">{players[t.pid].name}</span>
            <span className="hb-admin-mark-cards">
              {Array.from({ length: mark.options }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`hb-admin-mark-card ${t.choice === i ? 'is-on' : ''}`}
                  style={{ background: ANSWER_COLORS[i] }}
                  onClick={() => send({ type: 'classAnswer', pid: t.pid, choice: t.choice === i ? -1 : i }, `mark-${t.pid}`)}
                  aria-label={`${players[t.pid].name}: כרטיס ${i + 1}`}
                  data-testid={`admin-mark-${t.pid}-${i}`}
                >
                  {i + 1}
                </button>
              ))}
            </span>
          </div>
        ))}
    </div>
  </Section>
);

// Class mode's hearts board: the number the team called, then its answer.
// (Firebase drops empty lists: no `picked` before the turn's first pick.)
const ClassHearts = ({ pick, math, send, cooling }) => {
  if (math) {
    const text = `${math.a} ${math.op === '-' ? '−' : '+'} ${math.b}`;
    return (
      <Section title={`💗 לב מספר ${math.n}`}>
        <div className="hb-admin-math" dir="ltr">
          {text} = <b>?</b>
        </div>
        <p className="hb-admin-help">
          התשובה הנכונה: <b>{math.answer}</b> · לחצו על התשובה שהקבוצה אמרה
        </p>
        <div className="hb-admin-pad" dir="ltr">
          {Array.from({ length: 21 }, (_, v) => (
            <button key={v} type="button" className="hb-btn hb-btn-soft" disabled={cooling} onClick={() => send({ type: 'classMath', value: v }, `math-${v}`)} data-testid={`admin-pad-${v}`}>
              {v}
            </button>
          ))}
        </div>
        <button type="button" className="hb-btn hb-btn-soft hb-btn-block" onClick={() => send({ type: 'classMath', value: null }, 'math-none')}>
          🙈 לא יודעים
        </button>
      </Section>
    );
  }
  return (
    <Section title="💗 איזה לב הקבוצה בחרה?">
      <div className="hb-admin-pad" dir="ltr">
        {Array.from({ length: pick.size }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className="hb-btn hb-btn-soft"
            disabled={cooling || (pick.picked || []).includes(n)}
            onClick={() => send({ type: 'classPick', n }, `pick-${n}`)}
            data-testid={`admin-heart-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </Section>
  );
};

// Class mode's blessings: the teacher types the teams' words on the phone too.
const ClassBlessings = ({ blessings, send }) => {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(null);
  const submit = async (word) => {
    const clean = String(word || '').trim();
    if (!clean) return;
    const res = await send({ type: 'classBlessing', text: clean }, 'bless');
    if (res.ok) {
      setSent(clean);
      if (clean === text.trim()) setText('');
    }
  };
  return (
    <Section title={`💌 מילה של ברכה (${blessings.count} בענן)`}>
      <form
        className="hb-admin-bless"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <input
          className="hb-input"
          value={text}
          maxLength={MAX_BLESSING_LENGTH}
          placeholder="מה הקבוצה מאחלת?"
          aria-label="מילה של ברכה"
          onChange={(e) => setText(e.target.value)}
          data-testid="admin-bless-input"
        />
        <button type="submit" className="hb-btn hb-btn-primary hb-btn-block" disabled={!text.trim()} data-testid="admin-bless-send">
          💌 לשלוח לענן
        </button>
      </form>
      {sent && <p className="hb-admin-help is-good">✅ נשלח: {sent}</p>}
      {(blessings.suggestions || []).length > 0 && (
        <>
          <p className="hb-admin-help">או לחיצה על מילה מוכנה:</p>
          <div className="hb-admin-bless-chips">
            {(blessings.suggestions || []).map((w) => (
              <button key={w} type="button" className="hb-btn hb-btn-soft" onClick={() => submit(w)}>
                {w}
              </button>
            ))}
          </div>
        </>
      )}
    </Section>
  );
};

// Class mode's clap stage: the phone listens instead of the computer.
const MIC_STATES = {
  asking: '🎤 אשרו בחלון שנפתח את השימוש במיקרופון',
  blocked: '🔇 המיקרופון חסום לאתר הזה. אפשר לאשר אותו בהגדרות הדפדפן (ליד הכתובת) ולנסות שוב.',
  none: '🔇 לא מצאנו מיקרופון בטלפון הזה.',
  stopped: '⏸️ הטלפון הפסיק להקשיב (המסך כבה, או שאפליקציה אחרת לקחה את המיקרופון).',
};

const TV_HEARS = {
  phone: '✅ המחשב סופר את המחיאות מהטלפון',
  mic: '⚠️ המחשב סופר עכשיו במיקרופון שלו - אפשר לבחור במסך "📱 טלפון"',
  keys: '⚠️ המחשב סופר עכשיו במקש הרווח - אפשר לבחור במסך "📱 טלפון"',
};

const PhoneLevel = ({ level }) => (
  <div className="hb-admin-vu" dir="ltr" aria-hidden="true">
    {Array.from({ length: 16 }, (_, i) => (
      <span key={i} className={level * 16 > i + 0.01 ? 'is-lit' : ''} style={{ '--hb-vu-hue': Math.round(130 - (i / 15) * 130) }} />
    ))}
  </div>
);

const PhoneMic = ({ conn, mic, state }) => {
  const now = useServerNow(conn, 1000);
  const heard = useRoomValue(conn, PHONE_MIC_HEARD_PATH);
  const tvHears = heard && now - Number(heard.at) < 4000 ? heard.input : null;
  const listening = mic.status === 'on' || mic.status === 'paused';
  const data = state.data || {};
  const pid = state.phase === 'tap' && Array.isArray(data.order) ? data.order[data.turn] : null;
  const team = pid && state.teams ? state.teams[pid] : null;
  const claps = mic.turn && mic.turn.roundId === state.roundId ? mic.turn.claps : 0;
  let line = '👂 הטלפון מוכן - הוא יספור את המחיאות בשלב "מטר מחיאות הכפיים".';
  if (state.phase === 'tap') {
    if (team && state.step === 'countdown') line = `⏳ ${team.name} מתכוננים...`;
    else if (team && state.step === 'active') line = `👏 ${team.name}: ${fmt(claps)} מחיאות!`;
    else if (team && state.step === 'turnDone') line = `${team.name}: ${fmt(claps)} מחיאות`;
    else line = '👂 מקשיב... רגע של שקט בכיתה לפני התור הראשון מכוון את המדידה.';
  }
  return (
    <Section title="🎤 מחיאות הכפיים - דרך הטלפון" className="hb-admin-mic">
      {listening ? (
        <>
          <PhoneLevel level={mic.level} />
          {mic.status === 'paused' ? (
            <button type="button" className="hb-btn hb-btn-primary hb-btn-block" onClick={mic.resume}>
              ▶ להמשיך להקשיב
            </button>
          ) : (
            <p className="hb-admin-mic-turn" data-testid="admin-mic-turn">
              {line}
            </p>
          )}
          {(tvHears || state.phase === 'tap') && (
            <p className={`hb-admin-help ${tvHears === 'phone' ? 'is-good' : ''}`} data-testid="admin-mic-tv">
              {TV_HEARS[tvHears] || '⏳ מחכים שהמחשב יתחבר לטלפון...'}
            </p>
          )}
          <button type="button" className="hb-btn hb-btn-soft hb-btn-block" onClick={mic.stop} data-testid="admin-mic-stop">
            ⏹ להפסיק להקשיב
          </button>
        </>
      ) : (
        <>
          <p className="hb-admin-help">
            {MIC_STATES[mic.status] || 'הטלפון יכול להקשיב למחיאות הכפיים במקום המחשב: מחזיקים אותו מול הקבוצה שבתור, כ-2 מטרים ממנה - באותו מרחק לכל הקבוצות.'}
          </p>
          {mic.status !== 'asking' && mic.status !== 'none' && (
            <button type="button" className="hb-btn hb-btn-primary hb-btn-block" onClick={mic.start} data-testid="admin-mic-start">
              {mic.status === 'off' ? '🎤 הטלפון מקשיב' : '🎤 להקשיב שוב'}
            </button>
          )}
        </>
      )}
    </Section>
  );
};

// Class mode: a new charades turn pops the secret concept up big, so the
// teacher can show the phone to the child who comes up to act it.
const ConceptPopup = ({ concept, team, onClose }) => (
  <div className="hb-admin-popup" role="dialog" aria-modal="true" data-testid="admin-concept-popup">
    <div className="hb-admin-popup-card">
      <div className="hb-admin-popup-label">🤫 הַמּוּשָּׂג הַסּוֹדִי{team ? ` · ${team.name}` : ''}</div>
      <div className="hb-admin-popup-concept">{concept}</div>
      <button type="button" className="hb-btn hb-btn-primary hb-btn-block" onClick={onClose} data-testid="admin-concept-close">
        ✔ הבנתי - סגירה
      </button>
    </div>
  </div>
);

// ---------- the console ----------

const Console = ({ conn, code, pin, send, onLogout }) => {
  const state = useRoomValue(conn, 'state');
  const view = useRoomValue(conn, 'admin/view');
  const joined = useRoomValue(conn, 'players', { throttleMs: 400 }) || {};
  // class mode: the teams come with the state (no phones join)
  const classMode = Boolean(state && state.classMode);
  const players = (classMode && state.teams) || joined;
  const online = useConnectionStatus(conn);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showJump, setShowJump] = useState(false);
  const mic = usePhoneMic(conn, state, pin);
  // the buttons rest a moment after each step; ending or skipping a turn asks for a second tap
  const stepKey = view ? `${view.phase}:${view.step}:${view.roundId}` : '';
  const cooling = useCooldown(stepKey);
  const confirm = useConfirmTap(stepKey);
  // the charades concept pops up once per turn (and again on a tap)
  const [closedConcept, setClosedConcept] = useState(null);
  const conceptKey = view && view.concept ? `${view.roundId}:${view.concept}` : null;
  const conceptPopup = classMode && conceptKey && view.step !== 'outcome' && closedConcept !== conceptKey;
  // the phone listens in the clap stage (it can start in the lobby), and stops after it
  const micStage =
    classMode && (state.stages || []).includes('tap') && (state.phase === 'lobby' || (state.phase === 'tap' && state.step !== 'results'));
  const { status: micStatus, stop: stopMic } = mic;
  useEffect(() => {
    if (!micStage && micStatus !== 'off') stopMic();
  }, [micStage, micStatus, stopMic]);

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
  const stage = state && stageInfo(state.phase, order, classMode);

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
            <small>{state ? STEP_NAMES[`${state.phase}:${state.step}`] || STEP_NAMES[state.step] || state.step : ''}</small>
          </div>
        </div>
        <div className="hb-admin-actions">
          {view && view.actions && view.actions.length ? (
            view.actions.map((a) => {
              const armed = confirm.armed === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  className={`hb-btn ${a.primary ? 'hb-btn-primary' : 'hb-btn-soft'} hb-admin-action ${armed ? 'is-armed' : ''}`}
                  disabled={a.disabled || busy === a.key || cooling}
                  onClick={() => {
                    if (confirm.tap(a.key, a.confirm)) run({ type: 'action', key: a.key, roundId: view.roundId, step: view.step }, a.key);
                  }}
                  data-testid={`admin-action-${a.key}`}
                >
                  <span>{armed ? '⚠️' : a.heart ? <GlossyHeart from={a.heart[0]} to={a.heart[1]} /> : a.icon}</span>{' '}
                  {armed ? `לחצו שוב: ${a.label}` : a.label}
                </button>
              );
            })
          ) : (
            <p className="hb-admin-help">{view && (view.huntMath || view.huntPick || view.blessings) ? '👇 ממשיכים למטה' : 'אין כרגע כפתורים - המשחק רץ לבד ⏳'}</p>
          )}
        </div>
        {view && view.concept && (
          <button type="button" className="hb-admin-secret" onClick={() => setClosedConcept(null)} data-testid="admin-concept">
            🤫 המושג בפנטומימה: <b>{view.concept}</b>
            {classMode && <small> · 👁 להראות בגדול</small>}
          </button>
        )}
        {view && view.answer && (
          <div className="hb-admin-secret" data-testid="admin-word-answer">
            🔤 התשובה: <b>{view.answer}</b>
          </div>
        )}
      </Section>

      {micStage && <PhoneMic conn={conn} mic={mic} state={state} />}

      {conceptPopup && (
        <ConceptPopup
          concept={view.concept}
          team={state.data && players[state.data.performerId]}
          onClose={() => setClosedConcept(conceptKey)}
        />
      )}

      {view && view.mark && <ClassMark mark={view.mark} players={players} send={run} />}

      {view && view.blessings && <ClassBlessings blessings={view.blessings} send={run} />}

      {view && (view.huntPick || view.huntMath) && <ClassHearts pick={view.huntPick} math={view.huntMath} send={run} cooling={cooling} />}

      {state && !classMode && state.phase === 'hunt' && (state.step === 'search' || state.step === 'results') && (
        <HuntTools state={state} players={players} send={run} />
      )}

      <Section title={classMode ? `🏫 קבוצות (${playing.length})` : `👨‍👩‍👧 משתתפים (${playing.length})`}>
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
                  if (window.confirm(`לקפוץ לשלב ${i + 1}: ${stageInfo(id, undefined, classMode).title}?`)) {
                    setShowJump(false);
                    run({ type: 'goto', phase: id });
                  }
                }}
              >
                {stageInfo(id).icon} {i + 1}. {stageInfo(id, undefined, classMode).title}
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
  return <Console conn={conn} code={code} pin={pin} send={send} onLogout={onLogout} />;
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
