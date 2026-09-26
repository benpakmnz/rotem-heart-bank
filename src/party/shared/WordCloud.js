import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CLOUD_W,
  CLOUD_H,
  START_BASE,
  buildCloudEntries,
  heartOutlinePath,
  layoutHeartCloud,
} from '../lib/heartCloud';

const FONT = "'Rubik', 'Assistant', sans-serif";
const fontSpec = (size) => `700 ${size}px ${FONT}`;

let measureCtx = null;
const measureText = (text, size) => {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = fontSpec(size);
  return { w: measureCtx.measureText(text).width, h: size * 1.08 };
};

// Measurements are only right once the web font has loaded.
const useFontsReady = () => {
  const [ready, setReady] = useState(() => !document.fonts || document.fonts.status === 'loaded');
  useEffect(() => {
    if (ready || !document.fonts) return undefined;
    let alive = true;
    Promise.race([document.fonts.load(fontSpec(60), 'אב'), new Promise((r) => setTimeout(r, 2500))])
      .catch(() => {})
      .then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [ready]);
  return ready;
};

export const useCloudLayout = (blessings, hidden) => {
  const fontsReady = useFontsReady();
  const baseRef = useRef(START_BASE);
  const visible = (blessings || []).filter((b) => !(hidden && hidden[b.id]));
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  // The host state is re-created on every change; only re-layout when the words change.
  const signature = visible.map((b) => b.id).join('|');
  return useMemo(() => {
    if (!fontsReady) return [];
    const layout = layoutHeartCloud(buildCloudEntries(visibleRef.current), measureText, { startBase: baseRef.current });
    baseRef.current = layout.base;
    return layout.items;
  }, [signature, fontsReady]); // eslint-disable-line react-hooks/exhaustive-deps
};

const OUTLINE = heartOutlinePath();

// "ענן מילים בצורת לב" - words fly in from below and settle inside the heart.
const WordCloud = ({ items, onWordClick, className = '' }) => (
  <svg
    className={`hb-cloud ${className}`}
    viewBox={`-20 -20 ${CLOUD_W + 40} ${CLOUD_H + 40}`}
    role="img"
    aria-label={items.map((it) => it.text).join(', ')}
  >
    <defs>
      <radialGradient id="hb-cloud-bg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#FFE4EC" />
      </radialGradient>
    </defs>
    <path d={OUTLINE} className="hb-cloud-heart" fill="url(#hb-cloud-bg)" />
    {items.map((it) => (
      <g key={it.key} className="hb-cloud-slot" style={{ transform: `translate(${it.x}px, ${it.y}px)` }}>
        <motion.g
          initial={{ opacity: 0, scale: 0.2, y: 700 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 13 }}
        >
          <text
            className={`hb-cloud-word ${onWordClick ? 'is-clickable' : ''}`}
            fontSize={it.size}
            fill={it.color}
            textAnchor="middle"
            dominantBaseline="central"
            onClick={onWordClick ? () => onWordClick(it) : undefined}
          >
            {it.text}
          </text>
        </motion.g>
      </g>
    ))}
  </svg>
);

export default WordCloud;

// The digital souvenir ("המזכרת הדיגיטלית"): the cloud as a PNG download.
export const downloadCloudPng = (items, { title, subtitle, fileName = 'blessings.png' }) => {
  const scale = 2;
  const top = 260;
  const bottom = 140;
  const canvas = document.createElement('canvas');
  canvas.width = (CLOUD_W + 200) * scale;
  canvas.height = (CLOUD_H + top + bottom) * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const W = CLOUD_W + 200;

  const bg = ctx.createLinearGradient(0, 0, W, CLOUD_H + top + bottom);
  bg.addColorStop(0, '#FFF1F4');
  bg.addColorStop(1, '#FFE0EA');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, CLOUD_H + top + bottom);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#E11D48';
  ctx.font = `700 76px ${FONT}`;
  ctx.fillText(title, W / 2, 110);
  ctx.fillStyle = '#5B6475';
  ctx.font = `400 38px ${FONT}`;
  ctx.fillText(subtitle, W / 2, 190);

  ctx.save();
  ctx.translate(100, top);
  const heart = new Path2D(OUTLINE);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(225, 29, 72, 0.18)';
  ctx.shadowBlur = 40;
  ctx.fill(heart);
  ctx.shadowBlur = 0;
  items.forEach((it) => {
    ctx.fillStyle = it.color;
    ctx.font = fontSpec(it.size);
    ctx.fillText(it.text, it.x, it.y);
  });
  ctx.restore();

  ctx.fillStyle = '#9AA3B2';
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText(new Date().toLocaleDateString('he-IL'), W / 2, CLOUD_H + top + bottom / 2);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
};
