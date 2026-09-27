import { audioContext, isMuted } from './sfx';
import { TRACKS } from './tracks';

// Background music, synthesized live with the Web Audio API (no audio files):
// a tiny step sequencer that plays the loops in tracks.js. Only the TV plays
// music. setMusicTrack() can be called before audio is unlocked - the music
// starts as soon as the browser allows sound.

const MUSIC_VOLUME = 0.3;
const LOOKAHEAD = 0.15; // seconds scheduled ahead
const TICK_MS = 25;
const FADE_OUT = 0.9;
const FADE_IN = 0.5;

// ---------- notes ----------

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const noteFreq = (name) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return null;
  const midi = 12 * (Number(m[3]) + 1) + SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
};

// Turns a track into a list of events per step (16ths; 12 per bar in 3/4).
export const compileTrack = (track) => {
  const beats = track.beats || 4;
  const stepsPerBar = beats * 4;
  const total = track.bars * stepsPerBar;
  const steps = Array.from({ length: total }, () => []);
  track.parts.forEach((part) => {
    const tokens = part.notes.replace(/\|/g, ' ').trim().split(/\s+/);
    const scale = stepsPerBar / part.res;
    const partSteps = tokens.length * scale;
    const events = [];
    tokens.forEach((tok, i) => {
      if (tok === '-') {
        const last = events[events.length - 1];
        if (last) last.len += scale;
        return;
      }
      if (tok === '.') {
        events.push(null);
        return;
      }
      const at = i * scale;
      if (part.inst === 'drums') events.push({ at, len: scale, hits: tok.split('') });
      else events.push({ at, len: scale, freqs: tok.split('+').map(noteFreq).filter(Boolean) });
    });
    const real = events.filter(Boolean);
    for (let offset = 0; offset < total; offset += partSteps) {
      real.forEach((e) => {
        const at = offset + e.at;
        if (at < total) steps[at].push({ inst: part.inst, vol: part.vol == null ? 1 : part.vol, len: e.len, freqs: e.freqs, hits: e.hits });
      });
    }
  });
  return { ...track, stepsPerBar, total, steps, stepDur: 60 / track.bpm / 4, startStep: (track.startBar || 0) * stepsPerBar };
};

const compiled = {};
const getTrack = (id) => {
  if (!TRACKS[id]) return null;
  if (!compiled[id]) compiled[id] = compileTrack(TRACKS[id]);
  return compiled[id];
};

// ---------- instruments ----------

let noiseBuffer = null;
const noise = (c) => {
  if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
};

const osc = (c, type, freq, t, end, detune = 0) => {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  o.start(t);
  o.stop(end + 0.05);
  return o;
};

// gain with attack / decay-to-sustain / release, ends at t + dur + release
const envelope = (c, t, dur, { peak, attack = 0.01, decay = 0.1, sustain = 0.6, release = 0.1 }) => {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), t + attack + decay);
  g.gain.setValueAtTime(Math.max(0.0001, peak * sustain), t + Math.max(attack + decay, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + decay, dur) + release);
  return { g, end: t + Math.max(attack + decay, dur) + release };
};

const lowpass = (c, freq, q = 0.7) => {
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
};

