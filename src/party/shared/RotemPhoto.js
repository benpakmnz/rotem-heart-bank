import React, { useEffect, useState } from 'react';
import { HEART_PATH, useSvgId } from './Heart';
import { Sparkle } from './PartyBackdrop';

// The birthday girl: public/rotem.png, a drawing of Rotem as the queen of
// hearts cut out on a transparent background (its width = the heart's width,
// the face center 61% down the drawing). Her own crown pops out above the
// heart frame. Without the file a placeholder heart with a drawn crown is shown.
const PHOTO_URL = `${process.env.PUBLIC_URL || ''}/rotem.png`;
// where the drawing sits in the heart's 100 x 92 box
const ART = { x: 0, y: -25.3, width: 100, height: 114.6 };

let photoPromise = null;
let knownUrl; // undefined = not checked yet, null = no photo

const loadPhoto = () => {
  if (!photoPromise) {
    photoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 ? PHOTO_URL : null);
      img.onerror = () => resolve(null);
      img.src = PHOTO_URL;
    }).then((url) => {
      knownUrl = url;
      return url;
    });
  }
  return photoPromise;
};

export const usePhotoUrl = () => {
  const [url, setUrl] = useState(knownUrl);
  useEffect(() => {
    let alive = true;
    loadPhoto().then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, []);
  return url;
};

export const Crown = ({ className = '', style }) => {
  const gold = useSvgId('hb-crown-gold');
  return (
    <svg viewBox="0 0 64 46" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF6C8" />
          <stop offset="45%" stopColor="#FFCC33" />
          <stop offset="100%" stopColor="#E38B00" />
        </linearGradient>
      </defs>
      <path d="M5 36 L 8 11 L 21 24 L 32 5 L 43 24 L 56 11 L 59 36 Z" fill={`url(#${gold})`} stroke="#B86400" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="4" y="34" width="56" height="9" rx="3.5" fill={`url(#${gold})`} stroke="#B86400" strokeWidth="2.2" />
      <circle cx="8" cy="10" r="4" fill="#FF4D94" stroke="#fff" strokeWidth="1.3" />
      <circle cx="32" cy="5" r="4.5" fill="#FF4D94" stroke="#fff" strokeWidth="1.3" />
      <circle cx="56" cy="10" r="4" fill="#FF4D94" stroke="#fff" strokeWidth="1.3" />
      <circle cx="32" cy="38.5" r="3.2" fill="#4CC9F0" stroke="#fff" strokeWidth="1" />
      <circle cx="18" cy="38.5" r="2.4" fill="#C77DFF" stroke="#fff" strokeWidth="1" />
      <circle cx="46" cy="38.5" r="2.4" fill="#C77DFF" stroke="#fff" strokeWidth="1" />
      <path d="M12 30 L 16 18" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

const SPARKLES = [
  { top: '-8%', right: '6%', width: '15%', height: '15%', animationDelay: '0s' },
  { top: '34%', right: '-13%', width: '10%', height: '10%', animationDelay: '0.8s' },
  { bottom: '6%', right: '-5%', width: '12%', height: '12%', animationDelay: '1.5s' },
  { top: '-12%', left: '44%', width: '9%', height: '9%', animationDelay: '1.9s' },
  { top: '48%', left: '-13%', width: '11%', height: '11%', animationDelay: '0.4s' },
];

// Rotem's photo in a golden heart frame, with a glow, a crown and twinkles.
const RotemPhoto = ({ size = 'md', age, crown = true, sparkles = true, beat = false, className = '', style }) => {
  const src = usePhotoUrl();
  const clip = useSvgId('hb-photo-clip');
  const rim = useSvgId('hb-photo-rim');
  const bg = useSvgId('hb-photo-bg');
  const top = useSvgId('hb-photo-top');
  return (
    <div
      className={`hb-photo hb-photo-${size} ${src ? 'has-art' : ''} ${beat ? 'hb-photo-beat' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div className="hb-photo-glow" />
      <svg viewBox="-6 -6 112 104" className="hb-photo-svg">
        <defs>
          <clipPath id={clip}>
            <path d={HEART_PATH} />
          </clipPath>
          <clipPath id={top}>
            <rect x="-20" y="-40" width="140" height="62" />
          </clipPath>
          <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF4C2" />
            <stop offset="35%" stopColor="#FFC93C" />
            <stop offset="70%" stopColor="#FF9F1C" />
            <stop offset="100%" stopColor="#FFE08A" />
          </linearGradient>
          <radialGradient id={bg} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#FFC2DF" />
            <stop offset="100%" stopColor="#E0126A" />
          </radialGradient>
        </defs>
        <path d={HEART_PATH} fill={`url(#${bg})`} />
        {src ? (
          <image href={src} {...ART} clipPath={`url(#${clip})`} />
        ) : (
          src === null && (
            <text x="50" y="47" textAnchor="middle" dominantBaseline="central" fontSize="40">
              👧
            </text>
          )
        )}
        <path d={HEART_PATH} fill="none" stroke={`url(#${rim})`} strokeWidth="5.5" strokeLinejoin="round" />
        <path d={HEART_PATH} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinejoin="round" />
        {/* the crown and hair again, over the frame's top edge */}
        {src ? (
          <image href={src} {...ART} clipPath={`url(#${top})`} />
        ) : (
          <ellipse cx="25" cy="20" rx="9" ry="4.5" fill="rgba(255,255,255,0.35)" transform="rotate(-38 25 20)" />
        )}
      </svg>
      {crown && src === null && <Crown className="hb-photo-crown" />}
      {age ? <span className="hb-photo-age">{age}</span> : null}
      {sparkles && SPARKLES.map((s, i) => <Sparkle key={i} className="hb-photo-sparkle" style={s} />)}
    </div>
  );
};

export default RotemPhoto;
