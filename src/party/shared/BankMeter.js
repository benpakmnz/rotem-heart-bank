import React from 'react';
import useAnimatedNumber from './useAnimatedNumber';
import { Heart } from './Heart';
import { fmt } from '../lib/format';

// "מד האנרגיה" - how full Rotem's heart bank is.
const BankMeter = ({ fraction, bank, name, size = 'md', duration = 1200, from }) => {
  const target = Math.max(0, Math.min(1, fraction || 0));
  const shown = useAnimatedNumber(target, duration, from == null ? target : from);
  const hearts = useAnimatedNumber(bank || 0, duration);
  const percent = Math.floor(shown * 100 + 1e-6);
  return (
    <div className={`hb-meter hb-meter-${size} ${percent >= 100 ? 'is-full' : ''}`}>
      <div className="hb-meter-head">
        <span className="hb-meter-title">
          <Heart className="hb-meter-title-heart" color="#E11D48" /> הבנק של {name}
        </span>
        <span className="hb-meter-percent">{percent}%</span>
      </div>
      <div className="hb-meter-track">
        <div className="hb-meter-fill" style={{ width: `${Math.max(3, shown * 100)}%` }}>
          <span className="hb-meter-shine" />
        </div>
      </div>
      <div className="hb-meter-sub">{fmt(hearts)} לבבות בבנק</div>
    </div>
  );
};

export default BankMeter;
