// Class mode helpers shared by the TV's screens and menu.

// To print: 4 colored answer cards per team (public/answer-cards.pdf), and a
// pyramid sign with its heart for every team color (public/team-signs.pdf).
export const ANSWER_CARDS_PATH = '/answer-cards.pdf';
export const TEAM_SIGNS_PATH = '/team-signs.pdf';

const openFile = (path) => window.open(`${process.env.PUBLIC_URL || ''}${path}`, '_blank', 'noopener');
export const openAnswerCards = () => openFile(ANSWER_CARDS_PATH);
export const openTeamSigns = () => openFile(TEAM_SIGNS_PATH);

// The keyboard: the TV's main button runs on Enter/Space (see HostGame), but
// a screen can claim a key first (the clap meter counts the space bar).
export const isTypingTarget = (el) => Boolean(el) && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
