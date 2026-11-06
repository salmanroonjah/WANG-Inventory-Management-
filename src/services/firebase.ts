import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

function createDb(): Firestore {
  try {
    // Offline cache shared between tabs, and undefined fields are dropped instead of
    // throwing (form payloads often carry optional fields as undefined).
    return initializeFirestore(
      app,
      {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    // Already initialized (hot reload) or IndexedDB unavailable (private mode).
    try {
      return initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId);
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
}

export const db = createDb();
export const auth = getAuth(app);

let authPromise: Promise<void> | null = null;

export function ensureFirebaseAuth(): Promise<void> {
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch((err) => {
        // Current Firestore rules do not require auth; continue without it.
        console.warn('Anonymous auth unavailable, continuing without auth:', err?.code || err);
      });
  }
  return authPromise;
}
