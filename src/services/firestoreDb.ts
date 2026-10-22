import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  onSnapshot
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

    // Seed Assets (excluding any blacklisted deleted asset)
    let deletedSet = new Set<string>();
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('WANG_DELETED_ASSET_IDS') : null;
      if (raw) deletedSet = new Set(JSON.parse(raw));
    } catch {}

    for (const asset of fallbackSeed.assets || []) {
      if (!deletedSet.has(asset.assetId?.toUpperCase())) {
        batch.set(doc(db, 'assets', asset.assetId), asset);
      }
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

export async function saveCategoryToFirestore(cat: Category): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'categories', cat.categoryId), cat);
  } catch (err) {
    console.warn('[Firestore] Failed to save category', err);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    console.warn('[Firestore] Failed to delete category', err);
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

export async function saveLocationToFirestore(loc: LocationRecord): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'locations', loc.locationId), loc);
  } catch (err) {
    console.warn('[Firestore] Failed to save location', err);
  }
}

export async function deleteLocationFromFirestore(locationId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'locations', locationId));
  } catch (err) {
    console.warn('[Firestore] Failed to delete location', err);
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

// --- SUPER ADMIN AUDIT TRAIL RESET ---
export async function clearActivityLogsFromFirestore(user: UserSession): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDocs(collection(db, 'activityLogs'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    // Record official reset log
    const resetLogId = `LOG-${Date.now()}`;
    const resetLogDoc = doc(db, 'activityLogs', resetLogId);
    batch.set(resetLogDoc, {
      logId: resetLogId,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userName: user.name,
      userRole: user.role,
      action: 'AUDIT_TRAIL_CLEARED',
      recordType: 'System',
      recordId: 'AUDIT-HISTORY',
      details: `Audit trail history was cleared by Super Admin (${user.name}).`
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Error clearing activity logs:', err);
    throw err;
  }
}

// --- REAL-TIME MULTI-DEVICE CLOUD SYNC SUBSCRIPTION ---
export interface RealtimeSyncPayload {
  assets?: Asset[];
  employees?: Employee[];
  categories?: Category[];
  locations?: LocationRecord[];
  consumables?: ConsumableItem[];
  transactions?: AssetTransaction[];
  requests?: AssetRequest[];
  maintenance?: MaintenanceRecord[];
  activityLogs?: ActivityLog[];
}

export function subscribeToWANGDatabase(onUpdate: (payload: RealtimeSyncPayload) => void): () => void {
  const unsubscribers: (() => void)[] = [];

  ensureFirebaseAuth().then(() => {
    try {
      // 1. Assets Realtime Listener
      const unsubAssets = onSnapshot(collection(db, 'assets'), (snap) => {
        if (!snap.empty) {
          const assets = snap.docs.map(d => d.data() as Asset);
          onUpdate({ assets });
        }
      }, (err) => console.warn('[Firestore] Assets sync listener notice:', err));
      unsubscribers.push(unsubAssets);

      // 2. Employees Realtime Listener
      const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
        if (!snap.empty) {
          const employees = snap.docs.map(d => d.data() as Employee);
          onUpdate({ employees });
        }
      }, (err) => console.warn('[Firestore] Employees sync listener notice:', err));
      unsubscribers.push(unsubEmployees);

      // 3. Categories Realtime Listener
      const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
        if (!snap.empty) {
          const categories = snap.docs.map(d => d.data() as Category);
          onUpdate({ categories });
        }
      }, (err) => console.warn('[Firestore] Categories sync listener notice:', err));
      unsubscribers.push(unsubCategories);

      // 4. Locations Realtime Listener
      const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
        if (!snap.empty) {
          const locations = snap.docs.map(d => d.data() as LocationRecord);
          onUpdate({ locations });
        }
      }, (err) => console.warn('[Firestore] Locations sync listener notice:', err));
      unsubscribers.push(unsubLocations);

      // 5. Consumables Realtime Listener
      const unsubConsumables = onSnapshot(collection(db, 'consumables'), (snap) => {
        if (!snap.empty) {
          const consumables = snap.docs.map(d => d.data() as ConsumableItem);
          onUpdate({ consumables });
        }
      }, (err) => console.warn('[Firestore] Consumables sync listener notice:', err));
      unsubscribers.push(unsubConsumables);

      // 6. Transactions Realtime Listener
      const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
        if (!snap.empty) {
          const transactions = snap.docs
            .map(d => d.data() as AssetTransaction)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          onUpdate({ transactions });
        }
      }, (err) => console.warn('[Firestore] Transactions sync listener notice:', err));
      unsubscribers.push(unsubTransactions);

      // 7. Requests Realtime Listener
      const unsubRequests = onSnapshot(collection(db, 'requests'), (snap) => {
        if (!snap.empty) {
          const requests = snap.docs
            .map(d => d.data() as AssetRequest)
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
          onUpdate({ requests });
        }
      }, (err) => console.warn('[Firestore] Requests sync listener notice:', err));
      unsubscribers.push(unsubRequests);

      // 8. Maintenance Realtime Listener
      const unsubMaintenance = onSnapshot(collection(db, 'maintenance'), (snap) => {
        if (!snap.empty) {
          const maintenance = snap.docs.map(d => d.data() as MaintenanceRecord);
          onUpdate({ maintenance });
        }
      }, (err) => console.warn('[Firestore] Maintenance sync listener notice:', err));
      unsubscribers.push(unsubMaintenance);

      // 9. Activity Logs Realtime Listener
      const unsubLogs = onSnapshot(collection(db, 'activityLogs'), (snap) => {
        if (!snap.empty) {
          const activityLogs = snap.docs
            .map(d => d.data() as ActivityLog)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          onUpdate({ activityLogs });
        }
      }, (err) => console.warn('[Firestore] Activity logs sync listener notice:', err));
      unsubscribers.push(unsubLogs);

    } catch (err) {
      console.warn('[Firestore] Error initializing realtime listeners:', err);
    }
  });

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

