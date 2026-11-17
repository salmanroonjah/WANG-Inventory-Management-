import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence,
  Firestore
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
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

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/** Popup errors where a full-page redirect is the right fallback (mostly phones / in-app browsers). */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-environment',
  'auth/web-storage-unsupported',
  'auth/cancelled-popup-request'
]);

function friendlyAuthError(err: any): Error {
  const code = String(err?.code || '');
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing. Please try again.',
    'auth/unauthorized-domain':
      'This website address is not allowed to use Google sign-in yet. An admin must add it under Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed':
      'Google sign-in is not switched on yet. An admin must enable it in Firebase Console → Authentication → Sign-in method → Google.',
    'auth/configuration-not-found':
      'Google sign-in is not switched on yet. An admin must enable it in Firebase Console → Authentication → Sign-in method → Google.',
    'auth/network-request-failed': 'No internet connection. Please check your connection and try again.',
    'auth/user-disabled': 'This Google account has been disabled for this app.'
  };
  return new Error(messages[code] || err?.message || 'Google sign-in failed. Please try again.');
}

/** Google sign-in: a popup first, and a full-page redirect when the popup can't open. */
export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (REDIRECT_FALLBACK_CODES.has(String(err?.code || ''))) {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectErr) {
        throw friendlyAuthError(redirectErr);
      }
    }
    throw friendlyAuthError(err);
  }
}

/** Finishes a redirect sign-in (if one is in progress). Returns an error message or null. */
export async function completeRedirectSignIn(): Promise<string | null> {
  try {
    await getRedirectResult(auth);
    return null;
  } catch (err) {
    return friendlyAuthError(err).message;
  }
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

/**
 * Signs out and wipes this device's offline copy of the database, so the next
 * person using a shared computer cannot see cached records.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await fbSignOut(auth);
  } finally {
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
    } catch (e) {
      console.warn('Could not clear the offline cache:', e);
    }
  }
}

export type { User };
