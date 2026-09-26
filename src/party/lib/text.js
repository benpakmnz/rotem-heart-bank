import { shuffle } from './random';

// Free text typed on a phone: no control characters, single spaces, capped length.
export const cleanText = (value, maxLength) =>
  Array.from(
    String(value || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
    .slice(0, maxLength)
    .join('')
    .trim();

// Words of the letters game: letters, digits and single spaces only (no niqqud).
export const normalizeWord = (value) =>
  String(value || '')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');

export const wordLetters = (word) => Array.from(normalizeWord(word).replace(/ /g, ''));

// "מזל טוב" -> [3, 3]: how many boxes per word on the TV/phone.
export const wordShape = (word) => {
  const normalized = normalizeWord(word);
  return normalized ? normalized.split(' ').map((w) => Array.from(w).length) : [];
};

// Rebuild a word (with its spaces) from a flat list of letters.
export const joinByShape = (letters, shape) => {
  const out = [];
  let i = 0;
  shape.forEach((len) => {
    out.push(letters.slice(i, i + len).join(''));
    i += len;
  });
  return out.join(' ');
};

// Shuffle letters so they never come out in the answer's order (when possible).
export const scrambleLetters = (letters, rng) => {
  const answer = letters.join('');
  const canDiffer = new Set(letters).size > 1;
  let scrambled = shuffle(letters, rng);
  for (let tries = 0; canDiffer && scrambled.join('') === answer && tries < 25; tries += 1) {
    scrambled = shuffle(letters, rng);
  }
  return scrambled;
};

// Normalizes a blessing so the same wish sent twice grows in the word cloud.
export const blessingKey = (text) => cleanText(text, 100).toLowerCase();
