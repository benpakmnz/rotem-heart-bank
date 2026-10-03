import React from 'react';
import { HEART_PATH, useSvgId } from '../shared/Heart';

// The kingdom of hearts' palace along the bottom of the screensaver: groups
// of towers on both sides (the left one drawn once and mirrored), a wall and
// a gatehouse with a heart gate in the middle, under the title.
// In a 1600 x 560 box; lit windows, pink roofs and heart flags.

const merlons = (x0, x1, y, w = 22, gap = 14, h = 18) => {
  let d = '';
  for (let x = x0; x + w <= x1; x += w + gap) d += `M${x} ${y} h${w} v${-h} h${-w} Z `;
  return d;
};

// an arch-topped window or door
const arch = (x, y, w, h) => `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;

const heart = (cx, cy, size) => `translate(${cx - size / 2} ${cy - size * 0.46}) scale(${size / 100})`;

const Flag = ({ x, top, length, color }) => (
  <g>
    <path d={`M${x} ${top + 44} V${top}`} stroke="#F6D7FF" strokeWidth="3" strokeLinecap="round" />
    <path className="hb-castle-flag" d={`M${x + 1} ${top + 2} L ${x + length} ${top + 11} L ${x + 1} ${top + 22} Z`} fill={color} />
  </g>
);

// a lit window with a soft glow around it
const litWindow = (glow, x, y, w = 26, h = 44) => (
  <g key={`w${x}-${y}`}>
    <circle cx={x + w / 2} cy={y + h / 2} r={w * 1.1} fill={`url(#${glow})`} />
    <path d={arch(x, y, w, h)} fill="#FFE08A" />
  </g>
);

// a round-ish tower: stone body with a lit edge, a pink cone roof and a gold band
const tower = ({ stone, roof }, { x, w, top, tip, overhang = 14 }) => (
  <g key={`t${x}`}>
    <rect x={x} y={top} width={w} height={550 - top} fill={`url(#${stone})`} />
    <rect x={x} y={top} width={w * 0.22} height={550 - top} fill="rgba(255, 255, 255, 0.08)" />
    <path d={`M${x - overhang} ${top + 2} L ${x + w / 2} ${tip} L ${x + w + overhang} ${top + 2} Z`} fill={`url(#${roof})`} />
    <path d={`M${x + w / 2} ${tip} L ${x - overhang + (w + 2 * overhang) * 0.3} ${top + 2} L ${x - overhang} ${top + 2} Z`} fill="rgba(255, 255, 255, 0.16)" />
    <rect x={x - 6} y={top} width={w + 12} height="11" rx="3" fill="#FFC53D" />
  </g>
);

const Castle = () => {
  const stone = useSvgId('hb-castle-stone');
  const wall = useSvgId('hb-castle-wall');
  const roof = useSvgId('hb-castle-roof');
  const glow = useSvgId('hb-castle-glow');
  const ground = useSvgId('hb-castle-ground');
  const ids = { stone, roof };

  // the left half; the right one is its mirror image
  const half = (
    <g>
      {/* walls between the towers, with battlements */}
      <rect x="100" y="360" width="60" height="190" fill={`url(#${wall})`} />
      <path d={merlons(102, 160, 360)} fill={`url(#${wall})`} />
      <rect x="260" y="350" width="70" height="200" fill={`url(#${wall})`} />
      <path d={merlons(262, 330, 350)} fill={`url(#${wall})`} />
      <rect x="410" y="372" width="300" height="178" fill={`url(#${wall})`} />
      <path d={merlons(414, 700, 372)} fill={`url(#${wall})`} />
      {litWindow(glow, 470, 420, 22, 36)}
      {litWindow(glow, 600, 420, 22, 36)}

      {tower(ids, { x: 40, w: 62, top: 330, tip: 262, overhang: 10 })}
      {litWindow(glow, 58, 385, 24, 40)}
      <Flag x={71} top={222} length={34} color="#FF4D94" />

      {tower(ids, { x: 320, w: 92, top: 256, tip: 150 })}
      {litWindow(glow, 352, 305, 28, 46)}
      {litWindow(glow, 352, 400, 28, 46)}
      <Flag x={366} top={108} length={40} color="#FFC53D" />

      {tower(ids, { x: 140, w: 122, top: 176, tip: 40, overhang: 16 })}
      <circle cx="201" cy="238" r="38" fill={`url(#${glow})`} />
      <path d={HEART_PATH} transform={heart(201, 238, 44)} fill="#FFE08A" />
      {litWindow(glow, 187, 300, 28, 48)}
      {litWindow(glow, 187, 400, 28, 48)}
      {/* a heart flag on the highest tower */}
      <path d="M201 44 V-2" stroke="#F6D7FF" strokeWidth="3.5" strokeLinecap="round" />
      <g transform="translate(203 -8) scale(0.4)">
        <path className="hb-castle-flag" d={HEART_PATH} fill="#FF4D94" stroke="#fff" strokeWidth="5" />
      </g>
    </g>
  );

  return (
    <svg className="hb-saver-castle" viewBox="0 -14 1600 574" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id={stone} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A452B8" />
          <stop offset="45%" stopColor="#6A2290" />
          <stop offset="100%" stopColor="#3A0C5E" />
        </linearGradient>
        <linearGradient id={wall} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#84309C" />
          <stop offset="100%" stopColor="#36094F" />
        </linearGradient>
        <linearGradient id={roof} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9ACD" />
          <stop offset="55%" stopColor="#E0126A" />
          <stop offset="100%" stopColor="#9C0B55" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="rgba(255, 214, 110, 0.55)" />
          <stop offset="100%" stopColor="rgba(255, 214, 110, 0)" />
        </radialGradient>
        <linearGradient id={ground} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B0D5C" />
          <stop offset="100%" stopColor="#1A0630" />
        </linearGradient>
      </defs>

      {half}
      <g transform="translate(1600 0) scale(-1 1)">{half}</g>

      {/* the gatehouse in the middle (behind the title) and its gate, under the wishes' sign */}
      <rect x="690" y="384" width="220" height="166" fill={`url(#${stone})`} />
      <path d={merlons(694, 906, 384, 24, 16, 20)} fill={`url(#${stone})`} />
      <rect x="684" y="384" width="232" height="11" rx="3" fill="#FFC53D" />
      <path d={arch(752, 428, 96, 122)} fill="#2A0840" stroke="#FFC53D" strokeWidth="5" />
      <path d="M800 430 V550" stroke="rgba(255, 197, 61, 0.45)" strokeWidth="3" />

      <path d="M0 540 Q 400 518 800 530 Q 1200 518 1600 540 L 1600 560 L 0 560 Z" fill={`url(#${ground})`} />
    </svg>
  );
};

// no props: drawn once, not on every change of the screensaver
export default React.memo(Castle);
