import React, { useState } from 'react';
import { ANSWER_COLORS, DEFAULT_BASKET, DEFAULT_TIMINGS, HEART_KINDS, STAGES, basketSettings, huntKind } from '../config/game';
import { createDefaultSettings, normalizeSettings } from '../config/content';
import { Heart } from '../shared/Heart';

const TABS = [
  { id: 'general', label: '🎂 כללי' },
  { id: 'trivia', label: '💡 שאלות טריוויה' },
  { id: 'charades', label: '🎭 מושגים לפנטומימה' },
  { id: 'words', label: '🔤 מילים לפיצוח' },
  { id: 'blessings', label: '💌 הצעות לברכות' },
  { id: 'hunt', label: '🔎 ציידי הלבבות' },
  { id: 'basket', label: '🧺 קליעה ללב' },
  { id: 'timings', label: '⏱ זמנים' },
];

const TIMING_FIELDS = [
  ['tapSeconds', 'לחיצה מהירה - שניות', 10, 180],
  ['triviaReadSeconds', 'טריוויה - זמן קריאה לפני התשובות', 0, 20],
  ['triviaAnswerSeconds', 'טריוויה - שניות לענות', 5, 60],
  ['charadesRounds', 'פנטומימה - מספר סיבובים', 1, 20],
  ['charadesSeconds', 'פנטומימה - שניות להצגה', 20, 240],
  ['wordSeconds', 'פיצוח מילה - שניות', 20, 300],
  ['wordRevealEverySeconds', 'פיצוח מילה - רמז (אות) כל X שניות, 0 = בלי', 0, 120],
  ['blessingsPerPlayer', 'ברכות לכל משתתף', 1, 10],
];

