import React, { useCallback, useEffect, useRef, useState } from 'react';
import { STAGES, stageById } from '../config/game';
import { useServerNow } from '../net/hooks';
import { unlockAudio, setMuted } from '../audio/sfx';
import { readJson, writeJson } from '../lib/storage';
import { meterFraction } from '../lib/scoring';
import { fmt } from '../lib/format';
import BankMeter from '../shared/BankMeter';
import FloatingHearts from '../shared/FloatingHearts';
import Avatar from '../shared/Avatar';
import { LogoHeart, Heart } from '../shared/Heart';
import useWakeLock from '../shared/useWakeLock';
import hostActions from './hostActions';
import useHostEffects from './useHostEffects';
import SettingsPanel from './SettingsPanel';
import { saveSettings } from './settingsStore';
import LobbyScreen from './screens/LobbyScreen';
import TapScreen from './screens/TapScreen';
import TriviaScreen from './screens/TriviaScreen';
import CharadesScreen from './screens/CharadesScreen';
import WordScreen from './screens/WordScreen';
import BlessingsScreen from './screens/BlessingsScreen';
import FinaleScreen from './screens/FinaleScreen';

const MUTE_KEY = 'hb-muted';

const StageDots = ({ phase }) => {
  const current = STAGES.findIndex((s) => s.id === phase);
  const done = phase === 'finale' ? STAGES.length : current;
  return (
    <div className="hb-stage-dots" aria-hidden="true">
      {STAGES.map((s, i) => (
        <Heart key={s.id} className={`hb-stage-dot ${i < done ? 'is-done' : ''} ${i === current ? 'is-current' : ''}`} />
      ))}
    </div>
  );
};

const TopBar = ({ state }) => {
  const stage = stageById(state.phase);
  const name = state.settings.birthdayName;
  return (
    <header className="hb-topbar">
      <div className="hb-topbar-brand">
        <LogoHeart className="hb-topbar-logo" />
        <div>
          <div className="hb-topbar-title">בנק הלבבות של {name}</div>
          {stage && (
            <div className="hb-topbar-stage">
              שלב {stage.num} · {stage.title}
            </div>
          )}
        </div>
      </div>
      <StageDots phase={state.phase} />
      <div className="hb-topbar-meter">
        <BankMeter fraction={meterFraction(state.bank, state.target)} bank={state.bank} name={name} />
      </div>
    </header>
  );
};

// "+1,000 ❤️" chips floating up whenever hearts go into the bank.
const AwardsLayer = ({ awards, players, now }) => {
  const [mountedAt] = useState(now);
  const recent = awards.filter((a) => a.at >= mountedAt && now - a.at < 2600).slice(-8);
  return (
    <div className="hb-awards" aria-hidden="true">
      {recent.map((a, i) => {
        const who = players[a.pid || a.from];
        const x = 30 + ((a.id * 37) % 45); // start somewhere in the middle, fly to the meter (top-left)
        return (
          <div
            key={a.id}
            className="hb-award"
            style={{ '--hb-award-x': `${x}%`, '--hb-award-dx': `${16 - x}vw`, animationDelay: `${i * 0.05}s` }}
          >
            {who && <Avatar player={who} size="xs" />}
            <span>+{fmt(a.amount)}</span>
            <Heart className="hb-award-heart" color="#E11D48" />
          </div>
        );
      })}
    </div>
  );
};

