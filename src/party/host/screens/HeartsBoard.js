import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CLASS_HUNT_PICKS, heartKind } from '../../config/game';
import { fmt } from '../../lib/format';
import Avatar from '../../shared/Avatar';
import GameTitle from '../../shared/GameTitle';
import { GlossyHeart } from '../../shared/Heart';
import { isTypingTarget } from '../classTools';
import { StageResults } from './common';

// Class mode's "ציידי הלבבות": each team in turn calls out 5 of 20 numbered
// hearts. Behind each one waits a math exercise; the teacher enters the
// team's answer, and the heart opens - gold, silver, red, or an empty one.
// Only a right answer wins its points. At the end of the turn the whole
// board opens.

const EMPTY = { label: 'לב ריק', colors: ['#F4F2F8', '#B8B3C9'] };
const CLOSED = ['#FF8CC6', '#9B2FC9'];
const kindOf = (kind) => (kind === 'empty' ? EMPTY : heartKind(kind));

export const exerciseText = (ex) => `${ex.a} ${ex.op === '-' ? '−' : '+'} ${ex.b}`;

const BoardHeart = ({ heart, pick, done, current, canPick, onPick }) => {
  // a picked heart opens either way (a wrong answer just doesn't win it)
  const open = Boolean(pick) || done;
  const colors = open ? kindOf(heart.kind).colors : CLOSED;
  let status = '';
  if (pick) status = pick.correct ? 'is-open' : 'is-missed';
  else if (done) status = 'is-peek';
  else if (current) status = 'is-current';
  return (
    <motion.button
      type="button"
      className={`hb-bh ${status} ${open ? `hb-bh-${heart.kind}` : ''}`}
      disabled={!canPick || Boolean(pick)}
      onClick={(e) => {
        e.currentTarget.blur();
        onPick();
      }}
      initial={false}
      animate={open ? { rotateY: [90, 0], scale: [0.85, 1] } : { rotateY: 0, scale: current ? 1.12 : 1 }}
      transition={{ duration: 0.45 }}
      aria-label={`לב מספר ${heart.n}`}
      data-testid={`board-heart-${heart.n}`}
    >
      <GlossyHeart from={colors[0]} to={colors[1]} stroke={open && heart.kind === 'empty' ? '#9C96B0' : '#fff'} />
      {open ? (
        <>
          <span className="hb-bh-corner">{heart.n}</span>
          <span className="hb-bh-prize">{heart.points ? `+${fmt(heart.points)}` : '0'}</span>
        </>
      ) : (
        <span className="hb-bh-num">{heart.n}</span>
      )}
      {pick && !pick.correct && <span className="hb-bh-x">✗</span>}
    </motion.button>
  );
};

