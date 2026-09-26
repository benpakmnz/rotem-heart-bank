// URL scheme of the birthday game:
//   /  (or /party)      -> TV (host) screen
//   /join               -> phone: enter a room code
//   /join/<code>        -> phone: join room <code>
// Query flags: ?local=1 forces the same-browser demo transport.

export const JOIN_PATH = '/join';

export const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_RE = new RegExp(`^\\d{${ROOM_CODE_LENGTH}}$`);

export const isValidRoomCode = (code) => ROOM_CODE_RE.test(String(code || ''));

export const parsePartyRoute = (pathname) => {
  const path = (pathname || '').replace(/\/+$/, '');
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

// Short, human readable address shown under the QR code.
export const joinHint = () => `${window.location.host}${JOIN_PATH}`;