const HostControls = ({ actions, onAction, menu }) => {
  const [open, setOpen] = useState(false);
  const { primary, secondary } = actions;
  return (
    <div className="hb-controls">
      {primary && (
        <button
          type="button"
          className="hb-btn hb-btn-primary hb-btn-lg"
          disabled={primary.disabled}
          onClick={() => onAction(primary.action)}
          data-testid="host-primary"
        >
          <span className="hb-btn-icon">{primary.icon}</span> {primary.label}
        </button>
      )}
      {secondary.map((b) => (
        <button key={b.label} type="button" className="hb-btn hb-btn-soft" onClick={() => onAction(b.action)}>
          <span className="hb-btn-icon">{b.icon}</span> {b.label}
        </button>
      ))}
      <div className="hb-menu-wrap">
        <button
          type="button"
          className="hb-btn hb-btn-soft hb-btn-round"
          aria-label="תפריט"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>
        {open && (
          <div className="hb-menu" role="menu">
            {menu.map((item) =>
              item.divider ? (
                <div key={item.key} className="hb-menu-divider" />
              ) : (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={`hb-menu-item ${item.active ? 'is-active' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    item.run();
                  }}
                >
                  <span className="hb-menu-icon">{item.icon}</span> {item.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const renderScreen = (props) => {
  switch (props.state.phase) {
    case 'lobby':
      return <LobbyScreen {...props} />;
    case 'tap':
      return <TapScreen {...props} />;
    case 'trivia':
      return <TriviaScreen {...props} />;
    case 'charades':
      return <CharadesScreen {...props} />;
    case 'word':
      return <WordScreen {...props} />;
    case 'blessings':
      return <BlessingsScreen {...props} />;
    case 'finale':
      return <FinaleScreen {...props} />;
    default:
      return null;
  }
};

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName));

const HostGame = ({ conn, state, dispatch, mode, onNewGame }) => {
  const now = useServerNow(conn, 200);
  const [muted, setMutedState] = useState(() => readJson(MUTE_KEY) === true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useWakeLock(true);
  useHostEffects(state, now);

  useEffect(() => {
    setMuted(muted);
    writeJson(MUTE_KEY, muted);
  }, [muted]);

  // Audio may only start after a user gesture.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const actions = hostActions(state);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  // Keyboard / TV remote: Enter or Space = the main button.
  useEffect(() => {
    const onKey = (e) => {
      if (settingsOpen || isTyping(e.target) || e.repeat) return;
      if (e.key === 'Enter' || e.key === ' ') {
        const { primary } = actionsRef.current;
        if (primary && !primary.disabled) {
          e.preventDefault();
          dispatch(primary.action);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        setMutedState((m) => !m);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, settingsOpen, toggleFullscreen]);

  const removePlayer = useCallback(
    (pid) => {
      conn.remove(`players/${pid}`);
      dispatch({ type: 'removePlayer', pid });
    },
    [conn, dispatch]
  );

  const menu = [
    { key: 'sound', icon: muted ? '🔇' : '🔊', label: muted ? 'הפעלת צלילים' : 'השתקה', run: () => setMutedState((m) => !m) },
    { key: 'full', icon: '⛶', label: 'מסך מלא', run: toggleFullscreen },
    { key: 'settings', icon: '⚙️', label: 'עריכת תוכן המשחק', run: () => setSettingsOpen(true) },
    { key: 'd1', divider: true },
    ...STAGES.map((s) => ({
      key: `goto-${s.id}`,
      icon: s.icon,
      label: `קפיצה לשלב ${s.num}: ${s.title}`,
      active: state.phase === s.id,
      run: () => dispatch({ type: 'goto', phase: s.id }),
    })),
    { key: 'goto-finale', icon: '🎂', label: 'קפיצה לגמר', active: state.phase === 'finale', run: () => dispatch({ type: 'goto', phase: 'finale' }) },
    { key: 'd2', divider: true },
    {
      key: 'new',
      icon: '🆕',
      label: 'משחק חדש (קוד חדש)',
      run: () => {
        // eslint-disable-next-line no-alert
        if (window.confirm('להתחיל משחק חדש? כל הניקוד יתאפס והטלפונים יצטרכו להצטרף מחדש.')) onNewGame();
      },
    },
  ];

  const showTopBar = state.phase !== 'lobby' && state.phase !== 'finale';
  const screenProps = { conn, state, dispatch, now, mode, onRemovePlayer: removePlayer, onOpenSettings: () => setSettingsOpen(true) };

  return (
    <div className={`hb-tv phase-${state.phase} step-${state.step}`}>
      <FloatingHearts />
      {showTopBar && <TopBar state={state} />}
      <main className="hb-tv-main" key={`${state.phase}`}>
        {renderScreen(screenProps)}
      </main>
      <HostControls actions={actions} onAction={dispatch} menu={menu} />
      {state.phase !== 'lobby' && <AwardsLayer awards={state.awards} players={state.players} now={now} />}
      {settingsOpen && (
        <SettingsPanel
          settings={state.settings}
          started={state.phase !== 'lobby'}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => {
            saveSettings(settings);
            dispatch({ type: 'settings', settings });
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default HostGame;
