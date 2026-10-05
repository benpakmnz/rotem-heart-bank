import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { play } from '../../audio/sfx';
import { meterFraction } from '../../lib/scoring';
import { fmt } from '../../lib/format';
import { playerBadges } from '../../engine/engine';
import Avatar from '../../shared/Avatar';
import Badges from '../../shared/Badges';
import BankMeter from '../../shared/BankMeter';
import Fireworks from '../../shared/Fireworks';
import { isLiteFx } from '../../lib/effects';
import GameTitle from '../../shared/GameTitle';
import RotemPhoto from '../../shared/RotemPhoto';
import WordCloud, { useCloudLayout } from '../../shared/WordCloud';
import { saveSouvenir } from './BlessingsScreen';

const Podium = ({ state }) => {
  const { ranking = [] } = state.finale || {};
  const top = ranking.filter((pid) => state.players[pid]).slice(0, 3);
  // 2nd - 1st - 3rd, like a real podium (RTL: first item on the right)
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const place = (pid) => top.indexOf(pid);
  const badges = playerBadges(state);
  return (
    <div className="hb-podium">
      {order.map((pid) => (
        <motion.div
          key={pid}
          className={`hb-podium-spot is-place-${place(pid) + 1}`}
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 + (2 - place(pid)) * 0.5, type: 'spring', stiffness: 120 }}
        >
          {place(pid) === 0 && <div className="hb-podium-crown">👑</div>}
          <Avatar player={state.players[pid]} size={place(pid) === 0 ? 'xl' : 'lg'} showName />
          <Badges list={badges[pid]} />
          <div className="hb-podium-score">{fmt(state.scores[pid] || 0)} ❤️</div>
          <div className="hb-podium-block">{place(pid) + 1}</div>
        </motion.div>
      ))}
    </div>
  );
};

const FinaleScreen = ({ state }) => {
  const [showCloud, setShowCloud] = useState(false);
  const name = state.settings.birthdayName;
  const blessings = state.blessings ? state.blessings.list : [];
  const cloud = useCloudLayout(blessings, state.blessings ? state.blessings.hidden : null);
  const bankBefore = state.finale ? state.finale.bankAtStart : state.bank;
  const winners = (state.finale ? state.finale.winners : []).filter((pid) => state.players[pid]);

  if (state.step === 'fill') {
    return (
      <div className="hb-finale is-filling">
        <motion.div className="hb-finale-fill-photo" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 90, damping: 12 }}>
          <RotemPhoto size="lg" age={state.settings.age} beat />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GameTitle text="כל הלבבות נכנסים לאוצר..." tone="white" className="hb-finale-filling-title" />
        </motion.div>
        <div className="hb-finale-meter">
          <BankMeter
            fraction={1}
            from={meterFraction(bankBefore, state.target)}
            bank={bankBefore}
            name={name}
            size="xl"
            duration={4200}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="hb-finale is-celebrating">
      {!isLiteFx() && <Fireworks onBurst={() => play('pop')} />}
      {showCloud ? (
        <div className="hb-finale-cloud">
          <GameTitle as="h2" text={`הברכות של ${name}`} />
          <WordCloud items={cloud} />
          <div className="hb-finale-cloud-actions">
            <button type="button" className="hb-btn hb-btn-primary" onClick={() => saveSouvenir(cloud, state.settings, state.classMode)}>
              ⬇️ שמירת המזכרת
            </button>
            <button type="button" className="hb-btn hb-btn-soft" onClick={() => setShowCloud(false)}>
              🏆 חזרה לזוכים
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="hb-finale-hero">
            <motion.div initial={{ scale: 0.2, opacity: 0, rotate: 20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 10 }}>
              <RotemPhoto size="lg" age={state.settings.age} beat />
            </motion.div>
            <div>
              <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 160, damping: 12 }}>
                <GameTitle text="100% אהבה!" tone="gold" className="hb-finale-title" />
              </motion.div>
              <motion.p className="hb-finale-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                האוצר מלא - {name} מוכנה לעוגה! 🎂
              </motion.p>
            </div>
          </div>
          <motion.div className="hb-finale-total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            {state.classMode ? 'כל הכיתה אספה יחד' : 'כל המשפחה אספה יחד'} {fmt(state.bank)} לבבות 💖
          </motion.div>
          {winners.length > 0 && (
            <motion.div className="hb-finale-winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
              🏆 במקום הראשון באוצר הלבבות: {winners.map((pid) => state.players[pid].name).join(' ו')}!
            </motion.div>
          )}
          <Podium state={state} />
          {cloud.length > 0 && (
            <button type="button" className="hb-btn hb-btn-soft hb-finale-cloud-btn" onClick={() => setShowCloud(true)}>
              💌 לענן הברכות
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default FinaleScreen;
