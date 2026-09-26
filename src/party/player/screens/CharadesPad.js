import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SCORING } from '../../config/game';
import { fmt } from '../../lib/format';
import { useRoomValue } from '../../net/hooks';
import Avatar from '../../shared/Avatar';
import { phoneBurst } from '../../shared/fx';
import { LookAtTv, PhoneTimer } from './common';

// The performer gets the secret concept; everyone else guesses out loud.
const CharadesPad = ({ conn, state, me, players, secret, now }) => {
  const { data, step } = state;
  const performer = players[data.performerId];
  const isPerformer = data.performerId === me.id;
  const path = `inputs/${state.roundId}/${me.id}`;
  const mine = useRoomValue(conn, isPerformer ? path : null);
  const [peek, setPeek] = useState(false);
  const concept = secret && secret.roundId === state.roundId ? secret.concept : null;
  const swapsLeft = secret && secret.roundId === state.roundId ? secret.swapsLeft : 0;

  useEffect(() => setPeek(false), [state.roundId]);
  useEffect(() => {
    if (step === 'outcome' && data.success) phoneBurst();
  }, [step, data.success]);

  const send = (patch) => {
    conn.update(path, patch);
    if (navigator.vibrate) navigator.vibrate(25);
  };
  const swaps = (mine && Number(mine.swaps)) || 0;
  const total = (Number(state.endsAt) || 0) - (Number(data.startedAt) || 0);

  if (step === 'pick') {
    return (
      <div className="hb-pad">
        <motion.div className="hb-prep-icon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
          🎭
        </motion.div>
        <h1 className="hb-phone-title">מי יציג עכשיו?</h1>
        <LookAtTv />
      </div>
    );
  }

  if (step === 'outcome') {
    return (
      <div className={`hb-pad hb-verdict ${data.success ? 'is-good' : ''}`}>
        <div className="hb-verdict-icon">{data.success ? '🎉' : '⏰'}</div>
        <h1 className="hb-phone-title">{data.success ? 'הצלחה!' : 'נגמר הזמן!'}</h1>
        <div className="hb-verdict-answer">
          <span>המושג היה:</span>
          <strong>{data.concept}</strong>
        </div>
        {data.success && <div className="hb-verdict-points">+{fmt(SCORING.charadesGroup)} לבבות לכל המשפחה!</div>}
      </div>
    );
  }

  if (!isPerformer) {
    return (
      <div className="hb-pad hb-guess">
        <Avatar player={performer} size="xl" showName />
        {step === 'ready' ? (
          <>
            <h1 className="hb-phone-title">התור של {performer ? performer.name : ''} להציג!</h1>
            <p className="hb-phone-text">התכוננו לנחש בקול רם 🗣️</p>
          </>
        ) : (
          <>
            <PhoneTimer endsAt={state.endsAt} now={now} total={total} />
            <h1 className="hb-phone-title">🗣️ נחשו בקול רם!</h1>
            <p className="hb-phone-text">מה {performer ? performer.name : ''} מנסה להראות לנו?</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hb-pad hb-perform">
      <h1 className="hb-phone-title">🎭 תורך להציג!</h1>
      <p className="hb-phone-text">🤫 אל תראו לאף אחד את המסך</p>
      {step === 'perform' && <PhoneTimer endsAt={state.endsAt} now={now} total={total} />}
      <button
        type="button"
        className={`hb-secret-card ${peek || step === 'perform' ? 'is-open' : ''}`}
        onClick={() => setPeek((p) => !p)}
        data-testid="secret-card"
      >
        {peek || step === 'perform' ? <span className="hb-secret-text">{concept || '...'}</span> : <span>👆 לחצו כדי לגלות את המושג הסודי</span>}
      </button>
      {step === 'ready' ? (
        <button type="button" className="hb-btn hb-btn-primary hb-btn-block hb-btn-xl" onClick={() => send({ started: true })}>
          ▶ מוכנים? מתחילים!
        </button>
      ) : (
        <button type="button" className="hb-btn hb-btn-success hb-btn-block hb-btn-xl" onClick={() => send({ done: true })} data-testid="charades-done">
          ✅ הצלחתי!
        </button>
      )}
      {swapsLeft > 0 && (
        <button type="button" className="hb-btn hb-btn-soft" onClick={() => send({ swaps: swaps + 1 })}>
          🔄 מושג אחר (נשארו {swapsLeft})
        </button>
      )}
      <p className="hb-phone-hint">מציגים רק עם הגוף - בלי מילים ובלי קולות!</p>
    </div>
  );
};

export default CharadesPad;
