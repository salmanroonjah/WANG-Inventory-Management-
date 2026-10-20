import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch 
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from './firebase.js';
import { 
  Asset, 
  Employee, 
  Category, 
  LocationRecord, 
  ConsumableItem, 
  AssetTransaction, 
  AssetRequest, 
  MaintenanceRecord, 
  ActivityLog, 
  UserSession 
} from '../types/inventory.js';

let isSeeded = false;

export async function initFirestoreIfEmpty(fallbackSeed: any): Promise<boolean> {
  if (isSeeded) return true;
  try {
    await ensureFirebaseAuth();
    const testDoc = await getDoc(doc(db, 'systemSettings', 'wang_init_status'));
    if (testDoc.exists()) {
      isSeeded = true;
      return true;
    }

    // Seed initial records into Firestore in batches
    console.log('[Firestore] Initializing WANG central database with default records...');
    const batch = writeBatch(db);

    // Seed Categories
    for (const cat of fallbackSeed.categories || []) {
      batch.set(doc(db, 'categories', cat.categoryId), cat);
    }

    // Seed Locations
    for (const loc of fallbackSeed.locations || []) {
      batch.set(doc(db, 'locations', loc.locationId), loc);
    }

    // Seed Employees
    for (const emp of fallbackSeed.employees || []) {
      batch.set(doc(db, 'employees', emp.employeeId), emp);
    }

    // Seed Assets
    for (const asset of fallbackSeed.assets || []) {
      batch.set(doc(db, 'assets', asset.assetId), asset);
    }

    // Seed Consumables
    for (const con of fallbackSeed.consumables || []) {
      batch.set(doc(db, 'consumables', con.itemCode), con);
    }

    // Seed User & Init flag
    batch.set(doc(db, 'systemSettings', 'activeUser'), fallbackSeed.user);
    batch.set(doc(db, 'systemSettings', 'wang_init_status'), {
      initialized: true,
      timestamp: new Date().toISOString(),
      organization: 'Welfare Association for New Generation (WANG)'
    });

    await batch.commit();
    isSeeded = true;
    console.log('[Firestore] Initialization complete! Central cloud database active.');
    return true;
  } catch (err) {
    console.warn('[Firestore] Init note:', err);
    return false;
  }
}

// --- ASSETS ---
export async function fetchAllAssetsFromFirestore(): Promise<Asset[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'assets'));
    if (snap.empty) return null;
    return snap.docs.map(d => d.data() as Asset);
  } catch (err) {
    console.warn('[Firestore] Failed to fetch assets, falling back to local cache', err);
    return null;
  }
}

export async function saveAssetToFirestore(asset: Asset): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'assets', asset.assetId), asset);
  } catch (err) {
    console.warn('[Firestore] Failed to save asset to cloud', err);
  }
}

export async function deleteAssetFromFirestore(assetId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'assets', assetId));
  } catch (err) {
    console.warn('[Firestore] Failed to delete asset from cloud', err);
  }
}

// --- EMPLOYEES ---
export async function fetchAllEmployeesFromFirestore(): Promise<Employee[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'employees'));
    if (snap.empty) return null;
    return snap.docs.map(d => d.data() as Employee);
  } catch (err) {
    console.warn('[Firestore] Failed to fetch employees', err);
    return null;
  }
}

export async function saveEmployeeToFirestore(emp: Employee): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'employees', emp.employeeId), emp);
  } catch (err) {
    console.warn('[Firestore] Failed to save employee to cloud', err);
  }
}

export async function deleteEmployeeFromFirestore(empId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'employees', empId));
  } catch (err) {
    console.warn('[Firestore] Failed to delete employee from cloud', err);
  }
}

// --- TRANSACTIONS ---
export async function fetchTransactionsFromFirestore(): Promise<AssetTransaction[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'transactions'));
    const list = snap.docs.map(d => d.data() as AssetTransaction);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    return null;
  }
}

export async function saveTransactionToFirestore(tx: AssetTransaction): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'transactions', tx.transactionId), tx);
  } catch (err) {
    console.warn('[Firestore] Failed to save transaction', err);
  }
}

// --- CONSUMABLES ---
export async function fetchConsumablesFromFirestore(): Promise<ConsumableItem[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'consumables'));
    if (snap.empty) return null;
    return snap.docs.map(d => d.data() as ConsumableItem);
  } catch (err) {
    return null;
  }
}

export async function saveConsumableToFirestore(item: ConsumableItem): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'consumables', item.itemCode), item);
  } catch (err) {}
}

// --- CATEGORIES & LOCATIONS ---
export async function fetchCategoriesFromFirestore(): Promise<Category[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'categories'));
    if (snap.empty) return null;
    return snap.docs.map(d => d.data() as Category);
  } catch (err) {
    return null;
  }
}

export async function fetchLocationsFromFirestore(): Promise<LocationRecord[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'locations'));
    if (snap.empty) return null;
    return snap.docs.map(d => d.data() as LocationRecord);
  } catch (err) {
    return null;
  }
}

// --- REQUESTS ---
export async function fetchRequestsFromFirestore(): Promise<AssetRequest[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'requests'));
    const list = snap.docs.map(d => d.data() as AssetRequest);
    return list.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  } catch (err) {
    return null;
  }
}

export async function saveRequestToFirestore(req: AssetRequest): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'requests', req.requestId), req);
  } catch (err) {}
}

// --- MAINTENANCE ---
export async function fetchMaintenanceFromFirestore(): Promise<MaintenanceRecord[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'maintenance'));
    return snap.docs.map(d => d.data() as MaintenanceRecord);
  } catch (err) {
    return null;
  }
}

export async function saveMaintenanceToFirestore(m: MaintenanceRecord): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'maintenance', m.maintenanceId), m);
  } catch (err) {}
}

// --- ACTIVITY LOGS ---
export async function fetchActivityLogsFromFirestore(): Promise<ActivityLog[] | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'activityLogs'));
    const list = snap.docs.map(d => d.data() as ActivityLog);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    return null;
  }
}

export async function saveActivityLogToFirestore(log: ActivityLog): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'activityLogs', log.logId), log);
  } catch (err) {}
}

// --- USER PROFILE & SESSION ---
export async function fetchUserFromFirestore(): Promise<UserSession | null> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDoc(doc(db, 'systemSettings', 'activeUser'));
    if (snap.exists()) {
      return snap.data() as UserSession;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function saveUserToFirestore(user: UserSession): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'systemSettings', 'activeUser'), user);
  } catch (err) {}
}
