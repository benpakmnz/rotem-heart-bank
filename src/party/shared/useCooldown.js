import { useEffect, useRef, useState } from 'react';

// The game's buttons rest a moment whenever the step changes (`key`), so a
// double tap - or a tap meant for the screen before - doesn't also run the
// next screen's button (and skip a team's turn). Resting from the very first
// render of a new step: the key it last rested for is compared, not a flag
// that an effect would set a moment too late.
export const COOLDOWN_MS = 1000;

const useCooldown = (key, ms = COOLDOWN_MS) => {
  const [rested, setRested] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => setRested(key), ms);
    return () => clearTimeout(id);
  }, [key, ms]);
  return rested !== key;
};

// A button that ends or skips a turn asks for a second tap: not the second
// half of a double tap, and within 3 seconds (and on the same step).
const CONFIRM_GAP_MS = 400;
const CONFIRM_WAIT_MS = 3000;

export const useConfirmTap = (key) => {
  const [armedFor, setArmedFor] = useState(null); // { key, id, at }
  const armedRef = useRef(null);
  armedRef.current = armedFor;
  useEffect(() => {
    if (!armedFor) return undefined;
    const id = setTimeout(() => setArmedFor(null), CONFIRM_WAIT_MS);
    return () => clearTimeout(id);
  }, [armedFor]);
  const armed = armedFor && armedFor.key === key ? armedFor.id : null;
  // true when the tap should run the action
  const tap = (id, needsConfirm) => {
    if (!needsConfirm) return true;
    const a = armedRef.current;
    if (a && a.key === key && a.id === id) {
      if (Date.now() - a.at < CONFIRM_GAP_MS) return false;
      setArmedFor(null);
      return true;
    }
    const next = { key, id, at: Date.now() };
    armedRef.current = next;
    setArmedFor(next);
    return false;
  };
  return { armed, tap };
};

export default useCooldown;
