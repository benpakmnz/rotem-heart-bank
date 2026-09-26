export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('he-IL');

export const secondsLeft = (endsAt, now) =>
  endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
