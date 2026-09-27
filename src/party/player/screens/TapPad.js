import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SCORING } from '../../config/game';
import { fmt } from '../../lib/format';
import { GlossyHeart } from '../../shared/Heart';
import { PhoneTimer } from './common';

const SEND_EVERY_MS = 200;

// "לב ענק ורוד במרכז המסך" - tap as fast as you can for 60 seconds.
const TapPad = ({ conn, state, me, now }) => {
  const path = `inputs/${state.roundId}/${me.id}`;
  const active = state.step === 'active';
  const [count, setCount] = useState(0);
  const [pops, setPops] = useState([]);
  const countRef = useRef(0);
  const sentRef = useRef(0);
  const popId = useRef(0);
  const heartRef = useRef(null);

  // After a refresh, continue from what the TV already got.
  useEffect(() => {
    let alive = true;
    conn.get(path).then((v) => {
      const n = Number(v && v.count) || 0;
      if (alive && n > countRef.current) {
        countRef.current = n;
        sentRef.current = n;
        setCount(n);
      }
    });
    return () => {
      alive = false;
    };
  }, [conn, path]);

  const flush = useCallback(() => {
    if (countRef.current !== sentRef.current) {
      sentRef.current = countRef.current;
      conn.set(path, { count: countRef.current });
    }
  }, [conn, path]);

  useEffect(() => {
    const id = setInterval(flush, SEND_EVERY_MS);
    return () => {
      clearInterval(id);
      flush();
    };
  }, [flush]);

  const onTap = (e) => {
    e.preventDefault();
    if (!active || conn.serverNow() > state.endsAt) return;
    countRef.current += 1;
    setCount(countRef.current);
    if (navigator.vibrate) navigator.vibrate(8);
    const box = heartRef.current && heartRef.current.getBoundingClientRect();
    const id = (popId.current += 1);
    const x = box ? e.clientX - box.left : 0;
    const y = box ? e.clientY - box.top : 0;
    setPops((list) => [...list.slice(-12), { id, x, y }]);
    setTimeout(() => setPops((list) => list.filter((p) => p.id !== id)), 700);
    if (heartRef.current) {
      heartRef.current.classList.remove('is-hit');
      // eslint-disable-next-line no-unused-expressions
      heartRef.current.offsetWidth; // restart the CSS animation
      heartRef.current.classList.add('is-hit');
    }
  };

  const seconds = Number(state.endsAt - state.stepStartedAt) || 60000;

  return (
    <div className="hb-pad hb-tap-pad">
      {active ? (
        <PhoneTimer endsAt={state.endsAt} now={now} total={seconds} />
      ) : (
        <div className="hb-tap-pad-over">⏱️ נגמר הזמן!</div>
      )}
      <div
        ref={heartRef}
        className={`hb-tap-heart ${active ? '' : 'is-off'}`}
        onPointerDown={onTap}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label="לחצו על הלב"
        data-testid="tap-heart"
      >
        <GlossyHeart from="#FF9ED2" to="#E0126A" />
        <span className="hb-tap-heart-label">{active ? 'לחצו!' : ''}</span>
        {pops.map((p) => (
          <span key={p.id} className="hb-tap-pop" style={{ left: p.x, top: p.y }}>
            +{SCORING.tapPerTap}
          </span>
        ))}
      </div>
      <div className="hb-tap-pad-count">
        <strong>{fmt(count)}</strong> לחיצות · {fmt(count * SCORING.tapPerTap)} לבבות
      </div>
    </div>
  );
};

export default TapPad;
