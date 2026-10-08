import { useEffect, useRef } from 'react';
import { normalizeSettings } from '../config/content';
import { avatarById } from '../config/avatars';
import { teamColor } from '../config/teams';
import { playerIds } from '../engine/engine';
import hostActions from './hostActions';

const MAX_AGE_MS = 2 * 60 * 1000;

// What the admin's phone sees: the TV's current buttons, plus the secret
// charades concept so the admin can judge (rooms/<code>/admin/view).
export const adminView = (s) => {
  const { primary, secondary, teamPick } = hostActions(s);
  const actions = [];
  if (primary) actions.push({ key: 'primary', icon: primary.icon, label: primary.label, disabled: Boolean(primary.disabled), primary: true });
  if (teamPick) {
    playerIds(s).forEach((pid) => {
      const team = s.players[pid];
      const color = teamColor(team.color);
      // a team's heart (the phone draws it in the team's colors)
      actions.push({ key: `team:${pid}`, icon: color ? '' : avatarById(team.avatar).emoji, heart: color ? color.colors : null, label: teamPick.label(team.name) });
    });
  }
  secondary.forEach((b, i) => actions.push({ key: `s${i}`, icon: b.icon, label: b.label, disabled: Boolean(b.disabled), confirm: Boolean(b.confirm) }));
  const cur = s.phase === 'charades' && s.charades && s.charades.current;
  const question = s.phase === 'trivia' && s.trivia && s.trivia.current;
  const word = s.phase === 'word' && s.word && s.word.current;
  const hunt = s.classMode && s.phase === 'hunt' && s.hunt && s.hunt.math ? s.hunt : null;
  return {
    phase: s.phase,
    step: s.step,
    roundId: s.roundId,
    actions,
    concept: cur && ['pick', 'ready', 'perform', 'outcome'].includes(s.step) ? cur.concept : null,
    // class mode: the teacher checks the word the teams call out
    answer: s.classMode && word && (s.step === 'countdown' || s.step === 'play') ? word.answer : null,
    // class mode's hearts board: the numbers a team can still call, then the exercise (and its answer)
    huntPick: hunt && s.step === 'pick' ? { picked: hunt.picks.filter((p) => p.board === hunt.turn).map((p) => p.n), size: hunt.boards[hunt.turn].hearts.length } : null,
    huntMath: hunt && s.step === 'exercise' && hunt.current ? { n: hunt.current.n, a: hunt.current.a, b: hunt.current.b, op: hunt.current.op, answer: hunt.current.answer } : null,
    // class mode: the blessing words, typed on the phone too
    blessings:
      s.classMode && s.phase === 'blessings' && s.step === 'write' && s.blessings
        ? { count: s.blessings.list.length, suggestions: s.settings.blessingSuggestions || [] }
        : null,
    // class mode: the cards the teams raised, entered from the phone too
    mark:
      s.classMode && question && (s.step === 'question' || s.step === 'mark')
        ? {
            options: question.options.length,
            teams: playerIds(s).map((pid) => ({
              pid,
              choice: s.inputs[pid] && Number.isInteger(s.inputs[pid].choice) ? s.inputs[pid].choice : -1,
            })),
          }
        : null,
  };
};

const findAction = (s, key) => {
  const { primary, secondary, teamPick } = hostActions(s);
  if (key === 'primary') return primary && !primary.disabled ? primary.action : null;
  if (String(key).startsWith('team:')) {
    const pid = String(key).slice(5);
    return teamPick && s.players[pid] ? teamPick.action(pid) : null;
  }
  const b = secondary[Number(String(key).slice(1))];
  return b && !b.disabled ? b.action : null;
};

// The admin's phone sends commands to rooms/<code>/admin/cmd/<id>, each with
// the admin PIN; the TV runs the valid ones and answers in admin/ack/<id>.
const useAdminBridge = ({ conn, state, dispatch, onSaveSettings, onRemovePlayer }) => {
  const stateRef = useRef(state);
  stateRef.current = state;
  const handlers = useRef({ onSaveSettings, onRemovePlayer });
  handlers.current = { onSaveSettings, onRemovePlayer };

  // publish the view when it changes
  const published = useRef('');
  useEffect(() => {
    const json = JSON.stringify(adminView(state));
    if (json === published.current) return;
    published.current = json;
    conn.set('admin/view', JSON.parse(json));
  }, [conn, state]);

  useEffect(() => {
    const done = new Set();
    const reply = (id, result) => conn.set(`admin/ack/${id}`, { ...result, at: conn.serverNow() });

    const run = (cmd) => {
      const s = stateRef.current;
      switch (cmd.type) {
        case 'login':
          return { ok: true, name: s.settings.birthdayName };
        case 'action': {
          if (cmd.roundId !== s.roundId || cmd.step !== s.step) return { ok: false, error: 'stale' };
          const action = findAction(s, cmd.key);
          if (!action) return { ok: false, error: 'unavailable' };
          dispatch(action);
          return { ok: true };
        }
        case 'huntAssign':
          dispatch({ type: 'huntAssign', heartId: String(cmd.heartId || ''), pid: cmd.pid || null });
          return { ok: true };
        case 'classAnswer':
          if (!s.classMode || !s.players[cmd.pid]) return { ok: false, error: 'unknown' };
          dispatch({ type: 'classAnswer', pid: String(cmd.pid), choice: Number(cmd.choice) });
          return { ok: true };
        case 'classPick':
          if (!s.classMode) return { ok: false, error: 'unknown' };
          dispatch({ type: 'classPick', n: Number(cmd.n) });
          return { ok: true };
        case 'classMath':
          if (!s.classMode) return { ok: false, error: 'unknown' };
          dispatch({ type: 'classMath', value: cmd.value === null || cmd.value === undefined ? null : Number(cmd.value) });
          return { ok: true };
        case 'classBlessing': {
          if (!s.classMode) return { ok: false, error: 'unknown' };
          const next = dispatch({ type: 'classBlessing', text: String(cmd.text || '') });
          return next === s ? { ok: false, error: 'unavailable' } : { ok: true };
        }
        case 'goto':
          dispatch({ type: 'goto', phase: String(cmd.phase || '') });
          return { ok: true };
        case 'removePlayer':
          if (!s.players[cmd.pid]) return { ok: false, error: 'unknown' };
          handlers.current.onRemovePlayer(cmd.pid);
          return { ok: true };
        case 'getSettings':
          return { ok: true, settings: s.settings, started: s.phase !== 'lobby' };
        case 'saveSettings':
          if (!cmd.settings || typeof cmd.settings !== 'object') return { ok: false, error: 'bad' };
          handlers.current.onSaveSettings(normalizeSettings(cmd.settings));
          return { ok: true };
        default:
          return { ok: false, error: 'unknown' };
      }
    };

    return conn.subscribe('admin/cmd', (cmds) => {
      Object.entries(cmds || {}).forEach(([id, cmd]) => {
        if (done.has(id)) return;
        done.add(id);
        conn.remove(`admin/cmd/${id}`);
        if (!cmd || typeof cmd !== 'object') return;
        if (Number(cmd.at) < conn.serverNow() - MAX_AGE_MS) return; // left over from before a refresh
        if (String(cmd.pin || '') !== String(stateRef.current.settings.adminPin || '')) {
          reply(id, { ok: false, error: 'pin' });
          return;
        }
        let result;
        try {
          result = run(cmd);
        } catch (e) {
          result = { ok: false, error: 'failed' };
        }
        reply(id, result);
      });
    });
  }, [conn, dispatch]);
};

export default useAdminBridge;
