// Player avatars: an emoji on a pastel bubble.
export const AVATARS = [
  { id: 'unicorn', emoji: '🦄', color: '#FBCFE8' },
  { id: 'cat', emoji: '🐱', color: '#FDE68A' },
  { id: 'dog', emoji: '🐶', color: '#FED7AA' },
  { id: 'bunny', emoji: '🐰', color: '#E9D5FF' },
  { id: 'fox', emoji: '🦊', color: '#FDBA74' },
  { id: 'panda', emoji: '🐼', color: '#E5E7EB' },
  { id: 'frog', emoji: '🐸', color: '#BBF7D0' },
  { id: 'monkey', emoji: '🐵', color: '#FCD9B6' },
  { id: 'lion', emoji: '🦁', color: '#FDE047' },
  { id: 'tiger', emoji: '🐯', color: '#FDBA74' },
  { id: 'koala', emoji: '🐨', color: '#D1D5DB' },
  { id: 'pig', emoji: '🐷', color: '#FBCFE8' },
  { id: 'octopus', emoji: '🐙', color: '#FECDD3' },
  { id: 'butterfly', emoji: '🦋', color: '#BFDBFE' },
  { id: 'bee', emoji: '🐝', color: '#FEF08A' },
  { id: 'ladybug', emoji: '🐞', color: '#FECACA' },
  { id: 'turtle', emoji: '🐢', color: '#BBF7D0' },
  { id: 'dolphin', emoji: '🐬', color: '#A5F3FC' },
  { id: 'dino', emoji: '🦖', color: '#D9F99D' },
  { id: 'penguin', emoji: '🐧', color: '#C7D2FE' },
  { id: 'owl', emoji: '🦉', color: '#E7D3BD' },
  { id: 'hamster', emoji: '🐹', color: '#FDE2C4' },
  { id: 'bear', emoji: '🐻', color: '#E7C9A9' },
  { id: 'star', emoji: '🌟', color: '#FEF3C7' },
];

const FALLBACK = AVATARS[0];

export const avatarById = (id) => AVATARS.find((a) => a.id === id) || FALLBACK;
