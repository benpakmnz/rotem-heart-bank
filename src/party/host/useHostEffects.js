import { useEffect, useRef } from 'react';
import { isMuted, play } from '../audio/sfx';
import { isMusicEnabled } from '../audio/music';
import { celebrate, heartBurst } from '../shared/fx';
import { tapCounts } from '../engine/engine';

const totalWaves = (inputs) => Object.values(inputs || {}).reduce((sum, v) => sum + (Number(v && v.waves) || 0), 0);
const totalTaps = (s) => Object.values(tapCounts(s)).reduce((a, b) => a + b, 0);
const heartsFound = (s) => (s.hunt ? Object.keys(s.hunt.found).length : 0);

// Sounds and confetti on the TV, driven by state changes.
const useHostEffects = (state, now) => {
  const prev = useRef(state);

  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (p === state) return;

    if (state.phase === 'lobby') {
      if (Object.keys(state.players).length > Object.keys(p.players).length) play('join');
      if (p.phase === 'lobby' && totalWaves(state.inputs) > totalWaves(p.inputs)) play('wave');
    }

    const moved = p.phase !== state.phase || p.step !== state.step || p.roundId !== state.roundId;
    if (moved) {
      switch (`${state.phase}:${state.step}`) {
        case 'tap:intro':
        case 'trivia:intro':
        case 'charades:intro':
        case 'word:intro':
        case 'blessings:intro':
        case 'hunt:intro':
          play('reveal');
          break;
        case 'hunt:search':
          play('go');
          break;
        case 'tap:active':
        case 'word:play':
        case 'charades:perform':
        case 'blessings:write':
          play('go');
          break;
        case 'tap:results':
          play('fanfare');
          celebrate();
          break;
        case 'tap:turnDone':
          play('correct');
          heartBurst();
          break;
        case 'hunt:exercise':
          play('ding');
          break;
        case 'hunt:reveal': {
          // class mode: the answer, then what was behind the heart
          const { picks, boards, turn } = state.hunt;
          const last = picks[picks.length - 1];
          const heart = last && boards[turn].hearts[last.n - 1];
          if (!last || !last.correct) play('wrong');
          else if (heart.kind === 'gold') {
            play('fanfare');
            celebrate();
          } else if (heart.points) {
            play('correct');
            heartBurst();
          } else play('pop');
          break;
        }
        case 'hunt:turnDone':
          play('reveal');
          break;
        case 'trivia:question':
        case 'charades:ready':
          play('ding');
          break;
        case 'trivia:reveal':
          play('reveal');
          break;
        case 'charades:pick':
          play('drumroll');
          break;
        case 'charades:outcome':
          if (state.charades.current && state.charades.current.success) {
            play('fanfare');
            celebrate();
          } else {
            play('wrong');
          }
          break;
        case 'word:outcome':
          if (state.word.current && state.word.current.winnerId) {
            play('correct');
            heartBurst();
          } else {
            play('wrong');
          }
          break;
        case 'finale:fill':
          play('rise');
          break;
        case 'finale:celebrate':
          play('fanfare');
          celebrate();
          // the finale music is Happy Birthday; without music, play the tune alone
          if (!isMusicEnabled() || isMuted()) setTimeout(() => play('happyBirthday'), 1800);
          break;
        default:
          if (state.step === 'results') play('correct');
      }
      return;
    }

    // (the class clap meter's microphone would hear the taps' sound)
    if (state.phase === 'tap' && state.step === 'active' && !state.classMode) {
      const taps = totalTaps(state);
      if (taps > totalTaps(p)) play('tap', Math.min(1, taps / 2000));
    }
    if (state.phase === 'word' && state.step === 'play' && p.word && p.word.current) {
      if (state.word.current.revealed > p.word.current.revealed) play('ding');
    }
    if (state.blessings && p.blessings && state.blessings.list.length > p.blessings.list.length) play('whoosh');
    // (class mode's hearts sound when they open, above)
    if (state.phase === 'hunt' && !state.classMode && heartsFound(state) > heartsFound(p)) {
      play('fanfare');
      celebrate();
    }
  }, [state]);

  // 3-2-1 beeps and ticking in the last seconds of a timer.
  const secs = state.endsAt ? Math.ceil((state.endsAt - now) / 1000) : null;
  const lastSecs = useRef(secs);
  useEffect(() => {
    if (secs === lastSecs.current) return;
    lastSecs.current = secs;
    if (secs == null || secs <= 0) return;
    if (state.step === 'countdown') play('count');
    else if (secs <= 5 && ['active', 'question', 'perform', 'play'].includes(state.step) && !(state.classMode && state.phase === 'tap')) play('tick');
  }, [secs, state.step, state.phase, state.classMode]);
};

export default useHostEffects;