// The exercise behind the heart, and the 0-20 pad the teacher enters the
// team's answer on (or digits on the keyboard + Enter). Then: right or not.
const ExerciseCard = ({ state, team, dispatch }) => {
  const h = state.hunt;
  const answering = state.step === 'exercise';
  const last = h.picks[h.picks.length - 1];
  const ex = answering ? h.current : last;
  const [typed, setTyped] = useState('');
  const typedRef = useRef(typed);
  typedRef.current = typed;

  // a new exercise (or its result) starts with an empty answer
  const exKey = ex ? `${ex.n}-${answering}` : '';
  useEffect(() => setTyped(''), [exKey]);

  useEffect(() => {
    if (!answering) return undefined;
    const onKey = (e) => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setTyped((t) => (Number(t + e.key) <= 20 ? (t + e.key).replace(/^0(\d)/, '$1') : e.key));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setTyped((t) => t.slice(0, -1));
      } else if (e.key === 'Enter' && typedRef.current !== '') {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'classMath', value: Number(typedRef.current) });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [answering, dispatch]);

  if (!ex) return null;
  const heart = h.boards[h.turn].hearts[ex.n - 1];
  const kind = kindOf(heart.kind);
  let answerBox = typed === '' ? '?' : typed;
  let result = null;
  if (!answering) {
    answerBox = ex.answer;
    if (ex.correct) {
      result = (
        <motion.div className="hb-ex-result is-good" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>
          <span className="hb-ex-verdict">✅ נכון!</span>
          <span className={`hb-ex-heart hb-bh-${heart.kind}`}>
            <GlossyHeart from={kind.colors[0]} to={kind.colors[1]} stroke={heart.kind === 'empty' ? '#9C96B0' : '#fff'} />
          </span>
          <span className="hb-ex-prize">
            {heart.points ? `${kind.label}! +${fmt(heart.points)} לבבות 🎉` : 'לב ריק... הפעם בלי נקודות 😅'}
          </span>
        </motion.div>
      );
    } else {
      result = (
        <motion.div className="hb-ex-result is-bad" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <span className="hb-ex-verdict">{ex.given === null ? `🙈 לא נורא! התשובה היא ${ex.answer}` : `❌ אוי, התשובה היא ${ex.answer}`}</span>
          <span className={`hb-ex-heart is-missed hb-bh-${heart.kind}`}>
            <GlossyHeart from={kind.colors[0]} to={kind.colors[1]} stroke={heart.kind === 'empty' ? '#9C96B0' : '#fff'} />
          </span>
          <span className="hb-ex-prize">{heart.points ? `היה כאן ${kind.label}... הפעם בלי נקודות` : 'היה כאן לב ריק - לא הפסדתם כלום 😅'}</span>
        </motion.div>
      );
    }
  }

  return (
    <div className="hb-ex" data-testid="exercise">
      <motion.div className="hb-ex-card" initial={{ scale: 0.6, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        <div className="hb-ex-label">💗 לב מספר {ex.n}</div>
        <div className="hb-ex-math" dir="ltr">
          {exerciseText(ex)} = <span className={`hb-ex-answer ${!answering ? (ex.correct ? 'is-good' : 'is-bad') : ''}`}>{answerBox}</span>
        </div>
        {answering ? (
          <>
            <div className="hb-ex-ask">מה התשובה של {team ? team.name : 'הקבוצה'}?</div>
            <div className="hb-pad" dir="ltr">
              {Array.from({ length: 21 }, (_, v) => (
                <button
                  key={v}
                  type="button"
                  className={`hb-pad-key ${typed === String(v) ? 'is-on' : ''}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setTyped(String(v));
                  }}
                  data-testid={`pad-${v}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="hb-ex-actions">
              <button
                type="button"
                className="hb-btn hb-btn-primary hb-ex-check"
                disabled={typed === ''}
                onClick={() => dispatch({ type: 'classMath', value: Number(typed) })}
                data-testid="pad-check"
              >
                ✔ בודקים!
              </button>
              <button type="button" className="hb-btn hb-btn-soft" onClick={() => dispatch({ type: 'classMath', value: null })} data-testid="pad-unknown">
                🙈 לא יודעים
              </button>
            </div>
          </>
        ) : (
          result
        )}
      </motion.div>
    </div>
  );
};

export const HeartsBoard = ({ state, dispatch }) => {
  const h = state.hunt;
  const board = h.boards[h.turn];
  const team = state.players[board.pid];
  const picks = h.picks.filter((p) => p.board === h.turn);
  const left = Math.max(0, CLASS_HUNT_PICKS - picks.length);
  const gained = picks.filter((p) => p.correct).reduce((sum, p) => sum + board.hearts[p.n - 1].points, 0);
  const done = state.step === 'turnDone';
  const showCard = state.step === 'exercise' || state.step === 'reveal';
  const current = state.step === 'exercise' && h.current ? h.current.n : 0;

  return (
    <div className={`hb-hboard is-${state.step}`} data-testid="hearts-board">
      <div className="hb-hboard-head">
        <div className="hb-hboard-team">
          <Avatar player={team} size="md" />
          <GameTitle text={done ? `כל הכבוד, ${team ? team.name : ''}!` : `התור של ${team ? team.name : ''}`} className="hb-hboard-title" />
        </div>
        <div className="hb-hboard-chances" aria-label={`נשארו ${left} בחירות`}>
          {Array.from({ length: CLASS_HUNT_PICKS }, (_, i) => (
            <span key={i} className={i < picks.length ? 'is-used' : ''}>
              <GlossyHeart from={CLOSED[0]} to={CLOSED[1]} />
            </span>
          ))}
          <b>{done ? 'סוף התור' : `נשארו ${left}`}</b>
        </div>
        <div className="hb-hboard-gained">{gained > 0 ? `+${fmt(gained)}` : ''}</div>
      </div>
      <div className="hb-hboard-grid">
        {board.hearts.map((heart) => (
          <BoardHeart
            key={heart.n}
            heart={heart}
            pick={picks.find((p) => p.n === heart.n)}
            done={done}
            current={current === heart.n}
            canPick={state.step === 'pick'}
            onPick={() => dispatch({ type: 'classPick', n: heart.n })}
          />
        ))}
      </div>
      <div className="hb-hboard-foot">
        {state.step === 'pick' && '👆 בחרו מספר של לב - ומאחוריו מחכה תרגיל!'}
        {done && `כך נראה הלוח - איפה התחבאו לבבות הזהב? 🔍`}
      </div>
      {showCard && <ExerciseCard state={state} team={team} dispatch={dispatch} />}
    </div>
  );
};

// The stage's results: each team's exercises and the hearts it opened.
const ClassHuntSummary = ({ state }) => {
  const { boards, hearts, found, picks } = state.hunt;
  return (
    <div className="hb-hunt-summary">
      {boards.map((b, i) => {
        const team = state.players[b.pid];
        if (!team) return null;
        const mine = picks.filter((p) => p.board === i);
        const opened = hearts.filter((x) => x.board === i && found[x.id]);
        return (
          <div key={b.pid} className={`hb-hunt-summary-row ${opened.length ? 'is-found' : ''}`}>
            <Avatar player={team} size="xs" />
            <span className="hb-hunt-summary-team">{team.name}</span>
            <span className="hb-muted">
              ✅ {mine.filter((p) => p.correct).length} מתוך {mine.length} תרגילים
            </span>
            <span className="hb-hunt-summary-hearts">
              {opened
                .filter((x) => x.points)
                .map((x) => (
                  <GlossyHeart key={x.id} from={kindOf(x.kind).colors[0]} to={kindOf(x.kind).colors[1]} />
                ))}
            </span>
            <b>+{fmt(opened.reduce((sum, x) => sum + x.points, 0))}</b>
          </div>
        );
      })}
    </div>
  );
};

const ClassHunt = ({ state, dispatch }) => {
  if (['pick', 'exercise', 'reveal', 'turnDone'].includes(state.step)) return <HeartsBoard state={state} dispatch={dispatch} />;
  return (
    <StageResults state={state}>
      <ClassHuntSummary state={state} />
    </StageResults>
  );
};

export default ClassHunt;
