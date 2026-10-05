// Class mode helpers shared by the TV's screens and menu.

// 4 colored answer cards per team, to print (public/answer-cards.pdf).
export const ANSWER_CARDS_PATH = '/answer-cards.pdf';

export const openAnswerCards = () => window.open(`${process.env.PUBLIC_URL || ''}${ANSWER_CARDS_PATH}`, '_blank', 'noopener');

// The keyboard: the TV's main button runs on Enter/Space (see HostGame), but
// a screen can claim a key first (the clap meter counts the space bar).
export const isTypingTarget = (el) => Boolean(el) && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
