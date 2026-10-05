import { useCallback, useEffect, useRef, useState } from 'react';

// Class mode's clap meter. The computer's microphone hears the team on turn
// clap and cheer: every moment adds "claps" by how loud it is, up to
// CLAPS_PER_SECOND at full volume (the engine's limit is 20 a second). The
// scale comes from the room's quiet moments before the first turn and then
// stays the same for every team. Without a microphone (or when the teacher
// chooses so), presses of the space bar count instead.

export const CLAPS_PER_SECOND = 18;
export const CLAPS_PER_KEY = 2;

const DEFAULT_QUIET_DB = -62;
const QUIET_SAMPLES = 200; // the last 10 seconds before the first turn
const FRAME_MS = 50;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// The room's quiet level (dBFS) -> the volumes that score: from a little
// above the quiet to loud cheering near the computer.
export const volumeScale = (quietDb = DEFAULT_QUIET_DB) => {
  const lo = clamp(quietDb + 10, -56, -32);
  return { lo, hi: clamp(lo + 32, -26, -10) };
};

// 0 (quiet) .. 1 (as loud as it counts)
export const loudness = (db, { lo, hi }) => clamp((db - lo) / (hi - lo), 0, 1);

// A low percentile of the samples: the room between the cheers.
export const quietLevel = (samples) => {
  if (!samples.length) return DEFAULT_QUIET_DB;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.2)];
};

const rmsDb = (buf) => {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return 20 * Math.log10(Math.sqrt(sum / buf.length) + 1e-9);
};

const openMic = async () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw Object.assign(new Error('no microphone support'), { name: 'NotSupportedError' });
  }
  // the raw sound: noise suppression would take the claps out
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  // a silent way out to the speakers keeps the analyser running everywhere
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(analyser);
  analyser.connect(mute);
  mute.connect(ctx.destination);
  return {
    ctx,
    analyser,
    buf: new Float32Array(analyser.fftSize),
    close: () => {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
  };
};

const micStatus = (ctx) => (ctx.state === 'running' ? 'on' : 'paused');

// The microphone for the clap stage (open while `enabled`).
//   status: 'asking' (waiting for the browser's permission), 'on', 'paused'
//   (the browser holds the sound until a click), 'blocked' (no permission),
//   'none' (no microphone), 'idle'
//   input:  'mic' or 'keys' - what counts the claps (the teacher can switch)
//   level:  0..1, the loudness right now (for the screen, 10 times a second)
//   frameRef: the screen's (level, seconds) callback, called every frame
const useClapMeter = (enabled, step) => {
  const [status, setStatus] = useState(enabled ? 'asking' : 'idle');
  const [input, setInput] = useState('mic');
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const micRef = useRef(null);
  const frameRef = useRef(null);
  const calibration = useRef({ samples: [], scale: null });
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return undefined;
    }
    let alive = true;
    let mic = null;
    setStatus('asking');
    openMic()
      .then((opened) => {
        if (!alive) {
          opened.close();
          return;
        }
        mic = opened;
        micRef.current = opened;
        setStatus(micStatus(opened.ctx));
        setInput('mic');
        opened.ctx.onstatechange = () => alive && opened.ctx.state !== 'closed' && setStatus(micStatus(opened.ctx));
      })
      .catch((e) => {
        if (!alive) return;
        const missing = e && /NotFound|NotSupported|Overconstrained|DevicesNotFound/.test(e.name);
        setStatus(missing ? 'none' : 'blocked');
        setInput('keys');
      });
    return () => {
      alive = false;
      micRef.current = null;
      if (mic) mic.close();
    };
  }, [enabled, attempt]);

  // a browser that holds the sound until the page is clicked: the next click or key
  useEffect(() => {
    if (status !== 'paused') return undefined;
    const resume = () => micRef.current && micRef.current.ctx.resume().catch(() => {});
    resume();
    window.addEventListener('pointerdown', resume, true);
    window.addEventListener('keydown', resume, true);
    return () => {
      window.removeEventListener('pointerdown', resume, true);
      window.removeEventListener('keydown', resume, true);
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'on') {
      setLevel(0);
      return undefined;
    }
    let last = performance.now();
    let shownAt = 0;
    let shown = -1;
    const id = setInterval(() => {
      const mic = micRef.current;
      if (!mic) return;
      const t = performance.now();
      const dt = Math.min(0.2, (t - last) / 1000);
      last = t;
      mic.analyser.getFloatTimeDomainData(mic.buf);
      const db = rmsDb(mic.buf);
      // the scale is set when the first turn starts, from the quiet before it
      const c = calibration.current;
      if (!c.scale && stepRef.current === 'active') c.scale = volumeScale(quietLevel(c.samples));
      if (!c.scale && db > -100) {
        c.samples.push(db);
        if (c.samples.length > QUIET_SAMPLES) c.samples.shift();
      }
      const now = loudness(db, c.scale || volumeScale(quietLevel(c.samples)));
      if (frameRef.current) frameRef.current(now, dt);
      if (t - shownAt >= 100) {
        shownAt = t;
        const rounded = Math.round(now * 40) / 40;
        if (rounded !== shown) {
          shown = rounded;
          setLevel(rounded);
        }
      }
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [status]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const resume = useCallback(() => micRef.current && micRef.current.ctx.resume().catch(() => {}), []);

  return { status, input, setInput, level, frameRef, retry, resume };
};

export default useClapMeter;
