// The game's soundtrack: one short original loop per part of the game
// (plus "Happy Birthday", which is public domain), played by music.js.
//
// Each part is a string of steps, `res` steps per bar ("|" is only for reading):
//   C5 / Bb3 / F#4   a note       C4+E4+G4   a chord
//   -                hold the previous note
//   .                rest
// Drum steps are letters: k kick, s snare, c clap, h hat, o open hat,
// t clock tick, w woodblock (e.g. "ks" = kick + snare).
// A part shorter than the track repeats.

const repeat = (text, times) => Array.from({ length: times }, () => text).join(' | ');

// arpeggio of chord notes by index pattern, e.g. arp('A4 C5 E5 A5', '0123 2101 2321 0121')
const arp = (notes, pattern) => {
  const list = notes.split(' ');
  return pattern
    .replace(/\s/g, '')
    .split('')
    .map((i) => list[Number(i)])
    .join(' ');
};

const UP_DOWN = '0123 2123 0123 2121';
const ROLL = '0123 1230 2301 3210';

export const TRACKS = {
  // lobby: bouncy music box while the family joins
  lobby: {
    bpm: 112,
    bars: 8,
    parts: [
      {
        inst: 'bell',
        vol: 0.9,
        res: 8,
        notes:
          'E5 G5 C6 G5 A5 G5 E5 - | C5 E5 A5 E5 G5 E5 C5 - | A5 C6 F5 A5 G5 F5 E5 D5 | D5 G5 B5 D6 C6 B5 G5 - | ' +
          'G5 - E5 G5 C6 - B5 C6 | A5 - E5 A5 C6 - B5 A5 | F5 A5 C6 A5 G5 F5 E5 F5 | D6 B5 G5 B5 D6 - . .',
      },
      {
        inst: 'pluck',
        vol: 0.55,
        res: 8,
        notes: repeat(
          '. C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 | . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 | ' +
            '. A3+C4+F4 . A3+C4+F4 . A3+C4+F4 . A3+C4+F4 | . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 . B3+D4+G4',
          2
        ),
      },
      { inst: 'bass', vol: 0.9, res: 8, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
      { inst: 'drums', vol: 0.6, res: 16, notes: 'k . h . c . h . k . h k c . h h' },
    ],
  },

  // stage title cards: light "here's how it works" pizzicato
  intro: {
    bpm: 100,
    bars: 4,
    parts: [
      { inst: 'pluck', vol: 0.95, res: 8, notes: 'C5 . A4 C5 F5 . E5 F5 | D5 . A4 D5 F5 . E5 D5 | D5 . Bb4 D5 F5 . G5 F5 | E5 . C5 E5 G5 F5 E5 D5' },
      { inst: 'pad', vol: 0.55, res: 1, notes: 'F3+A3+C4 | D3+F3+A3 | Bb2+D3+F3 | C3+E3+G3+Bb3' },
      { inst: 'bass', vol: 0.85, res: 8, notes: 'F2 . . F2 C3 . . C3 | D2 . . D2 A2 . . A2 | Bb1 . . Bb1 F2 . . F2 | C2 . . C2 G2 . . G2' },
      { inst: 'drums', vol: 0.45, res: 16, notes: 'k . h . w . h . k . h . w . h .' },
    ],
  },

  // stage 1: tap like crazy!
  tap: {
    bpm: 150,
    bars: 4,
    parts: [
      {
        inst: 'arp',
        vol: 0.5,
        res: 16,
        notes: [
          arp('A4 C5 E5 A5', UP_DOWN),
          arp('F4 A4 C5 F5', UP_DOWN),
          arp('E4 G4 C5 E5', UP_DOWN),
          arp('D4 G4 B4 D5', UP_DOWN),
        ].join(' | '),
      },
      { inst: 'lead', vol: 0.6, res: 8, notes: 'A5 . E5 A5 C6 . B5 A5 | A5 . F5 A5 C6 . D6 C6 | G5 . E5 G5 C6 . B5 G5 | B5 . G5 B5 D6 . C6 B5' },
      {
        inst: 'bass',
        vol: 0.9,
        res: 8,
        notes: 'A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | C3 C3 C4 C3 C3 C3 C4 C3 | G2 G2 G3 G2 G2 G2 G3 G2',
      },
      { inst: 'drums', vol: 0.75, res: 16, notes: 'k . o . ks . o . k . o . ks . o h' },
    ],
  },

  // stage 2: thinking music with a ticking clock
  trivia: {
    bpm: 118,
    bars: 4,
    parts: [
      { inst: 'pad', vol: 0.6, res: 1, notes: 'D3+F3+A3 | Bb2+D3+F3 | G2+Bb2+D3 | A2+C#3+E3' },
      { inst: 'pluck', vol: 0.6, res: 8, notes: 'D4 . A4 . D4 . A4 . | Bb3 . F4 . Bb3 . F4 . | G3 . D4 . G3 . D4 . | A3 . E4 . A3 . E4 .' },
      { inst: 'bell', vol: 0.7, res: 8, notes: 'A5 . . F5 . . D5 . | F5 . . D5 . . Bb4 . | G5 . . D5 . . Bb4 . | C#5 . E5 . A5 . . .' },
      { inst: 'bass', vol: 0.8, res: 8, notes: 'D2 . D3 . D2 . D3 . | Bb1 . Bb2 . Bb1 . Bb2 . | G1 . G2 . G1 . G2 . | A1 . A2 . A1 . C#3 .' },
      { inst: 'drums', vol: 0.55, res: 16, notes: 'kt . t . t . t . kt . t . t . t .' },
    ],
  },

  // stage 3: sneaky, playful mime music
  charades: {
    bpm: 104,
    swing: 0.16,
    bars: 4,
    parts: [
      { inst: 'pluck', vol: 1, res: 8, notes: 'D5 . D#5 E5 . D5 B4 . | G4 . A4 B4 . G4 E4 . | E5 . F5 F#5 G5 . E5 C5 | D5 . C5 B4 A4 . F#4 .' },
      { inst: 'pluck', vol: 0.45, res: 8, notes: '. G3+B3+D4 . . . G3+B3+D4 . . | . G3+B3+E4 . . . G3+B3+E4 . . | . G3+C4+E4 . . . G3+C4+E4 . . | . F#3+A3+D4 . . . F#3+A3+D4 . .' },
      { inst: 'bass', vol: 0.9, res: 8, notes: 'G2 . B2 . D3 . B2 . | E2 . G2 . B2 . G2 . | C3 . E3 . G3 . E3 . | D3 . F#3 . A3 . F#2 .' },
      { inst: 'drums', vol: 0.6, res: 16, notes: 'k . w . h . w . s . w . h w . .' },
    ],
  },

  // stage 4: curious, mysterious letters
  word: {
    bpm: 96,
    bars: 4,
    parts: [
      {
        inst: 'bell',
        vol: 0.45,
        res: 16,
        notes: [arp('E4 G4 B4 E5', ROLL), arp('C4 E4 G4 C5', ROLL), arp('D4 G4 B4 D5', ROLL), arp('D4 F#4 A4 D5', ROLL)].join(' | '),
      },
      { inst: 'pluck', vol: 0.8, res: 8, notes: 'B5 . . . G5 . E5 . | E5 . . . G5 . C6 . | B5 . . . D6 . B5 . | A5 . . . F#5 . D5 .' },
      { inst: 'pad', vol: 0.5, res: 1, notes: 'E3+G3+B3 | C3+E3+G3 | G2+B2+D3 | D3+F#3+A3' },
      { inst: 'bass', vol: 0.8, res: 4, notes: 'E2 - - E2 | C2 - - C2 | G2 - - G2 | D2 - - D2' },
      { inst: 'drums', vol: 0.45, res: 16, notes: 'k . . h . . h . . . k h . . h .' },
    ],
  },

  // stage 5: warm and dreamy, for the wishes
  blessings: {
    bpm: 76,
    bars: 8,
    parts: [
      {
        inst: 'bell',
        vol: 0.9,
        res: 8,
        notes:
          'G5 - Bb5 - Eb6 - D6 - | C6 - G5 - Eb5 - G5 - | Ab5 - C6 - Eb6 - C6 - | Bb5 - D6 - F6 - D6 - | ' +
          'Eb6 - D6 Bb5 G5 - Bb5 - | C6 - Bb5 G5 Eb5 - G5 - | Ab5 - G5 F5 Eb5 - C5 - | D5 - F5 - Bb5 - - -',
      },
      {
        inst: 'pluck',
        vol: 0.4,
        res: 16,
        notes: repeat(
          [arp('Eb4 G4 Bb4 Eb5', UP_DOWN), arp('C4 Eb4 G4 C5', UP_DOWN), arp('Ab3 C4 Eb4 Ab4', UP_DOWN), arp('Bb3 D4 F4 Bb4', UP_DOWN)].join(' | '),
          2
        ),
      },
      { inst: 'pad', vol: 0.55, res: 1, notes: 'Eb3+G3+Bb3 | C3+Eb3+G3 | Ab2+C3+Eb3 | Bb2+D3+F3' },
      { inst: 'bass', vol: 0.75, res: 4, notes: 'Eb2 - - - | C2 - - - | Ab1 - - - | Bb1 - - -' },
    ],
  },

  // hidden hearts: a sneaky treasure hunt
  hunt: {
    bpm: 112,
    swing: 0.12,
    bars: 4,
    parts: [
      { inst: 'pluck', vol: 1, res: 8, notes: 'E5 . . C5 D5 E5 . . | F5 . . D5 E5 F5 . . | E5 . G#5 . B5 . G#5 E5 | A5 . E5 . C5 . A4 .' },
      { inst: 'bell', vol: 0.4, res: 8, notes: '. . . . . . A5 . | . . . . . . D6 . | . . . . . . B5 . | . . . . . . . .' },
      { inst: 'bass', vol: 0.9, res: 8, notes: 'A2 . C3 . E3 . C3 . | D2 . F2 . A2 . F2 . | E2 . G#2 . B2 . G#2 . | A2 . E2 . A2 . . .' },
      { inst: 'drums', vol: 0.55, res: 16, notes: 'k . h w . . h . s . h w . . h .' },
    ],
  },

  // throwing hearts into the basket: stadium cheer
  basket: {
    bpm: 128,
    bars: 4,
    parts: [
      { inst: 'brass', vol: 0.7, res: 8, notes: 'E5 . G5 . C6 - - . | D6 . B5 . G5 - - . | C6 . A5 . E5 - - . | F5 . A5 . C6 - D6 .' },
      {
        inst: 'pluck',
        vol: 0.45,
        res: 8,
        notes: '. C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 | . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 | . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 | . A3+C4+F4 . A3+C4+F4 . A3+C4+F4 . A3+C4+F4',
      },
      { inst: 'bass', vol: 0.9, res: 8, notes: 'C2 C2 . C2 C3 . C2 . | G1 G1 . G1 G2 . G1 . | A1 A1 . A1 A2 . A1 . | F1 F1 . F1 F2 . F1 .' },
      { inst: 'drums', vol: 0.75, res: 16, notes: 'k . k . c . h . k . k . c . h h' },
    ],
  },

  // end of a stage: victory lap
  results: {
    bpm: 124,
    bars: 4,
    parts: [
      { inst: 'brass', vol: 0.75, res: 8, notes: 'G4 C5 E5 G5 - - E5 G5 | A5 - F5 A5 C6 - A5 - | B5 - G5 B5 D6 - B5 G5 | C6 - - - G5 - C6 -' },
      { inst: 'pluck', vol: 0.5, res: 8, notes: 'C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . | C4+F4+A4 . C4+F4+A4 . C4+F4+A4 . C4+F4+A4 . | B3+D4+G4 . B3+D4+G4 . B3+D4+G4 . B3+D4+G4 . | C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 .' },
      { inst: 'bass', vol: 0.9, res: 8, notes: 'C2 . C3 . C2 . C3 . | F2 . F3 . F2 . F3 . | G2 . G3 . G2 . G3 . | C3 . G2 . C3 . C2 .' },
      { inst: 'drums', vol: 0.7, res: 16, notes: 'k . h . s . h . k k h . s . h h' },
    ],
  },

  // finale: Happy Birthday with an oom-pah-pah band (3/4)
  finale: {
    bpm: 132,
    beats: 3,
    bars: 8,
    startBar: 7, // begin with the "Hap-py" pickup
    parts: [
      {
        inst: 'lead',
        vol: 0.55,
        res: 12,
        notes:
          'A4 - - - G4 - - - C5 - - - | B4 - - - - - - - G4 - - G4 | A4 - - - G4 - - - D5 - - - | C5 - - - - - - - G4 - - G4 | ' +
          'G5 - - - E5 - - - C5 - - - | B4 - - - A4 - - - F5 - - F5 | E5 - - - C5 - - - D5 - - - | C5 - - - - - - - G4 - - G4',
      },
      {
        inst: 'bell',
        vol: 0.6,
        res: 12,
        notes:
          'A5 - - - G5 - - - C6 - - - | B5 - - - - - - - G5 - - G5 | A5 - - - G5 - - - D6 - - - | C6 - - - - - - - G5 - - G5 | ' +
          'G6 - - - E6 - - - C6 - - - | B5 - - - A5 - - - F6 - - F6 | E6 - - - C6 - - - D6 - - - | C6 - - - - - - - G5 - - G5',
      },
      {
        inst: 'pluck',
        vol: 0.5,
        res: 3,
        notes:
          '. C4+E4+G4 C4+E4+G4 | . B3+D4+G4 B3+D4+G4 | . B3+D4+F4 B3+D4+F4 | . C4+E4+G4 C4+E4+G4 | ' +
          '. C4+E4+Bb4 C4+E4+Bb4 | . C4+F4+A4 C4+F4+A4 | . C4+E4+G4 B3+D4+F4 | . C4+E4+G4 C4+E4+G4',
      },
      { inst: 'bass', vol: 0.9, res: 3, notes: 'C3 . . | G2 . . | G2 . . | C3 . . | C3 . . | F2 . . | C3 . G2 | C3 . .' },
      { inst: 'drums', vol: 0.55, res: 12, notes: 'k . . . h . . . h . . .' },
    ],
  },
};

// Which music goes with which moment of the game (null = silence).
export const trackFor = (phase, step) => {
  if (phase === 'lobby') return 'lobby';
  if (step === 'intro') return 'intro';
  if (step === 'countdown' || step === 'pick' || step === 'fill') return null;
  if (step === 'results') return 'results';
  switch (phase) {
    case 'tap':
      return 'tap';
    case 'trivia':
      return 'trivia';
    case 'charades':
      return 'charades';
    case 'word':
      return 'word';
    case 'blessings':
      return 'blessings';
    case 'hunt':
      return 'hunt';
    case 'basket':
      return 'basket';
    case 'finale':
      return step === 'celebrate' ? 'finale' : null;
    default:
      return null;
  }
};