const linesToList = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const TriviaEditor = ({ trivia, onChange }) => {
  const update = (i, patch) => onChange(trivia.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const setOption = (i, o, value) => {
    const options = [0, 1, 2, 3].map((k) => (trivia[i].options || [])[k] || '');
    options[o] = value;
    update(i, { options });
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= trivia.length) return;
    const next = trivia.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  // the list is a pool: only the questions marked "בחידון" are asked
  const playing = trivia.filter((q) => !q.off).length;
  const setAll = (on) => onChange(trivia.map((q) => ({ ...q, off: !on })));
  return (
    <div className="hb-set-trivia">
      <p className="hb-set-help">
        כתבו שאלות על בעל/ת השמחה, 4 תשובות, וסמנו את הנכונה (העיגול הירוק). שאלה בלי סימון "בחידון" נשארת במאגר ולא נשאלת.
      </p>
      <div className="hb-set-pool">
        <strong data-testid="trivia-playing">
          ✅ {playing} מתוך {trivia.length} שאלות בחידון
        </strong>
        <button type="button" className="hb-btn hb-btn-soft" onClick={() => setAll(true)}>
          לסמן הכול
        </button>
        <button type="button" className="hb-btn hb-btn-soft" onClick={() => setAll(false)}>
          לבטל הכול
        </button>
      </div>
      {trivia.map((q, i) => (
        <div key={i} className={`hb-set-question ${q.off ? 'is-off' : ''}`}>
          <div className="hb-set-question-head">
            <span className="hb-set-num">{i + 1}</span>
            <label className={`hb-set-toggle ${q.off ? '' : 'is-on'}`}>
              <input type="checkbox" checked={!q.off} onChange={(e) => update(i, { off: !e.target.checked })} data-testid={`trivia-on-${i}`} />
              בחידון
            </label>
            <input
              className="hb-input"
              value={q.q}
              placeholder="השאלה"
              onChange={(e) => update(i, { q: e.target.value })}
              aria-label={`שאלה ${i + 1}`}
            />
            <button type="button" className="hb-icon-btn" onClick={() => move(i, -1)} aria-label="למעלה">
              ▲
            </button>
            <button type="button" className="hb-icon-btn" onClick={() => move(i, 1)} aria-label="למטה">
              ▼
            </button>
            {/* built-in questions are turned off rather than deleted */}
            {!q.id && (
              <button type="button" className="hb-icon-btn is-danger" onClick={() => onChange(trivia.filter((_, k) => k !== i))} aria-label="מחיקה">
                🗑
              </button>
            )}
          </div>
          <div className="hb-set-options">
            {[0, 1, 2, 3].map((o) => (
              <label key={o} className={`hb-set-option ${Number(q.correct) === o ? 'is-correct' : ''}`}>
                <input type="radio" name={`correct-${i}`} checked={Number(q.correct) === o} onChange={() => update(i, { correct: o })} />
                <Heart color={ANSWER_COLORS[o]} className="hb-set-option-heart" />
                <input
                  className="hb-input"
                  value={(q.options || [])[o] || ''}
                  placeholder={`תשובה ${o + 1}`}
                  onChange={(e) => setOption(i, o, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="hb-btn hb-btn-soft"
        onClick={() => onChange([...trivia, { q: '', options: ['', '', '', ''], correct: 0 }])}
      >
        ➕ שאלה חדשה
      </button>
    </div>
  );
};

const WordsEditor = ({ words, onChange }) => {
  const update = (i, patch) => onChange(words.map((w, k) => (k === i ? { ...w, ...patch } : w)));
  return (
    <div>
      <p className="hb-set-help">המילה (אפשר גם שתי מילים, כמו "מזל טוב") והרמז שיופיע בטלוויזיה.</p>
      {words.map((w, i) => (
        <div key={i} className="hb-set-row">
          <input className="hb-input hb-input-short" value={w.word} placeholder="מילה" onChange={(e) => update(i, { word: e.target.value })} />
          <input className="hb-input" value={w.hint} placeholder="רמז" onChange={(e) => update(i, { hint: e.target.value })} />
          <button type="button" className="hb-icon-btn is-danger" onClick={() => onChange(words.filter((_, k) => k !== i))} aria-label="מחיקה">
            🗑
          </button>
        </div>
      ))}
      <button type="button" className="hb-btn hb-btn-soft" onClick={() => onChange([...words, { word: '', hint: '' }])}>
        ➕ מילה חדשה
      </button>
    </div>
  );
};

const ListEditor = ({ help, items, onChange, rows = 14 }) => {
  const [text, setText] = useState(items.join('\n'));
  return (
    <div>
      <p className="hb-set-help">{help}</p>
      <textarea
        className="hb-input hb-textarea"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(linesToList(e.target.value));
        }}
      />
    </div>
  );
};

const NumberField = ({ label, value, min, max, step = 1, onChange, help }) => (
  <label className="hb-field">
    <span>{label}</span>
    <input
      className="hb-input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
    />
    {help && <small>{help}</small>}
  </label>
);

const HuntEditor = ({ hunt, onChange }) => {
  const settings = { hunt };
  const setKind = (kind, patch) => onChange({ ...hunt, [kind]: { ...huntKind(settings, kind), ...patch } });
  return (
    <div>
      <p className="hb-set-help">כמה לבבות מכל צבע מחביאים בבית, וכמה כל לב שווה. כשמישהו מוצא לב - משייכים אותו אליו מהטלפון של המנהל (או בלחיצה על הלב בטלוויזיה).</p>
      <div className="hb-set-grid">
        {HEART_KINDS.map((k) => (
          <div key={k.id} className="hb-set-question">
            <strong>{k.label}</strong>
            <NumberField label="כמה לבבות" value={huntKind(settings, k.id).count} min={0} max={12} onChange={(count) => setKind(k.id, { count })} />
            <NumberField label="לבבות לבנק על כל אחד" value={huntKind(settings, k.id).points} min={0} max={50000} step={100} onChange={(points) => setKind(k.id, { points })} />
          </div>
        ))}
        <NumberField label="זמן לחיפוש בדקות (0 = בלי שעון)" value={Number(hunt.minutes) || 0} min={0} max={60} onChange={(minutes) => onChange({ ...hunt, minutes })} />
      </div>
    </div>
  );
};

const BasketEditor = ({ basket, onChange }) => {
  const b = basketSettings({ basket });
  return (
    <div>
      <p className="hb-set-help">כל משתתף בתורו זורק לבבות לסל, והמנהל מסמן כל זריקה (נכנס / פספוס).</p>
      <div className="hb-set-grid">
        <NumberField label="זריקות לכל משתתף" value={b.throws} min={1} max={10} onChange={(throws) => onChange({ ...b, throws })} help={`ברירת מחדל: ${DEFAULT_BASKET.throws}`} />
        <NumberField label="לבבות על כל קליעה" value={b.hitPoints} min={0} max={20000} step={100} onChange={(hitPoints) => onChange({ ...b, hitPoints })} help={`ברירת מחדל: ${DEFAULT_BASKET.hitPoints}`} />
        <NumberField label="בונוס כשהכל נכנס" value={b.perfectBonus} min={0} max={20000} step={100} onChange={(perfectBonus) => onChange({ ...b, perfectBonus })} help={`ברירת מחדל: ${DEFAULT_BASKET.perfectBonus}`} />
      </div>
    </div>
  );
};

const StagesPicker = ({ stages, onChange }) => (
  <div className="hb-field hb-set-stages">
    <span>השלבים במשחק (אפשר לכבות שלב)</span>
    {STAGES.map((st) => (
      <label key={st.id} className="hb-set-check">
        <input
          type="checkbox"
          checked={stages.includes(st.id)}
          onChange={(e) => onChange(e.target.checked ? [...stages, st.id] : stages.filter((id) => id !== st.id))}
        />
        {st.icon} {st.title}
      </label>
    ))}
  </div>
);

const SettingsPanel = ({ settings, started, onClose, onSave, className = '' }) => {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [tab, setTab] = useState('general');
  const [resetKey, setResetKey] = useState(0);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setTiming = (key, value) => setDraft((d) => ({ ...d, timings: { ...d.timings, [key]: value } }));

  return (
    <div className={`hb-settings-backdrop ${className}`} role="dialog" aria-modal="true" aria-label="עריכת תוכן המשחק">
      <div className="hb-settings">
        <header className="hb-settings-head">
          <h2>⚙️ עריכת תוכן המשחק</h2>
          <button type="button" className="hb-icon-btn" onClick={onClose} aria-label="סגירה">
            ✕
          </button>
        </header>
        {started && <div className="hb-settings-note">המשחק כבר התחיל - השינויים ייכנסו לתוקף מהסיבוב הבא.</div>}
        <nav className="hb-settings-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`hb-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="hb-settings-body" key={`${tab}-${resetKey}`}>
          {tab === 'general' && (
            <div className="hb-set-grid">
              <label className="hb-field">
                <span>שם חתן/כלת השמחה</span>
                <input className="hb-input" value={draft.birthdayName} maxLength={20} onChange={(e) => set({ birthdayName: e.target.value })} />
              </label>
              <label className="hb-field">
                <span>גיל</span>
                <input className="hb-input" type="number" min="1" max="120" value={draft.age || ''} onChange={(e) => set({ age: Number(e.target.value) || 0 })} />
              </label>
              <label className="hb-field">
                <span>יעד הבנק בלבבות (0 = אוטומטי לפי מספר המשתתפים)</span>
                <input
                  className="hb-input"
                  type="number"
                  min="0"
                  step="1000"
                  value={draft.bankTarget || 0}
                  onChange={(e) => set({ bankTarget: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <label className="hb-field">
                <span>קוד מנהל (4-6 ספרות) - לכניסה מהטלפון</span>
                <input
                  className="hb-input"
                  inputMode="numeric"
                  maxLength={6}
                  value={draft.adminPin || ''}
                  onChange={(e) => set({ adminPin: e.target.value.replace(/\D/g, '') })}
                />
              </label>
              <StagesPicker stages={draft.stages || STAGES.map((st) => st.id)} onChange={(stages) => set({ stages })} />
            </div>
          )}
          {tab === 'hunt' && <HuntEditor hunt={draft.hunt || {}} onChange={(hunt) => set({ hunt })} />}
          {tab === 'basket' && <BasketEditor basket={draft.basket || {}} onChange={(basket) => set({ basket })} />}
          {tab === 'trivia' && <TriviaEditor trivia={draft.trivia} onChange={(trivia) => set({ trivia })} />}
          {tab === 'charades' && (
            <ListEditor
              help="מושג אחד בכל שורה. המציג מקבל מושג אקראי לטלפון (ואפשר להחליף עד פעמיים)."
              items={draft.charades}
              onChange={(charades) => set({ charades })}
            />
          )}
          {tab === 'words' && <WordsEditor words={draft.words} onChange={(words) => set({ words })} />}
          {tab === 'blessings' && (
            <ListEditor
              help="מילים שמופיעות כהצעות בטלפון (לילדים שעוד לא כותבים מהר). אחת בכל שורה."
              items={draft.blessingSuggestions}
              onChange={(blessingSuggestions) => set({ blessingSuggestions })}
              rows={10}
            />
          )}
          {tab === 'timings' && (
            <div className="hb-set-grid">
              {TIMING_FIELDS.map(([key, label, min, max]) => (
                <label key={key} className="hb-field">
                  <span>{label}</span>
                  <input
                    className="hb-input"
                    type="number"
                    min={min}
                    max={max}
                    value={draft.timings[key]}
                    onChange={(e) => setTiming(key, Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
                  />
                  <small>ברירת מחדל: {DEFAULT_TIMINGS[key]}</small>
                </label>
              ))}
            </div>
          )}
        </div>
        <footer className="hb-settings-foot">
          <button type="button" className="hb-btn hb-btn-primary" onClick={() => onSave(normalizeSettings(draft))}>
            💾 שמירה
          </button>
          <button type="button" className="hb-btn hb-btn-soft" onClick={onClose}>
            ביטול
          </button>
          <button
            type="button"
            className="hb-link-btn"
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm('לחזור לתוכן המקורי? השינויים שלכם יימחקו.')) {
                // the admin phone stays logged in: keep this TV's PIN
                setDraft({ ...createDefaultSettings(), adminPin: draft.adminPin });
                setResetKey((k) => k + 1);
              }
            }}
          >
            ↺ חזרה לברירת המחדל
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsPanel;
