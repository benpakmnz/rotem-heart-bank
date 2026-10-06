import { useCallback, useEffect, useRef, useState } from 'react';
import { CLAPS_PER_SECOND, FRAME_MS, loudness, micStatus, openMic, quietLevel, QUIET_SAMPLES, rmsDb, volumeScale } from '../host/useClapMeter';
import { PHONE_MIC_PATH } from '../host/phoneMic';
import useWakeLock from '../shared/useWakeLock';

const REPORT_EVERY = 3; // frames (50 ms each): about 7 reports a second
const KEEP_MS = 15000; // the sound of a whole turn, even when the news of it comes late
const FINAL_AFTER_MS = 1000; // a turn's count stays as it is a second after its end

// The teacher's phone as the clap meter's microphone (host/phoneMic.js).
// Every moment of sound is kept with the shared clock's time, so each turn is
// counted from the TV's start of it to its end - however late the phone hears
// about the turn. The scale comes from the quiet before the first turn, like
// the computer's microphone.
//   status: 'off', 'asking', 'on', 'paused' (the phone holds the sound until a
//   tap), 'blocked', 'none' (no microphone), 'stopped' (the phone closed it)
//   level: 0..1 now;  turn: { roundId, claps } - the last turn it counted
const usePhoneMic = (conn, state, pin) => {
  const [status, setStatus] = useState('off');
  const [level, setLevel] = useState(0);
  const [turn, setTurn] = useState(null);
  const micRef = useRef(null);
  // the sound so far, the scale and the turn being counted (kept through a pause)
  const meterRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const alive = useRef(true);

  const close = useCallback(() => {
    if (micRef.current) micRef.current.close();
    micRef.current = null;
    if (conn) conn.remove(PHONE_MIC_PATH);
  }, [conn]);

  const stop = useCallback(() => {
    close();
    setStatus('off');
  }, [close]);

  const start = useCallback(() => {
    close();
    // a phone starts the sound only inside the tap itself
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    try {
      ctx = Ctx ? new Ctx() : null;
      if (ctx) ctx.resume().catch(() => {});
    } catch (e) {
      ctx = null;
    }
    setStatus('asking');
    meterRef.current = { frames: [], calibration: { samples: [], scale: null }, measured: null };
    openMic(ctx)
      .then((mic) => {
        if (!alive.current) {
          mic.close();
          return;
        }
        micRef.current = mic;
        // the phone closed the microphone (another app took it, or the page slept)
        mic.stream.getAudioTracks().forEach((track) => {
          track.onended = () => {
            if (micRef.current !== mic) return;
            close();
            setStatus('stopped');
          };
        });
        mic.ctx.onstatechange = () => micRef.current === mic && mic.ctx.state !== 'closed' && setStatus(micStatus(mic.ctx));
        setStatus(micStatus(mic.ctx));
      })
      .catch((e) => {
        if (!alive.current) return;
        const missing = e && /NotFound|NotSupported|Overconstrained|DevicesNotFound/.test(e.name);
        setStatus(missing ? 'none' : 'blocked');
      });
  }, [close]);

  const resume = useCallback(() => micRef.current && micRef.current.ctx.resume().catch(() => {}), []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      close();
    };
  }, [close]);

  // the screen stays on while the phone listens; back from the background, the sound goes on
  useWakeLock(status === 'on' || status === 'paused');
  useEffect(() => {
    if (status !== 'paused') return undefined;
    const wake = () => document.visibilityState === 'visible' && resume();
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, [status, resume]);

  useEffect(() => {
    if (status !== 'on' || !conn) return undefined;
    let last = performance.now();
    let n = 0;
    let shown = '';
    const id = setInterval(() => {
      const mic = micRef.current;
      const m = meterRef.current;
      if (!mic || !m) return;
      const { frames, calibration } = m;
      const p = performance.now();
      const dt = Math.min(0.2, (p - last) / 1000);
      last = p;
      const t = conn.serverNow();
      mic.analyser.getFloatTimeDomainData(mic.buf);
      const db = rmsDb(mic.buf);
      const st = stateRef.current || {};
      const active = st.phase === 'tap' && st.step === 'active';
      if (!calibration.scale && active) calibration.scale = volumeScale(quietLevel(calibration.samples));
      if (!calibration.scale && db > -100) {
        calibration.samples.push(db);
        if (calibration.samples.length > QUIET_SAMPLES) calibration.samples.shift();
      }
      const scale = calibration.scale || volumeScale(quietLevel(calibration.samples));
      frames.push({ t, dt, db });
      while (frames.length && frames[0].t < t - KEEP_MS) frames.shift();

      // the turn on the TV: from its start to its end (or to the teacher's early stop)
      if (active && (!m.measured || m.measured.roundId !== st.roundId)) {
        m.measured = { roundId: st.roundId, from: Number(st.stepStartedAt) || t, to: Number(st.endsAt) || t, final: null };
      }
      const { measured } = m;
      if (measured && st.roundId === measured.roundId && st.phase === 'tap' && st.step === 'turnDone') {
        measured.to = Math.min(measured.to, Number(st.stepStartedAt) || measured.to);
      }
      let claps = 0;
      if (measured && measured.final !== null) claps = measured.final;
      else if (measured) {
        frames.forEach((f) => {
          if (f.t > measured.from && f.t <= measured.to) claps += loudness(f.db, scale) * CLAPS_PER_SECOND * f.dt;
        });
        if (t > measured.to + FINAL_AFTER_MS) measured.final = claps;
      }

      n += 1;
      if (n % REPORT_EVERY) return;
      const now = loudness(db, scale);
      conn.set(PHONE_MIC_PATH, {
        pin,
        at: t,
        level: Math.round(now * 100) / 100,
        roundId: measured ? measured.roundId : null,
        claps: Math.floor(claps),
      });
      setLevel(Math.round(now * 40) / 40);
      const counted = measured ? `${measured.roundId}:${Math.floor(claps)}` : '';
      if (counted !== shown) {
        shown = counted;
        setTurn(measured ? { roundId: measured.roundId, claps: Math.floor(claps) } : null);
      }
    }, FRAME_MS);
    return () => {
      clearInterval(id);
      setLevel(0);
    };
  }, [status, conn, pin]);

  return { status, level, turn, start, stop, resume };
};

export default usePhoneMic;
