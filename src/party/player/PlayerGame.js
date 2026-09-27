import React from 'react';
import { STAGE_IDS, stageInfo } from '../config/game';
import { useRoomValue, useServerNow } from '../net/hooks';
import { fmt } from '../lib/format';
import Avatar from '../shared/Avatar';
import { Heart } from '../shared/Heart';
import PartyBackdrop from '../shared/PartyBackdrop';
import useAnimatedNumber from '../shared/useAnimatedNumber';
import { LobbyWait, StagePrep, PhoneCountdown, StageDone } from './screens/common';
import TapPad from './screens/TapPad';
import TriviaPad from './screens/TriviaPad';
import CharadesPad from './screens/CharadesPad';
import WordPad from './screens/WordPad';
import BlessingPad from './screens/BlessingPad';
import FinalePad from './screens/FinalePad';
import HuntPad from './screens/HuntPad';
import BasketPad from './screens/BasketPad';
import Badges from '../shared/Badges';

const Header = ({ me, state }) => {
  const score = useAnimatedNumber((state && state.scores && state.scores[me.id]) || 0, 800);
  const meter = state ? state.meter || 0 : 0;
  return (
    <header className="hb-phone-head">
      <div className="hb-phone-me">
        <Avatar player={me} size="sm" />
        <span className="hb-phone-name">{me.name}</span>
        <Badges list={state && state.badges ? state.badges[me.id] : null} />
      </div>
      <div className="hb-phone-score" aria-label="הלבבות שלי">
        <Heart color="#F0145A" className="hb-phone-score-heart" />
        {fmt(score)}
      </div>
      <div className="hb-phone-meter" title="הבנק המשפחתי">
        <span style={{ width: `${Math.max(2, meter * 100)}%` }} />
      </div>
    </header>
  );
};

const screenFor = (props) => {
  const { state } = props;
  const { phase, step } = state;
  const stage = stageInfo(phase, state.stages || STAGE_IDS);
  if (phase === 'lobby') return <LobbyWait {...props} />;
  if (phase === 'finale') return <FinalePad {...props} />;
  if (step === 'intro') return <StagePrep stage={stage} name={state.name} />;
  if (step === 'results') return <StageDone {...props} stage={stage} />;
  if (step === 'countdown') return <PhoneCountdown {...props} />;
  switch (phase) {
    case 'tap':
      return <TapPad {...props} />;
    case 'trivia':
      return <TriviaPad {...props} />;
    case 'charades':
      return <CharadesPad {...props} />;
    case 'word':
      return <WordPad {...props} />;
    case 'hunt':
      return <HuntPad {...props} />;
    case 'basket':
      return <BasketPad {...props} />;
    case 'blessings':
      return <BlessingPad {...props} />;
    default:
      return null;
  }
};

const PlayerGame = ({ conn, me }) => {
  const state = useRoomValue(conn, 'state');
  const players = useRoomValue(conn, 'players', { throttleMs: 500 }) || {};
  const secret = useRoomValue(conn, `private/${me.id}`);
  const now = useServerNow(conn, 200);

  return (
    <div className={`hb-phone hb-phone-game ${state ? `phase-${state.phase} step-${state.step}` : ''}`}>
      <PartyBackdrop rays={false} hearts={8} balloons={Boolean(state && state.phase === 'finale')} />
      <Header me={me} state={state} />
      <main className="hb-phone-main">
        {state ? (
          screenFor({ conn, state, me, players, secret, now })
        ) : (
          <div className="hb-phone-wait">
            <p className="hb-phone-text">מחכים לטלוויזיה...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayerGame;
