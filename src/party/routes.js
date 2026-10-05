// URL scheme of the birthday game:
//   /  (or /party)      -> TV (host) screen
//   /saver              -> the TV screen behind a birthday screensaver (a click opens the game)
//   /class              -> class mode: the TV screen for a classroom (teams, no phones)
//   /join               -> phone: enter a room code
//   /join/<code>        -> phone: join room <code>
//   /admin[/<code>]     -> the game master's phone (PIN protected, see useAdminBridge)
// Query flags: ?local=1 forces the same-browser demo transport.

export const JOIN_PATH = '/join';
export const ADMIN_PATH = '/admin';
export const SAVER_PATH = '/saver';
export const CLASS_PATH = '/class';

export const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_RE = new RegExp(`^\\d{${ROOM_CODE_LENGTH}}$`);

export const isValidRoomCode = (code) => ROOM_CODE_RE.test(String(code || ''));

export const parsePartyRoute = (pathname) => {
  const path = (pathname || '').replace(/\/+$/, '');
  if (path === SAVER_PATH) return { view: 'host', saver: true };
  if (path === CLASS_PATH) return { view: 'host', classMode: true };
  const admin = path.match(/^\/admin(?:\/([^/]+))?$/);
  if (admin) return { view: 'admin', code: admin[1] && isValidRoomCode(admin[1]) ? admin[1] : null };
  const join = path.match(/^\/join(?:\/([^/]+))?$/);
  if (join) {
    const code = join[1] && isValidRoomCode(join[1]) ? join[1] : null;
    return { view: 'player', code };
  }
  return { view: 'host' };
};

export const isForcedLocal = () =>
  new URLSearchParams(window.location.search).get('local') === '1';

export const joinUrl = (code, { local = false } = {}) =>
  `${window.location.origin}${JOIN_PATH}/${code}${local ? '?local=1' : ''}`;

// The admin link carries the PIN after "#", which never leaves the phone's browser.
export const adminUrl = (code, pin, { local = false } = {}) =>
  `${window.location.origin}${ADMIN_PATH}/${code}${local ? '?local=1' : ''}#pin=${pin}`;

// Short, human readable address shown under the QR code.
export const joinHint = () => `${window.location.host}${JOIN_PATH}`;
