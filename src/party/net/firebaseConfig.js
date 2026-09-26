// Firebase Realtime Database settings, read at build time (see README.md).
// Only the database URL is required; the rest is optional.
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// "127.0.0.1:9000" to use the local Firebase emulator (development only).
export const firebaseEmulatorHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || '';

export const isFirebaseConfigured = () => Boolean(firebaseConfig.databaseURL || firebaseEmulatorHost);
