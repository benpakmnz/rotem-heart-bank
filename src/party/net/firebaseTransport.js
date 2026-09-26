import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  onDisconnect,
} from 'firebase/database';
import { firebaseConfig, firebaseEmulatorHost } from './firebaseConfig';
import { toJsonValue } from './paths';

// Realtime sync through Firebase Realtime Database. Everything of one game
// lives under rooms/<code>/ (see database.rules.json).

let db = null;
let serverOffset = 0;
let connected = false;
const connectionListeners = new Set();

const database = () => {
  if (db) return db;
  const emulator = firebaseEmulatorHost ? firebaseEmulatorHost.split(':') : null;
  const projectId = firebaseConfig.projectId || 'demo-heartbank';
  const config = emulator
    ? { projectId, databaseURL: `http://${firebaseEmulatorHost}?ns=${projectId}` }
    : Object.fromEntries(Object.entries(firebaseConfig).filter(([, v]) => v));
  const app = getApps()[0] || initializeApp(config);
  db = getDatabase(app);
  if (emulator) connectDatabaseEmulator(db, emulator[0], Number(emulator[1]) || 9000);
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    serverOffset = Number(snap.val()) || 0;
  });
  onValue(ref(db, '.info/connected'), (snap) => {
    connected = Boolean(snap.val());
    connectionListeners.forEach((cb) => cb(connected));
  });
  return db;
};

const logError = (what) => (err) => {
  // eslint-disable-next-line no-console
  console.warn(`[heartbank] ${what} failed`, err);
};

export const createFirebaseRoom = (code) => {
  const d = database();
  const roomRef = (path) => ref(d, path ? `rooms/${code}/${path}` : `rooms/${code}`);

  return {
    kind: 'firebase',
    code,
    subscribe: (path, cb) =>
      onValue(
        roomRef(path),
        (snap) => cb(snap.val()),
        logError(`subscribe ${path}`)
      ),
    get: async (path) => (await get(roomRef(path))).val(),
    set: (path, value) => set(roomRef(path), toJsonValue(value)).catch(logError(`set ${path}`)),
    update: (path, patch) => update(roomRef(path), toJsonValue(patch)).catch(logError(`update ${path}`)),
    remove: (path) => remove(roomRef(path)).catch(logError(`remove ${path}`)),
    serverNow: () => Date.now() + serverOffset,
    onConnection: (cb) => {
      connectionListeners.add(cb);
      cb(connected);
      return () => connectionListeners.delete(cb);
    },
    // Keeps <path> true while this device is online; the server flips it to
    // false when the connection drops. Cleanup never writes, so a removed
    // player isn't brought back.
    presence: (path) => {
      const target = roomRef(path);
      const unsubscribe = onValue(ref(d, '.info/connected'), (snap) => {
        if (!snap.val()) return;
        onDisconnect(target)
          .set(false)
          .then(() => set(target, true))
          .catch(logError(`presence ${path}`));
      });
      return () => {
        unsubscribe();
        onDisconnect(target).cancel().catch(() => {});
      };
    },
  };
};
