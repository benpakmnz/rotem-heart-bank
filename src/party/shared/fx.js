import confetti from 'canvas-confetti';

const COLORS = ['#E11D48', '#FF5C8A', '#FF8FAB', '#FFC53D', '#FFFFFF', '#C026D3'];

let heartShape = null;
const hearts = () => {
  if (heartShape === null) {
    try {
      heartShape = confetti.shapeFromPath({
        path: 'M10 18 C 4 13, 0 10, 0 6 C 0 2.5, 2.5 0, 5.5 0 C 7.5 0, 9 1.2, 10 3 C 11 1.2, 12.5 0, 14.5 0 C 17.5 0, 20 2.5, 20 6 C 20 10, 16 13, 10 18 Z',
      });
    } catch (e) {
      heartShape = false; // very old browsers: plain confetti
    }
  }
  return heartShape ? [heartShape, 'circle'] : ['circle', 'square'];
};

const fire = (opts) => {
  try {
    confetti({ colors: COLORS, shapes: hearts(), disableForReducedMotion: true, zIndex: 50, ...opts });
  } catch (e) {
    // effects are optional
  }
};

// A happy burst of hearts from the middle of the screen.
export const heartBurst = (opts = {}) =>
  fire({ particleCount: 120, spread: 100, startVelocity: 45, scalar: 1.6, origin: { x: 0.5, y: 0.6 }, ...opts });

// Bigger celebration: two cannons from the sides.
export const celebrate = () => {
  heartBurst();
  fire({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.8 }, scalar: 1.5 });
  fire({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.8 }, scalar: 1.5 });
};

// Small burst for a phone screen.
export const phoneBurst = () => fire({ particleCount: 70, spread: 80, startVelocity: 35, scalar: 1.2, origin: { x: 0.5, y: 0.55 } });
