import { useEffect, useRef } from 'react';
import { play } from '../audio/sfx';
import { celebrate, heartBurst } from '../shared/fx';
import { tapCounts } from '../engine/engine';

const totalWaves = (inputs) => Object.values(inputs || {}).reduce((sum, v) => sum + (Number(v && v.waves) || 0), 0);
const totalTaps = (s) => Object.values(tapCounts(s)).reduce((a, b) => a + b, 0);

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
          play('reveal');
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
          setTimeout(() => play('happyBirthday'), 1800);
          break;
        default:
          if (state.step === 'results') play('correct');
      }
      return;
    }

    if (state.phase === 'tap' && state.step === 'active') {
      const taps = totalTaps(state);
      if (taps > totalTaps(p)) play('tap', Math.min(1, taps / 2000));
    }
    if (state.phase === 'word' && state.step === 'play' && p.word && p.word.current) {
      if (state.word.current.revealed > p.word.current.revealed) play('ding');
    }
    if (state.blessings && p.blessings && state.blessings.list.length > p.blessings.list.length) play('whoosh');
  }, [state]);

  // 3-2-1 beeps and ticking in the last seconds of a timer.
  const secs = state.endsAt ? Math.ceil((state.endsAt - now) / 1000) : null;
  const lastSecs = useRef(secs);
  useEffect(() => {
    if (secs === lastSecs.current) return;
    lastSecs.current = secs;
    if (secs == null || secs <= 0) return;
    if (state.step === 'countdown') play('count');
    else if (secs <= 5 && ['active', 'question', 'perform', 'play'].includes(state.step)) play('tick');
  }, [secs, state.step]);
};

export default useHostEffects;
