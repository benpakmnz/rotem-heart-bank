import React, { useCallback, useEffect, useRef, useState } from 'react';
import { stageInfo, stageOrder } from '../config/game';
import { useServerNow } from '../net/hooks';
import { play, unlockAudio, setMuted } from '../audio/sfx';
import { setMusicEnabled, setMusicTrack } from '../audio/music';
import { trackFor } from '../audio/tracks';
import { readJson, writeJson } from '../lib/storage';
import { meterFraction } from '../lib/scoring';
import { fmt } from '../lib/format';
import BankMeter from '../shared/BankMeter';
import PartyBackdrop from '../shared/PartyBackdrop';
import HeartSwipe from '../shared/HeartSwipe';
import RotemPhoto from '../shared/RotemPhoto';
import Avatar from '../shared/Avatar';
import { Heart } from '../shared/Heart';
import useWakeLock from '../shared/useWakeLock';
import { initialLiteFx, saveLiteFx, setLiteFx } from '../lib/effects';
import hostActions from './hostActions';
import useHostEffects from './useHostEffects';
import SettingsPanel from './SettingsPanel';
import AdminInvite from './AdminInvite';
import useAdminBridge from './useAdminBridge';
import { saveSettings } from './settingsStore';
import LobbyScreen from './screens/LobbyScreen';
import TapScreen from './screens/TapScreen';
import TriviaScreen from './screens/TriviaScreen';
import CharadesScreen from './screens/CharadesScreen';
import WordScreen from './screens/WordScreen';
import BlessingsScreen from './screens/BlessingsScreen';
import FinaleScreen from './screens/FinaleScreen';
import HuntScreen from './screens/HuntScreen';
import BasketScreen from './screens/BasketScreen';
import { playerBadges } from '../engine/engine';

const MUTE_KEY = 'hb-muted';
const MUSIC_KEY = 'hb-music-off';

const StageDots = ({ phase, order }) => {
  const current = order.indexOf(phase);
  const done = phase === 'finale' ? order.length : current;
  return (
    <div className="hb-stage-dots" aria-hidden="true">
      {order.map((id, i) => (
        <div key={id} className={`hb-stage-dot ${i < done ? 'is-done' : ''} ${i === current ? 'is-current' : ''}`}>
          <Heart />
          <span>{i < done ? '✓' : i + 1}</span>
        </div>
      ))}
    </div>
  );
};

const TopBar = ({ state }) => {
  const order = stageOrder(state.settings);
  const stage = stageInfo(state.phase, order);
  const name = state.settings.birthdayName;
  return (
    <header className="hb-topbar">
      <div className="hb-topbar-brand">
        <RotemPhoto size="sm" crown={false} sparkles={false} />
        <div>
          <div className="hb-topbar-title">בנק הלבבות של {name}</div>
          {stage && (
            <div className="hb-topbar-stage">
              {stage.icon} {stage.num ? `שלב ${stage.num} · ` : ''}
              {stage.title}
            </div>
          )}
        </div>
      </div>
      <StageDots phase={state.phase} order={order} />
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
  // an empty full-screen layer still costs the TV a screenful of graphics memory
  if (!recent.length) return null;
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
            <Heart className="hb-award-heart" color="#F0145A" />
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
        <button key={b.label} type="button" className="hb-btn hb-btn-soft" disabled={b.disabled} onClick={() => onAction(b.action)}>
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

// The TV screen can also run on a phone that is mirrored to the TV. It is
// landscape-only; CSS shows this over it when a small screen is upright.
const RotateHint = () => (
  <div className="hb-rotate" role="alert">
    <div className="hb-rotate-phone" aria-hidden="true">
      📱
    </div>
    <strong>סובבו את הטלפון לרוחב</strong>
    <span>מסך הטלוויזיה בנוי לרוחב - ככה הוא גם ימלא את הטלוויזיה כשמשקפים אליה.</span>
    <small>המסך לא מסתובב? בטלו את נעילת הסיבוב של הטלפון.</small>
  </div>
);

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
    case 'hunt':
      return <HuntScreen {...props} />;
    case 'basket':
      return <BasketScreen {...props} />;
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
  const [musicOn, setMusicOn] = useState(() => readJson(MUSIC_KEY) !== true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [liteFx, setLiteFxState] = useState(initialLiteFx);
  setLiteFx(liteFx); // canvases and confetti read it outside React
  useWakeLock(true);
  useHostEffects(state, now);

  useEffect(() => {
    setMuted(muted);
    writeJson(MUTE_KEY, muted);
  }, [muted]);

  useEffect(() => {
    setMusicEnabled(musicOn);
    writeJson(MUSIC_KEY, !musicOn);
  }, [musicOn]);

  // A soundtrack for every part of the game (see audio/tracks.js).
  useEffect(() => setMusicTrack(trackFor(state.phase, state.step)), [state.phase, state.step]);
  useEffect(() => () => setMusicTrack(null), []);

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

  const applySettings = useCallback(
    (settings) => {
      saveSettings(settings);
      dispatch({ type: 'settings', settings });
    },
    [dispatch]
  );
  useAdminBridge({ conn, state, dispatch, onSaveSettings: applySettings, onRemovePlayer: removePlayer });

  const menu = [
    { key: 'sound', icon: muted ? '🔇' : '🔊', label: muted ? 'הפעלת צלילים' : 'השתקה', run: () => setMutedState((m) => !m) },
    { key: 'music', icon: musicOn ? '🎵' : '🎶', label: musicOn ? 'כיבוי המוזיקה' : 'הפעלת המוזיקה', run: () => setMusicOn((m) => !m) },
    { key: 'full', icon: '⛶', label: 'מסך מלא', run: toggleFullscreen },
    {
      key: 'fx',
      icon: liteFx ? '✨' : '🪶',
      label: liteFx ? 'אפקטים מלאים (למחשב)' : 'אפקטים חסכוניים (לטלוויזיה)',
      run: () =>
        setLiteFxState((v) => {
          saveLiteFx(!v);
          return !v;
        }),
    },
    { key: 'settings', icon: '⚙️', label: 'עריכת תוכן המשחק', run: () => setSettingsOpen(true) },
    { key: 'admin', icon: '📱', label: 'שליטה מהטלפון (מנהל/ת)', run: () => setAdminOpen(true) },
    { key: 'd1', divider: true },
    ...stageOrder(state.settings).map((id, i) => ({
      key: `goto-${id}`,
      icon: stageInfo(id).icon,
      label: `קפיצה לשלב ${i + 1}: ${stageInfo(id).title}`,
      active: state.phase === id,
      run: () => dispatch({ type: 'goto', phase: id }),
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
  const screenProps = {
    conn,
    state,
    dispatch,
    now,
    mode,
    badges: playerBadges(state),
    onRemovePlayer: removePlayer,
    onOpenSettings: () => setSettingsOpen(true),
    onOpenAdmin: () => setAdminOpen(true),
  };

  return (
    <div className={`hb-tv phase-${state.phase} step-${state.step} ${liteFx ? 'fx-lite' : ''}`}>
      <PartyBackdrop lite={liteFx} balloons={state.phase === 'lobby' || state.phase === 'finale'} />
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
            applySettings(settings);
            setSettingsOpen(false);
          }}
        />
      )}
      {adminOpen && <AdminInvite code={state.roomCode} pin={state.settings.adminPin} local={mode === 'local'} onClose={() => setAdminOpen(false)} />}
      <HeartSwipe stage={state.phase} lite={liteFx} onSwipe={() => play('whoosh')} />
      <RotateHint />
    </div>
  );
};

export default HostGame;
