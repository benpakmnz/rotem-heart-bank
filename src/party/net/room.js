import { isForcedLocal, ROOM_CODE_LENGTH } from '../routes';
import { isFirebaseConfigured } from './firebaseConfig';
import { createLocalRoom } from './localTransport';

// A "room" connection:
//   subscribe(path, cb) -> unsubscribe     get(path) -> Promise<value>
//   set / update / remove (path, ...)      serverNow() -> ms (shared clock)
//   onConnection(cb) -> unsubscribe        presence(path) -> cleanup
// Paths are relative to the room: "state", "players/<id>", "inputs/<round>/<id>"...

export const transportMode = () => (isForcedLocal() || !isFirebaseConfigured() ? 'local' : 'firebase');

export const connectRoom = async (code, { role }) => {
  if (transportMode() === 'local') return createLocalRoom(code, { authority: role === 'host' });
  // The Firebase SDK is only downloaded when it's actually used.
  const { createFirebaseRoom } = await import('./firebaseTransport');
  return createFirebaseRoom(code);
};

export const randomRoomCode = () => {
  const min = 10 ** (ROOM_CODE_LENGTH - 1);
  return String(min + Math.floor(Math.random() * (9 * min)));
};

// A fresh code that no other game in the database is using.
export const allocateRoom = async () => {
  for (let tries = 0; tries < 8; tries += 1) {
    const code = randomRoomCode();
    // eslint-disable-next-line no-await-in-loop
    const conn = await connectRoom(code, { role: 'host' });
    // eslint-disable-next-line no-await-in-loop
    const meta = await conn.get('meta');
    if (!meta) return conn;
  }
  throw new Error('Could not allocate a room code');
};
