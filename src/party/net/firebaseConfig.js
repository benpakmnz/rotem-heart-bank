// Firebase Realtime Database settings, read at build time (see README.md).
// The game's own database is built in; REACT_APP_FIREBASE_DATABASE_URL overrides it.
// Values are trimmed: a space or newline pasted into Vercel would break the URL.
const env = (value) => (value || '').trim() || undefined;

const GAME_DATABASE_URL = 'https://rotem-heart-bank-default-rtdb.europe-west1.firebasedatabase.app';

export const firebaseConfig = {
  apiKey: env(process.env.REACT_APP_FIREBASE_API_KEY),
  authDomain: env(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
  databaseURL: env(process.env.REACT_APP_FIREBASE_DATABASE_URL) || GAME_DATABASE_URL,
  projectId: env(process.env.REACT_APP_FIREBASE_PROJECT_ID),
  appId: env(process.env.REACT_APP_FIREBASE_APP_ID),
};

// "127.0.0.1:9000" to use the local Firebase emulator (development only).
export const firebaseEmulatorHost = env(process.env.REACT_APP_FIREBASE_EMULATOR_HOST) || '';

export const isFirebaseConfigured = () => Boolean(firebaseConfig.databaseURL || firebaseEmulatorHost);
