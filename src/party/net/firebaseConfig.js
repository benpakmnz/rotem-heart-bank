// Firebase Realtime Database settings, read at build time (see README.md).
// Only the database URL is required; the rest is optional.
// Values are trimmed: a space or newline pasted into Vercel would break the URL.
const env = (value) => (value || '').trim() || undefined;

export const firebaseConfig = {
  apiKey: env(process.env.REACT_APP_FIREBASE_API_KEY),
  authDomain: env(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
  databaseURL: env(process.env.REACT_APP_FIREBASE_DATABASE_URL),
  projectId: env(process.env.REACT_APP_FIREBASE_PROJECT_ID),
  appId: env(process.env.REACT_APP_FIREBASE_APP_ID),
};

// "127.0.0.1:9000" to use the local Firebase emulator (development only).
export const firebaseEmulatorHost = env(process.env.REACT_APP_FIREBASE_EMULATOR_HOST) || '';

export const isFirebaseConfigured = () => Boolean(firebaseConfig.databaseURL || firebaseEmulatorHost);
