// All sounds are synthesized with the Web Audio API - no audio files.
// Browsers only allow audio after a user gesture, so the TV calls unlock()
// on its first click/keypress.

let ctx = null;
let master = null;
let muted = false;
const lastPlayed = {};

const audio = () => {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  return ctx;
};

export const unlockAudio = () => {
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
};

export const setMuted = (value) => {
  muted = value;
};

export const isMuted = () => muted;

const ready = () => {
  if (muted) return null;
  const c = audio();
  return c && c.state === 'running' ? c : null;
};

// Don't stack the same sound more often than every `ms`.
const throttle = (name, ms) => {
  const now = performance.now();
  if (lastPlayed[name] && now - lastPlayed[name] < ms) return false;
  lastPlayed[name] = now;
  return true;
};

const tone = (c, { freq, type = 'sine', at = 0, dur = 0.2, vol = 0.25, attack = 0.01, slideTo = null, detune = 0 }) => {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.detune.value = detune;
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

let noiseBuffer = null;
const noise = (c, { at = 0, dur = 0.3, vol = 0.2, from = 800, to = 3000, type = 'bandpass', q = 1 }) => {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
};

const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5 };

const sounds = {
  join(c) {
    tone(c, { freq: 660, type: 'triangle', dur: 0.12, vol: 0.2, slideTo: 990 });
    tone(c, { freq: 990, type: 'triangle', at: 0.1, dur: 0.18, vol: 0.18, slideTo: 1320 });
  },
  wave(c) {
    tone(c, { freq: 520, type: 'sine', dur: 0.14, vol: 0.16, slideTo: 780 });
  },
  tap(c, level = 0) {
    tone(c, { freq: 500 + level * 500, type: 'triangle', dur: 0.07, vol: 0.08 });
  },
  tick(c) {
    tone(c, { freq: 1300, type: 'square', dur: 0.04, vol: 0.05 });
  },
  count(c) {
    tone(c, { freq: 660, type: 'sine', dur: 0.22, vol: 0.28 });
  },
  go(c) {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f) => tone(c, { freq: f, type: 'triangle', dur: 0.5, vol: 0.14 }));
  },
  correct(c) {
    [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => tone(c, { freq: f, type: 'triangle', at: i * 0.09, dur: 0.3, vol: 0.2 }));
  },
  wrong(c) {
    tone(c, { freq: 330, type: 'sawtooth', dur: 0.25, vol: 0.08, slideTo: 250 });
    tone(c, { freq: 247, type: 'sawtooth', at: 0.2, dur: 0.35, vol: 0.08, slideTo: 180 });
  },
  reveal(c) {
    noise(c, { dur: 0.35, vol: 0.12, from: 400, to: 4000 });
    tone(c, { freq: NOTE.A5, type: 'sine', at: 0.25, dur: 0.6, vol: 0.18 });
    tone(c, { freq: NOTE.A5 * 2, type: 'sine', at: 0.25, dur: 0.4, vol: 0.05 });
  },
  fanfare(c) {
    const seq = [
      [NOTE.G4, 0, 0.14],
      [NOTE.C5, 0.14, 0.14],
      [NOTE.E5, 0.28, 0.14],
      [NOTE.G5, 0.42, 0.3],
      [NOTE.E5, 0.72, 0.14],
      [NOTE.G5, 0.86, 0.7],
    ];
    seq.forEach(([f, at, dur]) => {
      tone(c, { freq: f, type: 'square', at, dur: dur + 0.1, vol: 0.07 });
      tone(c, { freq: f, type: 'triangle', at, dur: dur + 0.15, vol: 0.16 });
    });
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f) => tone(c, { freq: f, type: 'triangle', at: 0.86, dur: 1.1, vol: 0.08 }));
  },
  drumroll(c) {
    for (let i = 0; i < 26; i += 1) {
      noise(c, { at: i * 0.12 * (1 - i / 60), dur: 0.08, vol: 0.12, from: 300, to: 900, type: 'lowpass' });
    }
  },
  ding(c) {
    tone(c, { freq: NOTE.E5 * 2, type: 'sine', dur: 1.2, vol: 0.2 });
    tone(c, { freq: NOTE.E5 * 3, type: 'sine', dur: 0.8, vol: 0.06 });
  },
  whoosh(c) {
    noise(c, { dur: 0.6, vol: 0.14, from: 300, to: 5000, q: 0.8 });
    tone(c, { freq: NOTE.C6, type: 'sine', at: 0.45, dur: 0.4, vol: 0.08 });
  },
  pop(c) {
    noise(c, { dur: 0.5, vol: 0.2, from: 2500, to: 200, type: 'lowpass' });
    tone(c, { freq: 90, type: 'sine', dur: 0.3, vol: 0.2, slideTo: 40 });
  },
  rise(c) {
    tone(c, { freq: 220, type: 'triangle', dur: 4.5, vol: 0.12, slideTo: 1760 });
    noise(c, { dur: 4.5, vol: 0.05, from: 200, to: 6000 });
  },
  happyBirthday(c) {
    const beat = 0.42;
    const melody = [
      ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
      ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
      ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
      ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
    ];
    let at = 0;
    melody.forEach(([note, beats]) => {
      const dur = beats * beat;
      tone(c, { freq: NOTE[note], type: 'triangle', at, dur: dur * 0.95, vol: 0.2, attack: 0.02 });
      tone(c, { freq: NOTE[note] / 2, type: 'sine', at, dur: dur * 0.9, vol: 0.07, attack: 0.02 });
      at += dur;
    });
  },
};

// sfx.play('correct'), sfx.play('tap', 0.5) ...
export const play = (name, arg) => {
  const c = ready();
  const sound = sounds[name];
  if (!c || !sound) return;
  if (name === 'tap' && !throttle('tap', 55)) return;
  if (name === 'tick' && !throttle('tick', 400)) return;
  if (name === 'pop' && !throttle('pop', 90)) return;
  try {
    sound(c, arg);
  } catch (e) {
    // audio problems must never break the game
  }
};
