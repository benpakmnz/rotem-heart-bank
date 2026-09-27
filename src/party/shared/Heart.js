import React, { useId } from 'react';

// Heart in a 100 x 92 box.
export const HEART_PATH =
  'M50 88 C 22 67, 3 49, 3 29 C 3 14, 14 3, 28 3 C 38 3, 46 9, 50 17 C 54 9, 62 3, 72 3 C 86 3, 97 14, 97 29 C 97 49, 78 67, 50 88 Z';

// SVG ids must be unique per instance and safe inside url(#...).
export const useSvgId = (prefix) => `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

export const Heart = ({ color = 'currentColor', className = '', style, label, children }) => (
  <svg
    viewBox="0 0 100 92"
    className={`hb-heart-icon ${className}`}
    style={style}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <path d={HEART_PATH} fill={color} />
    {children}
  </svg>
);

// Candy heart: gradient fill, white outline and a shine spot.
export const GlossyHeart = ({ from = '#FF8CC6', to = '#E0126A', stroke = '#fff', className = '', style, children }) => {
  const grad = useSvgId('hb-glossy');
  return (
    <svg viewBox="-4 -4 108 100" className={`hb-heart-icon ${className}`} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <path d={HEART_PATH} fill={`url(#${grad})`} stroke={stroke} strokeWidth={stroke === 'none' ? 0 : 4} strokeLinejoin="round" />
      <ellipse cx="27" cy="22" rx="11" ry="5.5" fill="rgba(255,255,255,0.45)" transform="rotate(-38 27 22)" />
      {children}
    </svg>
  );
};

// The blueprint's logo: a red heart crossed by a white heartbeat line.
export const LogoHeart = ({ className = '', style }) => {
  const clipId = useSvgId('hb-logo-clip');
  return (
    <svg viewBox="0 0 100 92" className={`hb-logo-heart ${className}`} style={style} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={HEART_PATH} />
        </clipPath>
      </defs>
      <path d={HEART_PATH} fill="#E11D48" />
      <path
        d="M-4 46 H31 L37.5 36 L45 58 L53 29 L59.5 46 H104"
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke="#fff"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
