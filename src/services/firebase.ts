import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: Must use firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

let isAuthInitialized = false;

export async function ensureFirebaseAuth(): Promise<void> {
  if (isAuthInitialized) return;
  try {
    await signInAnonymously(auth);
    isAuthInitialized = true;
  } catch (err) {
    console.warn('Anonymous auth note (proceeding with public rules):', err);
  }
}

// Validate Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'systemSettings', 'connection_test'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firebase client appears offline, falling back to local store.');
    }
    return false;
  }
}