const INSTRUMENTS = {
  // music box / glockenspiel
  bell(c, bus, t, f, dur, v) {
    const len = Math.max(0.5, dur + 0.35);
    [
      [1, 0.16],
      [2, 0.05],
      [3, 0.02],
    ].forEach(([mult, amp]) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp * v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len / mult);
      osc(c, 'sine', f * mult, t, t + len).connect(g);
      g.connect(bus.out);
      if (mult === 1) g.connect(bus.echo);
    });
  },
  pluck(c, bus, t, f, dur, v) {
    const { g, end } = envelope(c, t, Math.min(dur, 0.12), { peak: 0.13 * v, attack: 0.004, decay: 0.12, sustain: 0.3, release: 0.18 });
    const f1 = lowpass(c, 2600);
    osc(c, 'triangle', f, t, end).connect(f1);
    osc(c, 'sine', f * 2, t, end).connect(f1);
    f1.connect(g);
    g.connect(bus.out);
  },
  lead(c, bus, t, f, dur, v) {
    const { g, end } = envelope(c, t, dur * 0.9, { peak: 0.09 * v, attack: 0.012, decay: 0.12, sustain: 0.55, release: 0.1 });
    const f1 = lowpass(c, 2800);
    osc(c, 'square', f, t, end).connect(f1);
    osc(c, 'triangle', f, t, end, 6).connect(f1);
    f1.connect(g);
    g.connect(bus.out);
    g.connect(bus.echo);
  },
  brass(c, bus, t, f, dur, v) {
    const { g, end } = envelope(c, t, dur * 0.92, { peak: 0.1 * v, attack: 0.03, decay: 0.15, sustain: 0.7, release: 0.12 });
    const f1 = lowpass(c, 700, 2);
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
    f1.frequency.exponentialRampToValueAtTime(1600, t + 0.3);
    osc(c, 'sawtooth', f, t, end).connect(f1);
    osc(c, 'sawtooth', f, t, end, -8).connect(f1);
    f1.connect(g);
    g.connect(bus.out);
  },
  arp(c, bus, t, f, dur, v) {
    const { g, end } = envelope(c, t, Math.min(dur, 0.08), { peak: 0.06 * v, attack: 0.003, decay: 0.06, sustain: 0.35, release: 0.06 });
    const f1 = lowpass(c, 3400);
    osc(c, 'square', f, t, end).connect(f1);
    f1.connect(g);
    g.connect(bus.out);
  },
  bass(c, bus, t, f, dur, v) {
    const { g, end } = envelope(c, t, dur * 0.85, { peak: 0.22 * v, attack: 0.006, decay: 0.12, sustain: 0.7, release: 0.07 });
    const f1 = lowpass(c, 900);
    osc(c, 'triangle', f, t, end).connect(f1);
    osc(c, 'sine', f, t, end).connect(f1);
    f1.connect(g);
    g.connect(bus.out);
  },
  pad(c, bus, t, f, dur, v) {
    const { g, end } = envelope(c, t, dur, { peak: 0.035 * v, attack: 0.35, decay: 0.3, sustain: 0.8, release: 0.5 });
    const f1 = lowpass(c, 1300);
    osc(c, 'sawtooth', f, t, end, -7).connect(f1);
    osc(c, 'sawtooth', f, t, end, 7).connect(f1);
    f1.connect(g);
    g.connect(bus.out);
  },
};

const noiseHit = (c, bus, t, { vol, type, freq, q = 1, len }) => {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(bus.out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + len + 0.02);
};

const DRUMS = {
  k(c, bus, t, v) {
    const o = osc(c, 'sine', 150, t, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.55 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(bus.out);
  },
  s(c, bus, t, v) {
    noiseHit(c, bus, t, { vol: 0.22 * v, type: 'bandpass', freq: 1900, q: 0.8, len: 0.16 });
    const o = osc(c, 'triangle', 190, t, t + 0.1);
    const g = c.createGain();
    g.gain.setValueAtTime(0.12 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(bus.out);
  },
  c(c, bus, t, v) {
    [0, 0.012, 0.024].forEach((d) => noiseHit(c, bus, t + d, { vol: 0.12 * v, type: 'bandpass', freq: 1300, q: 1.2, len: 0.09 }));
  },
  h(c, bus, t, v) {
    noiseHit(c, bus, t, { vol: 0.06 * v, type: 'highpass', freq: 7500, len: 0.04 });
  },
  o(c, bus, t, v) {
    noiseHit(c, bus, t, { vol: 0.055 * v, type: 'highpass', freq: 6500, len: 0.16 });
  },
  t(c, bus, t, v) {
    const o = osc(c, 'sine', 2100, t, t + 0.04);
    const g = c.createGain();
    g.gain.setValueAtTime(0.05 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g).connect(bus.out);
  },
  w(c, bus, t, v) {
    const o = osc(c, 'sine', 880, t, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.05);
    const g = c.createGain();
    g.gain.setValueAtTime(0.14 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(bus.out);
  },
};

// A track's output: its own gain (for fades) plus a soft echo.
const createBus = (c, destination, stepDur) => {
  const out = c.createGain();
  out.connect(destination);
  const echo = c.createGain();
  echo.gain.value = 0.22;
  const delay = c.createDelay(1);
  delay.delayTime.value = stepDur * 3;
  const feedback = c.createGain();
  feedback.gain.value = 0.3;
  const tone = lowpass(c, 2500);
  echo.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(out);
  return { out, echo };
};

const playStep = (c, bus, track, step, t) => {
  track.steps[step].forEach((e) => {
    try {
      if (e.hits) e.hits.forEach((h) => DRUMS[h] && DRUMS[h](c, bus, t, e.vol));
      else e.freqs.forEach((f) => INSTRUMENTS[e.inst](c, bus, t, f, e.len * track.stepDur, e.vol));
    } catch (err) {
      // a missing audio feature must never break the game
    }
  });
};

const stepTime = (track, step, t) => (step % 2 === 1 && track.swing ? t + track.swing * track.stepDur : t);

// ---------- live player ----------

let master = null;
let enabled = true;
let wanted = null;
let current = null; // { id, track, bus, step, next }
let timer = null;

const output = (c) => {
  if (!master) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = c.createGain();
    master.gain.value = MUSIC_VOLUME;
    master.connect(comp);
    comp.connect(c.destination);
  }
  return master;
};

const fadeOut = (c, playing) => {
  const g = playing.bus.out.gain;
  g.cancelScheduledValues(c.currentTime);
  g.setValueAtTime(g.value, c.currentTime);
  g.linearRampToValueAtTime(0.0001, c.currentTime + FADE_OUT);
  setTimeout(() => playing.bus.out.disconnect(), (FADE_OUT + 1.5) * 1000);
};

const start = (c, id) => {
  const track = getTrack(id);
  if (!track) return null;
  const bus = createBus(c, output(c), track.stepDur);
  bus.out.gain.setValueAtTime(0.0001, c.currentTime);
  bus.out.gain.linearRampToValueAtTime(1, c.currentTime + FADE_IN);
  return { id, track, bus, step: track.startStep, next: c.currentTime + 0.08 };
};

const tick = () => {
  const c = audioContext();
  if (!c || c.state !== 'running') return;
  const want = enabled && !isMuted() ? wanted : null;
  if ((current && current.id) !== want) {
    if (current) fadeOut(c, current);
    current = want ? start(c, want) : null;
  }
  if (!current) return;
  const { track } = current;
  if (current.next < c.currentTime - 0.5) current.next = c.currentTime + 0.05; // the tab was asleep
  while (current.next < c.currentTime + LOOKAHEAD) {
    playStep(c, current.bus, track, current.step, stepTime(track, current.step, current.next));
    current.next += track.stepDur;
    current.step = (current.step + 1) % track.total;
  }
};

export const setMusicTrack = (id) => {
  wanted = id || null;
  if (!timer) timer = setInterval(tick, TICK_MS);
  tick();
};

export const setMusicEnabled = (value) => {
  enabled = Boolean(value);
  tick();
};

export const isMusicEnabled = () => enabled;

// Renders a track into an AudioBuffer (used to listen to the loops outside the game).
export const renderTrack = (id, seconds = 20, sampleRate = 44100) => {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const track = getTrack(id);
  const c = new Offline(2, Math.ceil(seconds * sampleRate), sampleRate);
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const gain = c.createGain();
  gain.gain.value = MUSIC_VOLUME * 2.2;
  gain.connect(comp);
  comp.connect(c.destination);
  const bus = createBus(c, gain, track.stepDur);
  let step = track.startStep;
  for (let t = 0.05; t < seconds - 0.5; t += track.stepDur) {
    playStep(c, bus, track, step, stepTime(track, step, t));
    step = (step + 1) % track.total;
  }
  return c.startRendering();
};

// Development only: lets a test browser render the loops to audio files.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.hbMusic = { renderTrack, tracks: Object.keys(TRACKS) };
}
