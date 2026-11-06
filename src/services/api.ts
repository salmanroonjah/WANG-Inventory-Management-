/**
 * WANG Inventory data layer.
 *
 * Single source of truth: Cloud Firestore.
 *  - Every collection is mirrored into an in-memory cache by realtime listeners,
 *    so all devices see the same data and reads are instant.
 *  - Every change that touches more than one record (issue, return, stock
 *    adjustment, maintenance, ...) runs in a Firestore transaction or batch, so
 *    an asset, its transaction-history row and its activity-log row are always
 *    written together or not at all, and stale/double actions are rejected.
 *  - Counters (assets per category / location, assets per employee) are derived
 *    from the asset list instead of being stored, so they can never drift.
 *
 * The signed-in user is kept per device (localStorage) until real login is added.
 */
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  writeBatch,
  setDoc,
  WriteBatch,
  Transaction
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from './firebase.js';
import {
  Asset,
  AssetCondition,
  AssetStatus,
  AssetTransaction,
  Category,
  ConsumableItem,
  DashboardStats,
  Employee,
  GoogleSheetsSyncConfig,
  LocationRecord,
  MaintenanceRecord,
  PhysicalAudit,
  PhysicalAuditItem,
  ActivityLog,
  AssetRequest,
  UserSession,
  UserRole,
  TransactionType
} from '../types/inventory.js';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const nowIso = () => new Date().toISOString();
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();
const same = (a: unknown, b: unknown) => norm(a) === norm(b);
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
let idCounter = 0;
const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}${String(++idCounter % 1000).padStart(3, '0')}${Math.floor(Math.random() * 10)}`;

/** "Building - Room": the format used everywhere for an asset's buildingRoom. */
export function locationLabel(loc: Pick<LocationRecord, 'building' | 'room'>): string {
  const b = str(loc.building).trim();
  const r = str(loc.room).trim();
  return b ? `${b} - ${r}` : r;
}

/** Default place for returned items: the first room marked as a store. */
export function defaultStoreLocation(locations: LocationRecord[], fallback = ''): string {
  const store = locations.find((l) => l.isStore) || locations[0];
  return store ? locationLabel(store) : fallback;
}

/** True when the asset sits in this registered room. */
export function assetInLocation(asset: Asset, loc: LocationRecord): boolean {
  const br = norm(asset.buildingRoom);
  if (!br) return false;
  if (br === norm(locationLabel(loc))) return true;
  // Legacy records stored only the room name; accept that when the branch matches.
  return br === norm(loc.room) && (!asset.officeBranch || same(asset.officeBranch, loc.officeBranch));
}

export const MANAGER_ROLES: UserRole[] = ['Super Admin', 'Inventory & Finance Admin', 'IT Administrator', 'Inventory Manager'];
export const APPROVER_ROLES: UserRole[] = ['Super Admin', 'Inventory & Finance Admin', 'Inventory Manager', 'Approver'];

function friendlyError(err: any, fallback: string): Error {
  if (err instanceof Error && !(err as any).code) return err;
  const code = err?.code || '';
  if (code === 'unavailable' || code === 'failed-precondition' && /offline/i.test(err?.message || '')) {
    return new Error('No internet connection. This action needs to reach the server - please try again when online.');
  }
  if (code === 'permission-denied') return new Error('The database refused this change (permission denied).');
  return new Error(err?.message || fallback);
}

// ---------------------------------------------------------------------------
// Session (per device)
// ---------------------------------------------------------------------------

const SESSION_KEY = 'WANG_SESSION_USER';
const FALLBACK_USER: UserSession = {
  userId: 'USR-LOCAL',
  name: 'Administrator',
  email: '',
  role: 'Super Admin'
};

function readSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.role) return u;
    }
  } catch {}
  return null;
}

function writeSession(u: UserSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  } catch {}
}

// Data from older versions of the app lived in localStorage and could show
// demo records instead of the real database. Remove it once.
try {
  localStorage.removeItem('WANG_INVENTORY_LOCAL_DB');
  localStorage.removeItem('WANG_DELETED_ASSET_IDS');
} catch {}

function sessionFromEmployee(e: Employee, role?: UserRole): UserSession {
  return {
    userId: `USR-${e.employeeId}`,
    name: e.fullName,
    email: e.email,
    role: role || e.role || 'Employee',
    employeeId: e.employeeId,
    officeBranch: e.officeBranch
  };
}

function currentUser(): UserSession {
  const s = readSession();
  if (s) return s;
  const admin = cache.employees.find((e) => e.role === 'Super Admin' && e.activeStatus !== false);
  return admin ? sessionFromEmployee(admin) : FALLBACK_USER;
}

function requireRole(roles: UserRole[], action: string) {
  const u = currentUser();
  if (!roles.includes(u.role)) {
    throw new Error(`Your role (${u.role}) is not allowed to ${action}.`);
  }
  return u;
}

// ---------------------------------------------------------------------------
// Realtime cache
// ---------------------------------------------------------------------------

const COLLECTIONS = [
  'assets',
  'employees',
  'categories',
  'locations',
  'consumables',
  'transactions',
  'requests',
  'maintenance',
  'audits',
  'activityLogs'
] as const;
type CollectionName = (typeof COLLECTIONS)[number];

interface Cache {
  assets: Asset[];
  employees: Employee[];
  categories: Category[];
  locations: LocationRecord[];
  consumables: ConsumableItem[];
  transactions: AssetTransaction[];
  requests: AssetRequest[];
  maintenance: MaintenanceRecord[];
  audits: PhysicalAudit[];
  activityLogs: ActivityLog[];
}

const cache: Cache = {
  assets: [],
  employees: [],
  categories: [],
  locations: [],
  consumables: [],
  transactions: [],
  requests: [],
  maintenance: [],
  audits: [],
  activityLogs: []
};

export interface RealtimeSyncPayload {
  assets?: Asset[];
  employees?: Employee[];
  categories?: Category[];
  locations?: LocationRecord[];
  consumables?: ConsumableItem[];
  transactions?: AssetTransaction[];
  requests?: AssetRequest[];
  maintenance?: MaintenanceRecord[];
  audits?: PhysicalAudit[];
  activityLogs?: ActivityLog[];
}

const byDesc = <T,>(key: (x: T) => string) => (a: T, b: T) => (key(b) || '').localeCompare(key(a) || '');

const normalizers: { [K in CollectionName]: (d: any) => Cache[K][number] } = {
  assets: (d): Asset => ({
    ...d,
    assetId: str(d.assetId),
    categoryId: str(d.categoryId),
    categoryName: str(d.categoryName),
    itemName: str(d.itemName),
    brand: str(d.brand),
    model: str(d.model),
    serialNumber: str(d.serialNumber),
    quantity: num(d.quantity, 1),
    unit: str(d.unit) || 'Unit',
    purchaseDate: str(d.purchaseDate),
    purchaseCost: num(d.purchaseCost),
    supplier: str(d.supplier),
    officeBranch: str(d.officeBranch),
    buildingRoom: str(d.buildingRoom),
    assignedEmployeeId: str(d.assignedEmployeeId),
    assignedTo: str(d.assignedTo),
    condition: d.condition || 'Good',
    status: d.status || 'Available',
    warrantyExpiry: str(d.warrantyExpiry),
    invoiceDocLink: str(d.invoiceDocLink),
    remarks: str(d.remarks),
    recordCompletion: d.recordCompletion || 'Complete',
    createdAt: str(d.createdAt),
    lastUpdated: str(d.lastUpdated)
  }),
  employees: (d): Employee => ({
    ...d,
    employeeId: str(d.employeeId),
    fullName: str(d.fullName),
    department: str(d.department),
    designation: str(d.designation),
    email: str(d.email),
    phone: str(d.phone),
    officeBranch: str(d.officeBranch),
    activeStatus: d.activeStatus !== false,
    assignedAssetCount: 0,
    role: d.role || 'Employee'
  }),
  categories: (d): Category => ({
    ...d,
    categoryId: str(d.categoryId),
    categoryName: str(d.categoryName),
    description: str(d.description),
    totalAssets: 0
  }),
  locations: (d): LocationRecord => ({
    ...d,
    locationId: str(d.locationId),
    officeBranch: str(d.officeBranch),
    building: str(d.building),
    floor: str(d.floor),
    room: str(d.room),
    description: str(d.description),
    isStore: Boolean(d.isStore),
    assetCount: 0
  }),
  consumables: (d): ConsumableItem => ({
    ...d,
    itemCode: str(d.itemCode),
    itemName: str(d.itemName),
    category: str(d.category),
    unit: str(d.unit) || 'Unit',
    openingBalance: num(d.openingBalance),
    currentStock: num(d.currentStock),
    minimumThreshold: num(d.minimumThreshold),
    unitCost: num(d.unitCost),
    location: str(d.location),
    supplier: str(d.supplier),
    lastUpdated: str(d.lastUpdated)
  }),
  transactions: (d): AssetTransaction => ({ ...d, notes: str(d.notes), assetName: str(d.assetName), employeeName: str(d.employeeName) }),
  requests: (d): AssetRequest => ({ ...d, quantity: num(d.quantity, 1) }),
  maintenance: (d): MaintenanceRecord => ({ ...d, repairCost: num(d.repairCost) }),
  audits: (d): PhysicalAudit => ({ ...d, items: Array.isArray(d.items) ? d.items : [] }),
  activityLogs: (d): ActivityLog => ({ ...d, details: str(d.details), userName: str(d.userName), action: str(d.action) })
};

const sorters: Partial<{ [K in CollectionName]: (a: Cache[K][number], b: Cache[K][number]) => number }> = {
  assets: byDesc<Asset>((a) => a.createdAt),
  transactions: byDesc<AssetTransaction>((t) => t.timestamp),
  activityLogs: byDesc<ActivityLog>((l) => l.timestamp),
  requests: byDesc<AssetRequest>((r) => r.requestDate),
  maintenance: byDesc<MaintenanceRecord>((m) => m.reportedDate),
  audits: byDesc<PhysicalAudit>((a) => a.startDate),
  employees: (a: Employee, b: Employee) => a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }),
  categories: (a: Category, b: Category) => a.categoryName.localeCompare(b.categoryName),
  locations: (a: LocationRecord, b: LocationRecord) =>
    `${a.officeBranch}|${a.building}|${a.room}`.localeCompare(`${b.officeBranch}|${b.building}|${b.room}`, undefined, { numeric: true }),
  consumables: (a: ConsumableItem, b: ConsumableItem) => a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true })
};

// --- write → cache consistency -------------------------------------------
// After a write commits, wait until the realtime listeners have delivered the
// change, so the next read (duplicate checks, counts, reloads) sees it.
const snapCount: Record<string, number> = {};
let snapWaiters: Array<() => void> = [];

async function waitForSync(touched: Set<string>, before: Record<string, number>, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  const pending = () => [...touched].some((c) => (snapCount[c] || 0) <= (before[c] || 0));
  while (pending() && Date.now() < deadline) {
    await new Promise<void>((r) => {
      snapWaiters.push(r);
      setTimeout(r, Math.max(0, deadline - Date.now()));
    });
  }
}

/** Wraps a transaction/batch so every set/update/delete records its collection. */
function trackWrites<W extends object>(w: W, touched: Set<string>): W {
  return new Proxy(w, {
    get(target: any, prop) {
      const v = target[prop];
      if (prop === 'set' || prop === 'update' || prop === 'delete') {
        return (ref: any, ...args: any[]) => {
          if (ref?.parent?.id) touched.add(ref.parent.id);
          v.call(target, ref, ...args);
          return receiverFor(target);
        };
      }
      return typeof v === 'function' ? v.bind(target) : v;
    }
  });
  function receiverFor(t: any) {
    return t;
  }
}

async function runTx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  const before = { ...snapCount };
  const touched = new Set<string>();
  const res = await runTransaction(db, (t) => {
    touched.clear(); // transactions may retry
    return fn(trackWrites(t, touched));
  });
  await waitForSync(touched, before);
  return res;
}

function newBatch(): WriteBatch {
  const before = { ...snapCount };
  const touched = new Set<string>();
  const b = writeBatch(db);
  const tracked = trackWrites(b, touched);
  return new Proxy(tracked, {
    get(target: any, prop) {
      if (prop === 'commit') {
        return async () => {
          await b.commit();
          await waitForSync(touched, before);
        };
      }
      return target[prop];
    }
  });
}

let sheetsConfigCache: GoogleSheetsSyncConfig | null = null;
const loaded = new Set<CollectionName>();
let syncStarted = false;
let resolveReady: () => void = () => {};
const readyPromise = new Promise<void>((r) => (resolveReady = r));
const subscribers = new Set<(p: RealtimeSyncPayload) => void>();
let lastSyncError: string | null = null;

function derivedEmployees(): Employee[] {
  const counts = new Map<string, number>();
  for (const a of cache.assets) {
    if (a.status === 'Issued' && a.assignedEmployeeId) {
      counts.set(norm(a.assignedEmployeeId), (counts.get(norm(a.assignedEmployeeId)) || 0) + 1);
    }
  }
  return cache.employees.map((e) => ({ ...e, assignedAssetCount: counts.get(norm(e.employeeId)) || 0 }));
}

function derivedCategories(): Category[] {
  const counts = new Map<string, number>();
  for (const a of cache.assets) counts.set(norm(a.categoryId), (counts.get(norm(a.categoryId)) || 0) + 1);
  return cache.categories.map((c) => ({ ...c, totalAssets: counts.get(norm(c.categoryId)) || 0 }));
}

function derivedLocations(): LocationRecord[] {
  return cache.locations.map((l) => ({ ...l, assetCount: cache.assets.filter((a) => assetInLocation(a, l)).length }));
}

function payloadFor(name: CollectionName): RealtimeSyncPayload {
  switch (name) {
    case 'assets':
      return {
        assets: [...cache.assets],
        employees: derivedEmployees(),
        categories: derivedCategories(),
        locations: derivedLocations()
      };
    case 'employees':
      return { employees: derivedEmployees() };
    case 'categories':
      return { categories: derivedCategories() };
    case 'locations':
      return { locations: derivedLocations() };
    default:
      return { [name]: [...(cache[name] as any[])] } as RealtimeSyncPayload;
  }
}

function startSync() {
  if (syncStarted) return;
  syncStarted = true;
  // If the device is offline and has no local cache yet, don't block the UI forever.
  setTimeout(resolveReady, 8000);

  ensureFirebaseAuth().finally(() => {
    for (const name of COLLECTIONS) {
      onSnapshot(
        collection(db, name),
        (snap) => {
          const list = snap.docs.map((d) => normalizers[name]({ ...d.data() })) as any[];
          const sorter = sorters[name] as any;
          if (sorter) list.sort(sorter);
          (cache as any)[name] = list;
          snapCount[name] = (snapCount[name] || 0) + 1;
          const waiters = snapWaiters;
          snapWaiters = [];
          waiters.forEach((r) => r());
          loaded.add(name);
          lastSyncError = null;
          if (loaded.size === COLLECTIONS.length) resolveReady();
          const payload = payloadFor(name);
          subscribers.forEach((cb) => cb(payload));
        },
        (err) => {
          console.error(`[Firestore] ${name} listener failed:`, err);
          lastSyncError = err?.message || String(err);
          loaded.add(name);
          if (loaded.size === COLLECTIONS.length) resolveReady();
        }
      );
    }
    onSnapshot(
      doc(db, 'systemSettings', 'sheetsConfig'),
      (snap) => {
        sheetsConfigCache = snap.exists() ? (snap.data() as GoogleSheetsSyncConfig) : null;
      },
      () => {}
    );
  });
}

async function ready() {
  startSync();
  await readyPromise;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

type Writer = Transaction | WriteBatch;

function makeLog(action: string, recordType: ActivityLog['recordType'], recordId: string, details: string): ActivityLog {
  const u = currentUser();
  return {
    logId: uniqueId('LOG'),
    timestamp: nowIso(),
    userId: u.userId,
    userName: u.name,
    userRole: u.role,
    action,
    recordType,
    recordId,
    details
  };
}

function makeTx(
  asset: Pick<Asset, 'assetId' | 'itemName' | 'condition'>,
  type: TransactionType,
  previousStatus: AssetStatus,
  newStatus: AssetStatus,
  extra: Partial<AssetTransaction> = {}
): AssetTransaction {
  const u = currentUser();
  return {
    transactionId: uniqueId('TX'),
    assetId: asset.assetId,
    assetName: asset.itemName,
    employeeId: '',
    employeeName: '',
    transactionType: type,
    performedByUserId: u.userId,
    performedByName: u.name,
    timestamp: nowIso(),
    previousStatus,
    newStatus,
    condition: asset.condition,
    notes: '',
    ...extra
  };
}

function writeLog(w: Writer, log: ActivityLog) {
  (w as any).set(doc(db, 'activityLogs', log.logId), log);
}
function writeTx(w: Writer, tx: AssetTransaction) {
  (w as any).set(doc(db, 'transactions', tx.transactionId), tx);
}

/** Runs many writes in batches of <=450 (Firestore limit is 500 per batch). */
async function commitInChunks(ops: Array<(b: WriteBatch) => void>) {
  for (let i = 0; i < ops.length; i += 450) {
    const b = newBatch();
    ops.slice(i, i + 450).forEach((op) => op(b));
    await b.commit();
  }
}

async function readAssetInTx(t: Transaction, assetId: string): Promise<Asset> {
  const id = norm(assetId);
  if (!id) throw new Error('Asset ID is required.');
  // Document IDs are stored uppercase, but tolerate older mixed-case IDs.
  const cached = cache.assets.find((a) => same(a.assetId, id));
  const ref = doc(db, 'assets', cached ? cached.assetId : id);
  const snap = await t.get(ref);
  if (!snap.exists()) throw new Error(`Asset ${id} was not found in the register.`);
  return normalizers.assets(snap.data());
}

function findEmployee(id: string): Employee | undefined {
  return cache.employees.find((e) => same(e.employeeId, id));
}

const AUDIT_CONDITIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Minor Wear', 'Needs Repair', 'Damaged'];

function warrantyStatusFor(asset?: Asset): string {
  if (!asset?.warrantyExpiry) return 'Unknown';
  return asset.warrantyExpiry >= todayStr() ? 'Under Warranty' : 'Out of Warranty';
}

function computeStats(): DashboardStats {
  const assets = cache.assets;
  const count = (f: (a: Asset) => boolean) => assets.filter(f).length;
  const dist = (key: (a: Asset) => string) => {
    const m = new Map<string, number>();
    for (const a of assets) m.set(key(a) || 'Unspecified', (m.get(key(a) || 'Unspecified') || 0) + 1);
    return Array.from(m.entries());
  };
  const today = todayStr();
  return {
    totalAssets: assets.length,
    availableAssets: count((a) => a.status === 'Available'),
    issuedAssets: count((a) => a.status === 'Issued'),
    underMaintenanceAssets: count((a) => a.status === 'Under Maintenance'),
    missingLostAssets: count((a) => a.status === 'Missing' || a.status === 'Lost'),
    retiredAssets: count((a) => a.status === 'Retired' || a.status === 'Archived'),
    overdueAssetsCount: count((a) => a.status === 'Issued' && !!a.dueDate && a.dueDate < today),
    totalConsumableStock: cache.consumables.reduce((s, c) => s + c.currentStock, 0),
    lowStockItemsCount: cache.consumables.filter((c) => c.currentStock <= c.minimumThreshold).length,
    pendingRequestsCount: cache.requests.filter((r) => r.status === 'Pending').length,
    activeAuditsCount: cache.audits.filter((a) => a.status === 'In Progress').length,
    categoryDistribution: dist((a) => a.categoryName).map(([category, c]) => ({ category, count: c })),
    conditionDistribution: dist((a) => a.condition).map(([condition, c]) => ({ condition, count: c })),
    statusDistribution: dist((a) => a.status).map(([status, c]) => ({ status, count: c })),
    recentTransactions: cache.transactions.slice(0, 8)
  };
}

function nextSequential(prefix: string, ids: string[], pad = 3): string {
  const re = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\d+)$`, 'i');
  let max = 0;
  for (const id of ids) {
    const m = re.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

function normalizeCategoryId(id: string): string {
  const c = norm(id).replace(/\s+/g, '-');
  if (!c) return '';
  return c.startsWith('CAT-') ? c : `CAT-${c}`;
}

function csvCell(v: unknown) {
  return str(v);
}

// ---------------------------------------------------------------------------
// Public API (method names and shapes are used by the views)
// ---------------------------------------------------------------------------

export const api = {
  // ----- session -----
  getInitialUser(): UserSession {
    startSync();
    return readSession() || FALLBACK_USER;
  },

  getInitialStats(): DashboardStats {
    startSync();
    return computeStats();
  },

  getSyncError(): string | null {
    return lastSyncError;
  },

  async getCurrentUser(): Promise<UserSession> {
    await ready();
    const s = readSession();
    if (s) {
      // Keep the session in step with the employee record (name/role edits).
      const e = s.employeeId ? findEmployee(s.employeeId) : undefined;
      if (e) {
        const refreshed = { ...sessionFromEmployee(e), role: e.role || s.role };
        writeSession(refreshed);
        return refreshed;
      }
      return s;
    }
    const u = currentUser();
    writeSession(u);
    return u;
  },

  async switchRole(role: UserRole, employeeId?: string, _name?: string): Promise<UserSession> {
    await ready();
    const emp =
      (employeeId && findEmployee(employeeId)) ||
      cache.employees.find((e) => e.role === role && e.activeStatus) ||
      (role === 'Inventory Manager' ? cache.employees.find((e) => e.role === 'Inventory & Finance Admin') : undefined);
    const u: UserSession = emp ? sessionFromEmployee(emp, role) : { ...FALLBACK_USER, role };
    writeSession(u);
    return u;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    await ready();
    return computeStats();
  },

  // ----- assets -----
  async getAssets(filters?: { search?: string; category?: string; status?: string }): Promise<Asset[]> {
    await ready();
    let list = [...cache.assets];
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.assetId.toLowerCase().includes(q) ||
          a.itemName.toLowerCase().includes(q) ||
          a.brand.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q)
      );
    }
    if (filters?.category && filters.category !== 'all') list = list.filter((a) => same(a.categoryId, filters.category));
    if (filters?.status && filters.status !== 'all') list = list.filter((a) => a.status === filters.status);
    return list;
  },

  async getAssetById(id: string): Promise<{ asset: Asset; transactions: AssetTransaction[] }> {
    await ready();
    const asset = cache.assets.find((a) => same(a.assetId, id));
    if (!asset) throw new Error(`Asset ${norm(id)} is not registered.`);
    const transactions = cache.transactions.filter((t) => same(t.assetId, asset.assetId));
    return { asset: { ...asset }, transactions };
  },

  suggestAssetId(categoryId: string): string {
    const code = norm(categoryId).replace(/^CAT-/, '') || 'GEN';
    return nextSequential(`WANG-${code}-`, cache.assets.map((a) => a.assetId));
  },

  async createAsset(input: Partial<Asset>): Promise<{ asset: Asset; message: string }> {
    requireRole(MANAGER_ROLES, 'register assets');
    await ready();
    if (!str(input.itemName).trim()) throw new Error('Item name is required.');
    const category = cache.categories.find((c) => same(c.categoryId, input.categoryId));
    if (!category) throw new Error('Please select a valid category.');

    const assetId = norm(input.assetId) || api.suggestAssetId(category.categoryId);
    if (!/^[A-Z0-9][A-Z0-9\-_/.]{0,60}$/.test(assetId)) {
      throw new Error('Asset ID may only contain letters, numbers and - _ / .');
    }

    let status: AssetStatus = (input.status as AssetStatus) || 'Available';
    let employee: Employee | undefined;
    if (status === 'Issued') {
      employee = input.assignedEmployeeId ? findEmployee(input.assignedEmployeeId) : undefined;
      if (!employee) throw new Error('To register an asset as Issued, select the employee who holds it.');
    }
    if (status === 'Missing' || status === 'Lost') {
      throw new Error('A new asset cannot be registered as Missing or Lost.');
    }

    const ts = nowIso();
    const asset: Asset = normalizers.assets({
      ...input,
      assetId,
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      itemName: str(input.itemName).trim(),
      quantity: Math.max(1, num(input.quantity, 1)),
      purchaseCost: Math.max(0, num(input.purchaseCost)),
      status,
      assignedEmployeeId: employee ? employee.employeeId : '',
      assignedTo: employee ? employee.fullName : '',
      dueDate: employee ? str(input.dueDate) : '',
      createdAt: ts,
      lastUpdated: ts
    });

    try {
      await runTx(async (t) => {
        const ref = doc(db, 'assets', assetId);
        if ((await t.get(ref)).exists()) throw new Error(`Asset ID ${assetId} already exists. Use a different ID.`);
        t.set(ref, asset);
        writeTx(
          t,
          makeTx(asset, employee ? 'ISSUE' : 'INITIAL_IMPORT', 'Available', status, {
            employeeId: asset.assignedEmployeeId,
            employeeName: asset.assignedTo,
            location: asset.buildingRoom,
            notes: employee ? `Registered and issued to ${employee.fullName}` : 'Asset registered'
          })
        );
        writeLog(t, makeLog('REGISTER_ASSET', 'Asset', assetId, `New asset ${assetId} (${asset.itemName}) registered in "${asset.categoryName}".`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to register asset.');
    }
    return { asset, message: `Asset ${assetId} registered successfully` };
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<{ asset: Asset; message: string }> {
    requireRole(MANAGER_ROLES, 'edit assets');
    await ready();
    let saved!: Asset;
    try {
      await runTx(async (t) => {
        const current = await readAssetInTx(t, id);
        const next: Asset = { ...current };

        // Plain descriptive fields
        const editable: (keyof Asset)[] = [
          'itemName', 'brand', 'model', 'serialNumber', 'unit', 'purchaseDate', 'supplier',
          'officeBranch', 'buildingRoom', 'condition', 'warrantyExpiry', 'invoiceDocLink',
          'remarks', 'recordCompletion', 'isConsumable'
        ];
        for (const k of editable) if (updates[k] !== undefined) (next as any)[k] = updates[k];
        if (updates.quantity !== undefined) next.quantity = Math.max(1, num(updates.quantity, 1));
        if (updates.purchaseCost !== undefined) next.purchaseCost = Math.max(0, num(updates.purchaseCost));
        if (updates.dueDate !== undefined && current.status === 'Issued') next.dueDate = updates.dueDate;
        if (!str(next.itemName).trim()) throw new Error('Item name is required.');

        if (updates.categoryId && !same(updates.categoryId, current.categoryId)) {
          const cat = cache.categories.find((c) => same(c.categoryId, updates.categoryId));
          if (!cat) throw new Error('Selected category does not exist.');
          next.categoryId = cat.categoryId;
          next.categoryName = cat.categoryName;
        }

        // Status changes through the edit form are limited; custody changes must
        // go through Issue / Return / Missing workflows so history stays correct.
        if (updates.status && updates.status !== current.status) {
          const locked: AssetStatus[] = ['Issued', 'Missing', 'Lost'];
          if (locked.includes(current.status)) {
            throw new Error(`This asset is ${current.status}. Use the ${current.status === 'Issued' ? 'Return' : 'Resolve'} action to change its status.`);
          }
          if (locked.includes(updates.status)) {
            throw new Error(`Use the ${updates.status === 'Issued' ? 'Issue' : 'Report Missing'} action to set status "${updates.status}".`);
          }
          next.status = updates.status;
        }

        next.lastUpdated = nowIso();
        t.set(doc(db, 'assets', current.assetId), next);

        if (next.status !== current.status || next.condition !== current.condition) {
          writeTx(
            t,
            makeTx(next, next.status === 'Retired' ? 'RETIRED' : 'CONDITION_CHANGE', current.status, next.status, {
              notes: `Edited: status ${current.status} → ${next.status}, condition ${current.condition} → ${next.condition}`
            })
          );
        }
        if (next.buildingRoom !== current.buildingRoom || next.officeBranch !== current.officeBranch) {
          writeTx(
            t,
            makeTx(next, 'TRANSFER', current.status, next.status, {
              employeeId: next.assignedEmployeeId,
              employeeName: next.assignedTo,
              location: next.buildingRoom,
              notes: `Location changed from ${current.buildingRoom || '—'} to ${next.buildingRoom || '—'}`
            })
          );
        }
        writeLog(t, makeLog('UPDATE_ASSET', 'Asset', current.assetId, `Asset ${current.assetId} (${next.itemName}) details updated.`));
        saved = next;
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to update asset.');
    }
    return { asset: saved, message: 'Asset updated successfully' };
  },

  async deleteAsset(id: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'delete assets');
    await ready();
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, id);
        if (a.status === 'Issued') throw new Error(`${a.assetId} is issued to ${a.assignedTo}. Return it before deleting.`);
        t.delete(doc(db, 'assets', a.assetId));
        writeLog(t, makeLog('DELETE_ASSET', 'Asset', a.assetId, `Deleted asset ${a.itemName} (${a.assetId}).`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to delete asset.');
    }
    return { success: true, message: `Asset ${norm(id)} deleted` };
  },

  async deleteMultipleAssets(ids: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> {
    requireRole(MANAGER_ROLES, 'delete assets');
    await ready();
    const targets = cache.assets.filter((a) => ids.some((id) => same(id, a.assetId)));
    const deletable = targets.filter((a) => a.status !== 'Issued');
    const skipped = targets.length - deletable.length;
    if (deletable.length === 0) {
      throw new Error(skipped ? 'All selected assets are currently issued. Return them before deleting.' : 'No matching assets found.');
    }
    const ops: Array<(b: WriteBatch) => void> = deletable.map((a) => (b) => b.delete(doc(db, 'assets', a.assetId)));
    const log = makeLog(
      'BATCH_DELETE_ASSETS',
      'Asset',
      deletable.map((a) => a.assetId).slice(0, 20).join(','),
      `Deleted ${deletable.length} assets (${deletable.map((a) => a.assetId).slice(0, 5).join(', ')}${deletable.length > 5 ? '…' : ''}).`
    );
    ops.push((b) => writeLog(b, log));
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to delete assets.');
    }
    return {
      success: true,
      deletedCount: deletable.length,
      message: `Deleted ${deletable.length} asset(s)${skipped ? `; ${skipped} issued asset(s) skipped - return them first` : ''}.`
    };
  },

  // ----- custody workflows -----
  async issueAsset(payload: {
    assetId: string;
    employeeId: string;
    condition?: AssetCondition;
    dueDate?: string;
    notes?: string;
    location?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    requireRole(MANAGER_ROLES, 'issue assets');
    await ready();
    const emp = findEmployee(payload.employeeId);
    if (!emp) throw new Error('Please select a valid employee.');
    if (!emp.activeStatus) throw new Error(`${emp.fullName} is marked inactive and cannot receive assets.`);
    if (payload.dueDate && payload.dueDate < todayStr()) throw new Error('Due date cannot be in the past.');

    let result!: { asset: Asset; transaction: AssetTransaction };
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, payload.assetId);
        if (a.status !== 'Available') {
          throw new Error(
            a.status === 'Issued'
              ? `${a.assetId} is already issued to ${a.assignedTo}. Return it first.`
              : `${a.assetId} is "${a.status}" and cannot be issued. Only Available assets can be issued.`
          );
        }
        const next: Asset = {
          ...a,
          status: 'Issued',
          assignedEmployeeId: emp.employeeId,
          assignedTo: emp.fullName,
          condition: payload.condition || a.condition,
          dueDate: payload.dueDate || '',
          buildingRoom: payload.location || a.buildingRoom,
          lastUpdated: nowIso()
        };
        const tx = makeTx(next, 'ISSUE', a.status, 'Issued', {
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          dueDate: payload.dueDate || undefined,
          location: next.buildingRoom,
          notes: payload.notes?.trim() || `Issued to ${emp.fullName}`
        });
        t.set(doc(db, 'assets', a.assetId), next);
        writeTx(t, tx);
        writeLog(t, makeLog('ISSUE_ASSET', 'Asset', a.assetId, `${a.assetId} (${a.itemName}) issued to ${emp.fullName} (${emp.employeeId}).`));
        result = { asset: next, transaction: tx };
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to issue asset.');
    }
    return { success: true, message: `Issued to ${emp.fullName}`, ...result };
  },

  async returnAsset(payload: {
    assetId: string;
    returnCondition: AssetCondition;
    notes?: string;
    targetLocation?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    requireRole(MANAGER_ROLES, 'receive returned assets');
    await ready();
    let result!: { asset: Asset; transaction: AssetTransaction };
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, payload.assetId);
        if (a.status !== 'Issued') throw new Error(`${a.assetId} is "${a.status}", not Issued, so it cannot be returned.`);
        const needsRepair = payload.returnCondition === 'Needs Repair' || payload.returnCondition === 'Damaged';
        const newStatus: AssetStatus = needsRepair ? 'Under Maintenance' : 'Available';
        const next: Asset = {
          ...a,
          status: newStatus,
          condition: payload.returnCondition || a.condition,
          assignedEmployeeId: '',
          assignedTo: '',
          dueDate: '',
          buildingRoom: payload.targetLocation || a.buildingRoom,
          lastUpdated: nowIso()
        };
        const tx = makeTx(next, 'RETURN', 'Issued', newStatus, {
          employeeId: a.assignedEmployeeId,
          employeeName: a.assignedTo,
          location: next.buildingRoom,
          notes: payload.notes?.trim() || `Returned by ${a.assignedTo || 'staff'}`
        });
        t.set(doc(db, 'assets', a.assetId), next);
        writeTx(t, tx);
        if (needsRepair) {
          // Open a repair ticket so the asset can be tracked and released from Maintenance.
          const ticket: MaintenanceRecord = {
            maintenanceId: uniqueId('MNT'),
            assetId: a.assetId,
            assetName: a.itemName,
            issueDescription: payload.notes?.trim() || `Returned as "${next.condition}" by ${a.assignedTo || 'staff'}`,
            reportedDate: todayStr(),
            serviceProvider: '',
            repairCost: 0,
            workPerformed: '',
            status: 'Reported',
            warrantyStatus: warrantyStatusFor(a),
            reportedBy: currentUser().name
          };
          t.set(doc(db, 'maintenance', ticket.maintenanceId), ticket);
        }
        writeLog(
          t,
          makeLog('RETURN_ASSET', 'Asset', a.assetId, `${a.assetId} (${a.itemName}) returned by ${a.assignedTo || 'staff'}. Condition: ${next.condition}. Status: ${newStatus}${needsRepair ? ' (repair ticket opened)' : ''}.`)
        );
        result = { asset: next, transaction: tx };
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to return asset.');
    }
    return { success: true, message: `Asset returned. Status: ${result.asset.status}`, ...result };
  },

  async transferAsset(payload: {
    assetId: string;
    targetLocation: string;
    officeBranch?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; asset?: Asset; transaction?: AssetTransaction }> {
    requireRole(MANAGER_ROLES, 'transfer assets');
    await ready();
    if (!payload.targetLocation?.trim()) throw new Error('Select the destination location.');
    let result!: { asset: Asset; transaction: AssetTransaction };
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, payload.assetId);
        if (a.status === 'Retired' || a.status === 'Archived') throw new Error(`${a.assetId} is ${a.status} and cannot be transferred.`);
        const next: Asset = {
          ...a,
          buildingRoom: payload.targetLocation.trim(),
          officeBranch: payload.officeBranch || a.officeBranch,
          lastUpdated: nowIso()
        };
        const tx = makeTx(next, 'TRANSFER', a.status, a.status, {
          employeeId: a.assignedEmployeeId,
          employeeName: a.assignedTo,
          location: next.buildingRoom,
          notes: payload.notes?.trim() || `Moved from ${a.buildingRoom || '—'} to ${next.buildingRoom}`
        });
        t.set(doc(db, 'assets', a.assetId), next);
        writeTx(t, tx);
        writeLog(t, makeLog('TRANSFER_ASSET', 'Asset', a.assetId, `${a.assetId} moved to ${next.buildingRoom} (${next.officeBranch}).`));
        result = { asset: next, transaction: tx };
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to transfer asset.');
    }
    return { success: true, message: `Transferred to ${payload.targetLocation}`, ...result };
  },

  async reportMissingOrLost(payload: {
    assetId: string;
    status: 'Missing' | 'Lost';
    reason: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    requireRole(MANAGER_ROLES, 'report missing assets');
    await ready();
    if (!payload.reason?.trim()) throw new Error('Please describe what happened.');
    let result!: { asset: Asset; transaction: AssetTransaction };
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, payload.assetId);
        const allowed: AssetStatus[] = ['Available', 'Issued', 'Under Maintenance'];
        if (payload.status === 'Lost' && a.status === 'Missing') allowed.push('Missing');
        if (!allowed.includes(a.status)) throw new Error(`${a.assetId} is "${a.status}" and cannot be reported ${payload.status}.`);
        // The last custodian is kept on the record (accountability), but the
        // asset no longer counts as issued to them.
        const next: Asset = { ...a, status: payload.status, dueDate: '', lastUpdated: nowIso() };
        const tx = makeTx(next, payload.status === 'Missing' ? 'REPORT_MISSING' : 'REPORT_LOST', a.status, payload.status, {
          employeeId: a.assignedEmployeeId,
          employeeName: a.assignedTo,
          location: a.buildingRoom,
          notes: payload.reason.trim()
        });
        t.set(doc(db, 'assets', a.assetId), next);
        writeTx(t, tx);
        writeLog(
          t,
          makeLog(payload.status === 'Missing' ? 'REPORT_MISSING' : 'REPORT_LOST', 'Asset', a.assetId, `${a.assetId} (${a.itemName}) marked ${payload.status}. Reason: ${payload.reason.trim()}`)
        );
        result = { asset: next, transaction: tx };
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to report asset.');
    }
    return { success: true, message: `Asset marked as ${payload.status}`, ...result };
  },

  async resolveMissingStatus(payload: {
    assetId: string;
    newStatus: 'Available' | 'Under Maintenance';
    condition: AssetCondition;
    resolutionNotes: string;
    location?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    requireRole(MANAGER_ROLES, 'resolve missing assets');
    await ready();
    let result!: { asset: Asset; transaction: AssetTransaction };
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, payload.assetId);
        if (a.status !== 'Missing' && a.status !== 'Lost') throw new Error(`${a.assetId} is "${a.status}", not Missing/Lost.`);
        const next: Asset = {
          ...a,
          status: payload.newStatus || 'Available',
          condition: payload.condition || a.condition,
          assignedEmployeeId: '',
          assignedTo: '',
          dueDate: '',
          buildingRoom: payload.location || a.buildingRoom,
          lastUpdated: nowIso()
        };
        const tx = makeTx(next, 'RESOLVE_MISSING', a.status, next.status, {
          employeeId: a.assignedEmployeeId,
          employeeName: a.assignedTo,
          location: next.buildingRoom,
          notes: payload.resolutionNotes?.trim() || 'Recovered'
        });
        t.set(doc(db, 'assets', a.assetId), next);
        writeTx(t, tx);
        writeLog(t, makeLog('RESOLVE_STATUS', 'Asset', a.assetId, `${a.assetId} recovered from ${a.status} to ${next.status}. ${payload.resolutionNotes || ''}`.trim()));
        result = { asset: next, transaction: tx };
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to resolve status.');
    }
    return { success: true, message: `Status resolved to ${result.asset.status}`, ...result };
  },

  // ----- employees -----
  async getEmployees(): Promise<Employee[]> {
    await ready();
    return derivedEmployees();
  },

  async getEmployeeById(id: string): Promise<{ employee: Employee; assignedAssets: Asset[]; history: AssetTransaction[] }> {
    await ready();
    const employee = derivedEmployees().find((e) => same(e.employeeId, id));
    if (!employee) throw new Error('Employee not found');
    const assignedAssets = cache.assets.filter((a) => a.status === 'Issued' && same(a.assignedEmployeeId, id));
    const history = cache.transactions.filter((t) => same(t.employeeId, id));
    return { employee, assignedAssets, history };
  },

  suggestEmployeeId(): string {
    return nextSequential('EMP-', cache.employees.map((e) => e.employeeId));
  },

  async createEmployee(payload: Partial<Employee>): Promise<{ success: boolean; message: string; employee: Employee }> {
    requireRole(MANAGER_ROLES, 'add employees');
    await ready();
    const fullName = str(payload.fullName).trim();
    if (!fullName) throw new Error('Full name is required.');
    const email = str(payload.email).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email address is not valid.');
    if (email && cache.employees.some((e) => e.email && same(e.email, email))) throw new Error(`Email ${email} is already used by another employee.`);
    if (payload.role === 'Super Admin') requireRole(['Super Admin'], 'create Super Admin accounts');

    const employeeId = norm(payload.employeeId) || api.suggestEmployeeId();
    const employee: Employee = {
      employeeId,
      fullName,
      department: str(payload.department).trim(),
      designation: str(payload.designation).trim(),
      email,
      phone: str(payload.phone).trim(),
      officeBranch: str(payload.officeBranch).trim(),
      activeStatus: payload.activeStatus !== false,
      assignedAssetCount: 0,
      role: payload.role || 'Employee'
    };
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'employees', employeeId);
        if ((await t.get(ref)).exists()) throw new Error(`Employee ID ${employeeId} already exists.`);
        const { assignedAssetCount, ...rest } = employee;
        t.set(ref, rest);
        writeLog(t, makeLog('CREATE_EMPLOYEE', 'Employee', employeeId, `Employee ${fullName} (${employeeId}) registered.`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to add employee.');
    }
    return { success: true, message: `Employee ${fullName} registered`, employee };
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<{ success: boolean; message: string; employee: Employee }> {
    const me = currentUser();
    const editingSelf = !!me.employeeId && same(me.employeeId, id);
    if (!editingSelf) requireRole(MANAGER_ROLES, 'edit employees');
    await ready();
    const current = findEmployee(id);
    if (!current) throw new Error('Employee not found');
    const next: Employee = { ...current };
    for (const k of ['fullName', 'department', 'designation', 'email', 'phone', 'officeBranch'] as const) {
      if (updates[k] !== undefined) next[k] = str(updates[k]).trim();
    }
    if (!next.fullName) throw new Error('Full name is required.');
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) throw new Error('Email address is not valid.');
    if (next.email && cache.employees.some((e) => !same(e.employeeId, id) && e.email && same(e.email, next.email))) {
      throw new Error(`Email ${next.email} is already used by another employee.`);
    }

    const issued = cache.assets.filter((a) => a.status === 'Issued' && same(a.assignedEmployeeId, id));
    if (updates.activeStatus === false && current.activeStatus) {
      if (issued.length) throw new Error(`${current.fullName} still holds ${issued.length} asset(s). Return them before deactivating.`);
      next.activeStatus = false;
    } else if (updates.activeStatus === true) {
      next.activeStatus = true;
    }

    if (updates.role && updates.role !== current.role) {
      requireRole(['Super Admin'], 'change user roles');
      if (current.role === 'Super Admin' && cache.employees.filter((e) => e.role === 'Super Admin' && e.activeStatus).length <= 1) {
        throw new Error('This is the only Super Admin. Assign another Super Admin first.');
      }
      next.role = updates.role;
    }

    const ops: Array<(b: WriteBatch) => void> = [];
    const { assignedAssetCount, ...rest } = next;
    ops.push((b) => b.set(doc(db, 'employees', current.employeeId), rest));
    if (next.fullName !== current.fullName) {
      // Keep the holder name on assets in step with the employee record.
      cache.assets
        .filter((a) => same(a.assignedEmployeeId, id))
        .forEach((a) => ops.push((b) => b.update(doc(db, 'assets', a.assetId), { assignedTo: next.fullName })));
    }
    ops.push((b) => writeLog(b, makeLog('UPDATE_EMPLOYEE', 'Employee', current.employeeId, `Employee ${next.fullName} (${current.employeeId}) updated.`)));
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to update employee.');
    }
    if (editingSelf) writeSession({ ...sessionFromEmployee(next), role: next.role || me.role });
    return { success: true, message: `Employee ${next.fullName} updated`, employee: { ...next, assignedAssetCount: issued.length } };
  },

  async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'delete employees');
    await ready();
    const emp = findEmployee(id);
    if (!emp) throw new Error('Employee not found');
    const me = currentUser();
    if (me.employeeId && same(me.employeeId, id)) throw new Error('You cannot delete your own account.');
    if (emp.role === 'Super Admin' && cache.employees.filter((e) => e.role === 'Super Admin').length <= 1) {
      throw new Error('This is the only Super Admin and cannot be deleted.');
    }
    const issued = cache.assets.filter((a) => a.status === 'Issued' && same(a.assignedEmployeeId, id));
    if (issued.length) throw new Error(`Cannot delete: ${emp.fullName} holds ${issued.length} asset(s). Return them first.`);
    const b = newBatch();
    b.delete(doc(db, 'employees', emp.employeeId));
    writeLog(b, makeLog('DELETE_EMPLOYEE', 'Employee', emp.employeeId, `Employee ${emp.fullName} (${emp.employeeId}) removed.`));
    try {
      await b.commit();
    } catch (e) {
      throw friendlyError(e, 'Failed to delete employee.');
    }
    return { success: true, message: `Employee ${emp.fullName} removed` };
  },

  async updateUserProfile(updates: { name?: string; email?: string; phone?: string; officeBranch?: string; designation?: string }): Promise<UserSession> {
    await ready();
    const me = currentUser();
    if (me.employeeId && findEmployee(me.employeeId)) {
      await api.updateEmployee(me.employeeId, {
        fullName: updates.name,
        email: updates.email,
        phone: updates.phone,
        officeBranch: updates.officeBranch,
        designation: updates.designation
      });
      return currentUser();
    }
    const u: UserSession = {
      ...me,
      name: updates.name?.trim() || me.name,
      email: updates.email?.trim() ?? me.email,
      officeBranch: updates.officeBranch?.trim() ?? me.officeBranch
    };
    writeSession(u);
    return u;
  },

  // ----- categories -----
  async getCategories(): Promise<Category[]> {
    await ready();
    return derivedCategories();
  },

  async createCategory(payload: Partial<Category>): Promise<{ success: boolean; message: string; category: Category }> {
    requireRole(MANAGER_ROLES, 'create categories');
    await ready();
    const name = str(payload.categoryName).trim();
    if (!name) throw new Error('Category name is required.');
    if (cache.categories.some((c) => same(c.categoryName, name))) throw new Error(`A category named "${name}" already exists.`);
    let id = normalizeCategoryId(str(payload.categoryId));
    if (!id) {
      const base = `CAT-${name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN'}`;
      id = base;
      let n = 2;
      while (cache.categories.some((c) => same(c.categoryId, id))) id = `${base}${n++}`;
    }
    const category: Category = {
      categoryId: id,
      categoryName: name,
      description: str(payload.description).trim(),
      totalAssets: 0,
      iconName: payload.iconName || 'FolderTree'
    };
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'categories', id);
        if ((await t.get(ref)).exists()) throw new Error(`Category code ${id} already exists.`);
        const { totalAssets, ...rest } = category;
        t.set(ref, rest);
        writeLog(t, makeLog('CREATE_CATEGORY', 'Category', id, `Category "${name}" (${id}) created.`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to create category.');
    }
    return { success: true, message: `Category ${name} created`, category };
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<{ success: boolean; message: string; category: Category }> {
    requireRole(MANAGER_ROLES, 'edit categories');
    await ready();
    const current = cache.categories.find((c) => same(c.categoryId, id));
    if (!current) throw new Error('Category not found');
    const newId = updates.categoryId ? normalizeCategoryId(updates.categoryId) : current.categoryId;
    const name = updates.categoryName !== undefined ? updates.categoryName.trim() : current.categoryName;
    if (!name) throw new Error('Category name is required.');
    if (cache.categories.some((c) => !same(c.categoryId, current.categoryId) && same(c.categoryName, name))) {
      throw new Error(`A category named "${name}" already exists.`);
    }
    const idChanged = !same(newId, current.categoryId);
    if (idChanged && cache.categories.some((c) => same(c.categoryId, newId))) throw new Error(`Category code ${newId} is already used.`);

    const next: Category = {
      ...current,
      categoryId: idChanged ? newId : current.categoryId,
      categoryName: name,
      description: updates.description !== undefined ? updates.description.trim() : current.description,
      iconName: updates.iconName || current.iconName
    };
    const { totalAssets, ...rest } = next;
    const ops: Array<(b: WriteBatch) => void> = [(b) => b.set(doc(db, 'categories', next.categoryId), rest)];
    if (idChanged) ops.push((b) => b.delete(doc(db, 'categories', current.categoryId)));
    if (idChanged || name !== current.categoryName) {
      cache.assets
        .filter((a) => same(a.categoryId, current.categoryId))
        .forEach((a) => ops.push((b) => b.update(doc(db, 'assets', a.assetId), { categoryId: next.categoryId, categoryName: name })));
    }
    ops.push((b) => writeLog(b, makeLog('UPDATE_CATEGORY', 'Category', next.categoryId, `Category "${name}" (${next.categoryId}) updated.`)));
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to update category.');
    }
    return { success: true, message: `Category ${name} updated`, category: next };
  },

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'delete categories');
    await ready();
    const cat = cache.categories.find((c) => same(c.categoryId, id));
    if (!cat) throw new Error('Category not found');
    const linked = cache.assets.filter((a) => same(a.categoryId, cat.categoryId)).length;
    if (linked) throw new Error(`Cannot delete "${cat.categoryName}": ${linked} asset(s) use it. Move them to another category first.`);
    const b = newBatch();
    b.delete(doc(db, 'categories', cat.categoryId));
    writeLog(b, makeLog('DELETE_CATEGORY', 'Category', cat.categoryId, `Category "${cat.categoryName}" deleted.`));
    try {
      await b.commit();
    } catch (e) {
      throw friendlyError(e, 'Failed to delete category.');
    }
    return { success: true, message: `Category ${cat.categoryName} deleted` };
  },

  // ----- locations -----
  async getLocations(): Promise<LocationRecord[]> {
    await ready();
    return derivedLocations();
  },

  async createLocation(payload: Partial<LocationRecord>): Promise<{ success: boolean; message: string; location: LocationRecord }> {
    requireRole(MANAGER_ROLES, 'create locations');
    await ready();
    const officeBranch = str(payload.officeBranch).trim();
    const building = str(payload.building).trim();
    const room = str(payload.room).trim();
    if (!officeBranch || !building || !room) throw new Error('City/branch, building and room are all required.');
    if (cache.locations.some((l) => same(l.officeBranch, officeBranch) && same(l.building, building) && same(l.room, room))) {
      throw new Error(`"${room}" already exists in ${building}, ${officeBranch}.`);
    }
    let id = norm(payload.locationId);
    if (!id) {
      const prefix = `LOC-${officeBranch.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN'}-`;
      id = nextSequential(prefix, cache.locations.map((l) => l.locationId), 2);
    }
    const location: LocationRecord = {
      locationId: id,
      officeBranch,
      building,
      floor: str(payload.floor).trim(),
      room,
      description: str(payload.description).trim(),
      isStore: Boolean(payload.isStore),
      assetCount: 0
    };
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'locations', id);
        if ((await t.get(ref)).exists()) throw new Error(`Location ID ${id} already exists.`);
        const { assetCount, ...rest } = location;
        t.set(ref, rest);
        writeLog(t, makeLog('CREATE_LOCATION', 'Location', id, `Location ${locationLabel(location)} (${officeBranch}) created.`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to create location.');
    }
    return { success: true, message: `Location ${room} created`, location };
  },

  async updateLocation(id: string, updates: Partial<LocationRecord>): Promise<{ success: boolean; message: string; location: LocationRecord }> {
    requireRole(MANAGER_ROLES, 'edit locations');
    await ready();
    const current = cache.locations.find((l) => same(l.locationId, id));
    if (!current) throw new Error('Location not found');
    const next: LocationRecord = { ...current };
    for (const k of ['officeBranch', 'building', 'floor', 'room', 'description'] as const) {
      if (updates[k] !== undefined) next[k] = str(updates[k]).trim();
    }
    if (updates.isStore !== undefined) next.isStore = Boolean(updates.isStore);
    if (!next.officeBranch || !next.building || !next.room) throw new Error('City/branch, building and room are all required.');
    if (
      cache.locations.some(
        (l) => !same(l.locationId, id) && same(l.officeBranch, next.officeBranch) && same(l.building, next.building) && same(l.room, next.room)
      )
    ) {
      throw new Error(`"${next.room}" already exists in ${next.building}, ${next.officeBranch}.`);
    }

    const ops: Array<(b: WriteBatch) => void> = [];
    const { assetCount, ...rest } = next;
    ops.push((b) => b.set(doc(db, 'locations', current.locationId), rest));
    const oldLabel = locationLabel(current);
    const newLabel = locationLabel(next);
    if (oldLabel !== newLabel || next.officeBranch !== current.officeBranch) {
      cache.assets
        .filter((a) => assetInLocation(a, current))
        .forEach((a) => ops.push((b) => b.update(doc(db, 'assets', a.assetId), { buildingRoom: newLabel, officeBranch: next.officeBranch })));
      cache.employees
        .filter((e) => same(e.officeBranch, oldLabel))
        .forEach((e) => ops.push((b) => b.update(doc(db, 'employees', e.employeeId), { officeBranch: newLabel })));
    }
    ops.push((b) => writeLog(b, makeLog('UPDATE_LOCATION', 'Location', current.locationId, `Location ${oldLabel} updated to ${newLabel} (${next.officeBranch}).`)));
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to update location.');
    }
    return { success: true, message: `Location ${next.room} updated`, location: next };
  },

  async deleteLocation(id: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'delete locations');
    await ready();
    const loc = cache.locations.find((l) => same(l.locationId, id));
    if (!loc) throw new Error('Location not found');
    const linked = cache.assets.filter((a) => assetInLocation(a, loc)).length;
    if (linked) throw new Error(`Cannot delete "${loc.room}": ${linked} asset(s) are placed there. Move them first.`);
    const label = locationLabel(loc);
    const staff = cache.employees.filter((e) => same(e.officeBranch, label));
    if (staff.length) throw new Error(`Cannot delete "${loc.room}": ${staff.map((e) => e.fullName).slice(0, 2).join(', ')} are stationed there.`);
    const b = newBatch();
    b.delete(doc(db, 'locations', loc.locationId));
    writeLog(b, makeLog('DELETE_LOCATION', 'Location', loc.locationId, `Location ${label} (${loc.officeBranch}) deleted.`));
    try {
      await b.commit();
    } catch (e) {
      throw friendlyError(e, 'Failed to delete location.');
    }
    return { success: true, message: `Location ${loc.room} deleted` };
  },

  async updateBuildingInfo(oldCity: string, oldBuilding: string, newCity: string, newBuilding: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'edit buildings');
    await ready();
    newCity = newCity.trim();
    newBuilding = newBuilding.trim();
    if (!newCity || !newBuilding) throw new Error('City and building name are required.');
    const rooms = cache.locations.filter((l) => same(l.officeBranch, oldCity) && same(l.building, oldBuilding));
    const ops: Array<(b: WriteBatch) => void> = [];
    for (const l of rooms) {
      const next = { ...l, officeBranch: newCity, building: newBuilding };
      ops.push((b) => b.update(doc(db, 'locations', l.locationId), { officeBranch: newCity, building: newBuilding }));
      cache.assets
        .filter((a) => assetInLocation(a, l))
        .forEach((a) => ops.push((b) => b.update(doc(db, 'assets', a.assetId), { buildingRoom: locationLabel(next), officeBranch: newCity })));
      cache.employees
        .filter((e) => same(e.officeBranch, locationLabel(l)))
        .forEach((e) => ops.push((b) => b.update(doc(db, 'employees', e.employeeId), { officeBranch: locationLabel(next) })));
    }
    ops.push((b) =>
      writeLog(b, makeLog('UPDATE_BUILDING', 'Location', oldBuilding, `Building "${oldBuilding}" (${oldCity}) renamed to "${newBuilding}" (${newCity}).`))
    );
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to update building.');
    }
    return { success: true, message: `Building updated across ${rooms.length} room(s)` };
  },

  async deleteBuilding(city: string, buildingName: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'delete buildings');
    await ready();
    const rooms = cache.locations.filter((l) => same(l.officeBranch, city) && same(l.building, buildingName));
    for (const r of rooms) {
      const n = cache.assets.filter((a) => assetInLocation(a, r)).length;
      if (n) throw new Error(`Cannot delete "${buildingName}": room "${r.room}" has ${n} asset(s). Move them first.`);
      const staff = cache.employees.filter((e) => same(e.officeBranch, locationLabel(r)));
      if (staff.length) throw new Error(`Cannot delete "${buildingName}": ${staff[0].fullName} is stationed in "${r.room}".`);
    }
    const ops: Array<(b: WriteBatch) => void> = rooms.map((r) => (b) => b.delete(doc(db, 'locations', r.locationId)));
    ops.push((b) => writeLog(b, makeLog('DELETE_BUILDING', 'Location', buildingName, `Building "${buildingName}" in ${city} (${rooms.length} rooms) deleted.`)));
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to delete building.');
    }
    return { success: true, message: `Building "${buildingName}" (${rooms.length} rooms) deleted.` };
  },

  // ----- consumables -----
  async getConsumables(): Promise<ConsumableItem[]> {
    await ready();
    return [...cache.consumables];
  },

  suggestConsumableCode(): string {
    return nextSequential('CON-', cache.consumables.map((c) => c.itemCode));
  },

  async createConsumable(payload: Partial<ConsumableItem>): Promise<{ success: boolean; message: string; item: ConsumableItem }> {
    requireRole(MANAGER_ROLES, 'add consumables');
    await ready();
    const name = str(payload.itemName).trim();
    if (!name) throw new Error('Item name is required.');
    const code = norm(payload.itemCode) || api.suggestConsumableCode();
    const stock = num(payload.currentStock);
    if (stock < 0) throw new Error('Opening stock cannot be negative.');
    const item: ConsumableItem = {
      itemCode: code,
      itemName: name,
      category: str(payload.category).trim() || 'General Supplies',
      unit: str(payload.unit).trim() || 'Unit',
      openingBalance: stock,
      currentStock: stock,
      minimumThreshold: Math.max(0, num(payload.minimumThreshold)),
      unitCost: Math.max(0, num(payload.unitCost)),
      location: str(payload.location).trim(),
      supplier: str(payload.supplier).trim(),
      lastUpdated: nowIso()
    };
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'consumables', code);
        if ((await t.get(ref)).exists()) throw new Error(`Item code ${code} already exists.`);
        t.set(ref, item);
        writeLog(t, makeLog('CREATE_CONSUMABLE', 'Consumable', code, `Consumable "${name}" (${code}) added with ${stock} ${item.unit}.`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to add consumable.');
    }
    return { success: true, message: `Consumable ${name} added`, item };
  },

  async adjustConsumable(payload: { itemCode: string; deltaQty: number; reason?: string; employeeId?: string }): Promise<{ success: boolean; message: string; item: ConsumableItem }> {
    requireRole(MANAGER_ROLES, 'adjust stock');
    await ready();
    const delta = Math.trunc(num(payload.deltaQty));
    if (!delta) throw new Error('Quantity must be at least 1.');
    const emp = payload.employeeId ? findEmployee(payload.employeeId) : undefined;
    let saved!: ConsumableItem;
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'consumables', norm(payload.itemCode));
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error('Consumable item not found.');
        const item = normalizers.consumables(snap.data());
        const newStock = item.currentStock + delta;
        if (newStock < 0) throw new Error(`Not enough stock. Only ${item.currentStock} ${item.unit} available.`);
        saved = { ...item, currentStock: newStock, lastUpdated: nowIso() };
        t.set(ref, saved);
        writeTx(
          t,
          makeTx({ assetId: item.itemCode, itemName: item.itemName, condition: 'Good' }, delta > 0 ? 'STOCK_RECEIVED' : 'STOCK_ADJUSTED', 'Available', 'Available', {
            employeeId: emp?.employeeId || '',
            employeeName: emp?.fullName || '',
            quantity: Math.abs(delta),
            notes: `${delta > 0 ? 'Received' : 'Issued'} ${Math.abs(delta)} ${item.unit}. ${payload.reason || ''} (stock ${item.currentStock} → ${newStock})`.trim()
          })
        );
        writeLog(
          t,
          makeLog(
            delta > 0 ? 'RESTOCK_CONSUMABLE' : 'ISSUE_CONSUMABLE',
            'Consumable',
            item.itemCode,
            `${delta > 0 ? 'Received' : 'Issued'} ${Math.abs(delta)} ${item.unit} of ${item.itemName}${emp ? ` to ${emp.fullName}` : ''}. Stock now ${newStock}.`
          )
        );
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to adjust stock.');
    }
    return { success: true, message: 'Stock adjusted', item: saved };
  },

  async deleteConsumable(itemCode: string): Promise<{ success: boolean; message: string }> {
    requireRole(MANAGER_ROLES, 'delete consumables');
    await ready();
    const item = cache.consumables.find((c) => same(c.itemCode, itemCode));
    if (!item) throw new Error('Consumable item not found.');
    const b = newBatch();
    b.delete(doc(db, 'consumables', item.itemCode));
    writeLog(b, makeLog('DELETE_CONSUMABLE', 'Consumable', item.itemCode, `Consumable "${item.itemName}" (${item.itemCode}) deleted.`));
    try {
      await b.commit();
    } catch (e) {
      throw friendlyError(e, 'Failed to delete consumable.');
    }
    return { success: true, message: `Consumable ${item.itemCode} deleted.` };
  },

  // ----- history -----
  async getTransactions(_filters?: unknown): Promise<AssetTransaction[]> {
    await ready();
    return [...cache.transactions];
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    await ready();
    return [...cache.activityLogs];
  },

  async clearActivityLogs(): Promise<{ success: boolean; message: string }> {
    const u = requireRole(['Super Admin'], 'clear the audit trail');
    await ready();
    const ops: Array<(b: WriteBatch) => void> = cache.activityLogs.map((l) => (b) => b.delete(doc(db, 'activityLogs', l.logId)));
    ops.push((b) => writeLog(b, makeLog('AUDIT_TRAIL_CLEARED', 'System', 'AUDIT-HISTORY', `Audit trail cleared by ${u.name}.`)));
    try {
      await commitInChunks(ops);
    } catch (e) {
      throw friendlyError(e, 'Failed to clear audit trail.');
    }
    return { success: true, message: 'Audit trail cleared.' };
  },

  subscribeToCloudSync(callback: (payload: RealtimeSyncPayload) => void): () => void {
    startSync();
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },

  // ----- requests -----
  async getRequests(): Promise<AssetRequest[]> {
    await ready();
    return [...cache.requests];
  },

  async createRequest(req: Partial<AssetRequest>): Promise<AssetRequest> {
    await ready();
    const emp = req.requestingEmployeeId ? findEmployee(req.requestingEmployeeId) : undefined;
    if (!emp) throw new Error('Select the employee making the request.');
    const me = currentUser();
    if (!MANAGER_ROLES.includes(me.role) && !APPROVER_ROLES.includes(me.role) && me.employeeId && !same(me.employeeId, emp.employeeId)) {
      throw new Error('You can only submit requests for yourself.');
    }
    if (!str(req.itemDescription).trim()) throw new Error('Describe the item needed.');
    if (!str(req.businessJustification).trim()) throw new Error('Business justification is required.');
    const quantity = Math.trunc(num(req.quantity, 1));
    if (quantity < 1) throw new Error('Quantity must be at least 1.');
    const year = new Date().getFullYear();
    const requestNumber = nextSequential(`REQ-${year}-`, cache.requests.map((r) => r.requestNumber), 4);
    const newReq: AssetRequest = {
      requestId: uniqueId('REQ'),
      requestNumber,
      requestingEmployeeId: emp.employeeId,
      requestingEmployeeName: emp.fullName,
      department: emp.department,
      itemType: req.itemType === 'Consumable' ? 'Consumable' : 'Fixed Asset',
      itemDescription: str(req.itemDescription).trim(),
      quantity,
      businessJustification: str(req.businessJustification).trim(),
      requestDate: nowIso(),
      requiredDate: req.requiredDate || todayStr(),
      status: 'Pending'
    };
    const b = newBatch();
    b.set(doc(db, 'requests', newReq.requestId), newReq);
    writeLog(b, makeLog('CREATE_REQUEST', 'Request', newReq.requestId, `${requestNumber}: ${emp.fullName} requested ${quantity} × ${newReq.itemDescription}.`));
    try {
      await b.commit();
    } catch (e) {
      throw friendlyError(e, 'Failed to submit request.');
    }
    return newReq;
  },

  async updateRequestStatus(
    id: string,
    status: AssetRequest['status'],
    extra?: { rejectionReason?: string; fulfilledAssetId?: string }
  ): Promise<AssetRequest> {
    const u = requireRole(APPROVER_ROLES, 'approve or reject requests');
    await ready();
    let saved!: AssetRequest;
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'requests', id);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error('Request not found.');
        const r = snap.data() as AssetRequest;
        const allowed: Record<string, AssetRequest['status'][]> = {
          Pending: ['Approved', 'Rejected'],
          Approved: ['Fulfilled', 'Rejected'],
          Rejected: [],
          Fulfilled: []
        };
        if (!allowed[r.status]?.includes(status)) throw new Error(`A ${r.status} request cannot be marked ${status}.`);
        saved = { ...r, status };
        if (status === 'Approved' || status === 'Rejected') {
          saved.approverId = u.userId;
          saved.approverName = u.name;
          saved.decisionDate = nowIso();
        }
        if (status === 'Rejected' && extra?.rejectionReason) saved.rejectionReason = extra.rejectionReason;
        if (status === 'Fulfilled' && extra?.fulfilledAssetId) saved.fulfilledAssetId = extra.fulfilledAssetId;
        t.set(ref, saved);
        writeLog(t, makeLog(`REQUEST_${status.toUpperCase()}`, 'Request', id, `${r.requestNumber} marked ${status} by ${u.name}.`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to update request.');
    }
    return saved;
  },

  // ----- maintenance -----
  async getMaintenance(): Promise<MaintenanceRecord[]> {
    await ready();
    return [...cache.maintenance];
  },

  async createMaintenance(data: { assetId: string; issueDescription: string; serviceProvider?: string; repairCost?: number }): Promise<MaintenanceRecord> {
    const u = requireRole(MANAGER_ROLES, 'log maintenance');
    await ready();
    if (!str(data.issueDescription).trim()) throw new Error('Describe the fault.');
    let record!: MaintenanceRecord;
    try {
      await runTx(async (t) => {
        const a = await readAssetInTx(t, data.assetId);
        if (a.status === 'Issued') throw new Error(`${a.assetId} is issued to ${a.assignedTo}. Return it (condition "Needs Repair") before sending it for repair.`);
        if (!['Available', 'Under Maintenance'].includes(a.status)) throw new Error(`${a.assetId} is "${a.status}" and cannot be sent for maintenance.`);
        record = {
          maintenanceId: uniqueId('MNT'),
          assetId: a.assetId,
          assetName: a.itemName,
          issueDescription: data.issueDescription.trim(),
          reportedDate: todayStr(),
          serviceProvider: str(data.serviceProvider).trim(),
          repairCost: Math.max(0, num(data.repairCost)),
          workPerformed: '',
          status: 'In Progress',
          warrantyStatus: warrantyStatusFor(a),
          reportedBy: u.name
        };
        t.set(doc(db, 'maintenance', record.maintenanceId), record);
        if (a.status !== 'Under Maintenance') {
          const next: Asset = { ...a, status: 'Under Maintenance', lastUpdated: nowIso() };
          t.set(doc(db, 'assets', a.assetId), next);
          writeTx(t, makeTx(next, 'MAINTENANCE_SENT', a.status, 'Under Maintenance', { notes: record.issueDescription, location: a.buildingRoom }));
        }
        writeLog(t, makeLog('CREATE_MAINTENANCE', 'Maintenance', record.maintenanceId, `Repair ticket for ${a.assetId} (${a.itemName}): ${record.issueDescription}`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to create maintenance ticket.');
    }
    return record;
  },

  async updateMaintenance(id: string, updates: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    requireRole(MANAGER_ROLES, 'update maintenance');
    await ready();
    let saved!: MaintenanceRecord;
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'maintenance', id);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error('Maintenance ticket not found.');
        const m = normalizers.maintenance(snap.data());
        if (m.status === 'Completed' || m.status === 'Cancelled') throw new Error(`This ticket is already ${m.status}.`);
        const closing = updates.status === 'Completed' || updates.status === 'Cancelled';
        // Read asset before any write (Firestore transaction rule).
        const assetSnap = closing ? await t.get(doc(db, 'assets', m.assetId)) : null;

        saved = { ...m, ...updates, maintenanceId: m.maintenanceId, assetId: m.assetId };
        if (updates.repairCost !== undefined) saved.repairCost = Math.max(0, num(updates.repairCost));
        if (closing && !saved.completionDate) saved.completionDate = todayStr();
        t.set(ref, saved);

        if (closing && assetSnap?.exists()) {
          const a = normalizers.assets(assetSnap.data());
          const otherOpen = cache.maintenance.some(
            (x) => x.maintenanceId !== m.maintenanceId && same(x.assetId, m.assetId) && x.status !== 'Completed' && x.status !== 'Cancelled'
          );
          if (a.status === 'Under Maintenance' && !otherOpen) {
            const next: Asset = {
              ...a,
              status: 'Available',
              condition: updates.status === 'Completed' ? 'Good' : a.condition,
              lastUpdated: nowIso()
            };
            t.set(doc(db, 'assets', a.assetId), next);
            writeTx(
              t,
              makeTx(next, 'MAINTENANCE_RETURNED', 'Under Maintenance', 'Available', {
                notes: updates.status === 'Completed' ? saved.workPerformed || 'Repaired' : 'Repair ticket cancelled',
                location: a.buildingRoom
              })
            );
          }
        }
        writeLog(t, makeLog('UPDATE_MAINTENANCE', 'Maintenance', id, `Ticket ${id} for ${m.assetId} → ${saved.status}.`));
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to update maintenance ticket.');
    }
    return saved;
  },

  // ----- physical audits -----
  async getAudits(): Promise<PhysicalAudit[]> {
    await ready();
    return [...cache.audits];
  },

  async startAudit(name: string, branch: string, locationOrCategory: string): Promise<PhysicalAudit> {
    const u = requireRole(MANAGER_ROLES, 'start audits');
    await ready();
    if (!name.trim()) throw new Error('Audit name is required.');
    const inScope = cache.assets.filter(
      (a) => !['Retired', 'Archived'].includes(a.status) && (branch === 'All Branches' || same(a.officeBranch, branch))
    );
    if (!inScope.length) throw new Error(`No active assets are registered${branch === 'All Branches' ? '' : ` in ${branch}`}.`);
    const items: PhysicalAuditItem[] = inScope.map((a) => ({
      assetId: a.assetId,
      expectedStatus: a.status,
      expectedLocation: a.buildingRoom,
      expectedEmployee: a.assignedTo,
      isFound: false,
      isDiscrepancy: false
    }));
    const audit: PhysicalAudit = {
      auditId: uniqueId('AUD'),
      auditName: name.trim(),
      officeBranch: branch,
      locationOrCategory: locationOrCategory || 'All Categories',
      startDate: nowIso(),
      status: 'In Progress',
      createdBy: u.name,
      totalExpected: items.length,
      totalScanned: 0,
      totalMissing: items.length,
      totalDiscrepancies: 0,
      items
    };
    const b = newBatch();
    b.set(doc(db, 'audits', audit.auditId), audit);
    writeLog(b, makeLog('START_AUDIT', 'Audit', audit.auditId, `Audit "${audit.auditName}" started for ${branch} (${items.length} assets).`));
    try {
      await b.commit();
    } catch (e) {
      throw friendlyError(e, 'Failed to start audit.');
    }
    return audit;
  },

  async scanAuditItem(auditId: string, assetId: string, observedCondition?: AssetCondition, notes?: string): Promise<PhysicalAudit> {
    const u = requireRole(MANAGER_ROLES, 'record audit scans');
    await ready();
    const id = norm(assetId);
    let saved!: PhysicalAudit;
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'audits', auditId);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error('Audit not found.');
        const audit = normalizers.audits(snap.data());
        if (audit.status !== 'In Progress') throw new Error(`This audit is ${audit.status}; scans are closed.`);
        const asset = cache.assets.find((a) => same(a.assetId, id));
        if (!asset) throw new Error(`${id} is not a registered asset.`);
        const items = audit.items.map((i) => ({ ...i }));
        let item = items.find((i) => same(i.assetId, id));
        if (item?.isFound) throw new Error(`${id} was already verified at ${new Date(item.scannedAt || '').toLocaleTimeString()}.`);
        if (!item) {
          item = {
            assetId: asset.assetId,
            expectedStatus: asset.status,
            expectedLocation: '(not expected in this audit)',
            expectedEmployee: asset.assignedTo,
            isFound: false,
            isDiscrepancy: true,
            isUnexpected: true
          } as PhysicalAuditItem;
          items.push(item);
        }
        const cond = observedCondition && AUDIT_CONDITIONS.includes(observedCondition) ? observedCondition : asset.condition;
        item.isFound = true;
        item.scannedAt = nowIso();
        item.scannedBy = u.name;
        item.observedCondition = cond;
        item.notes = notes?.trim() || '';
        item.isDiscrepancy =
          Boolean((item as any).isUnexpected) || cond !== asset.condition || item.expectedStatus === 'Missing' || item.expectedStatus === 'Lost';

        const expected = items.filter((i) => !(i as any).isUnexpected);
        saved = {
          ...audit,
          items,
          totalExpected: expected.length,
          totalScanned: items.filter((i) => i.isFound).length,
          totalMissing: expected.filter((i) => !i.isFound).length,
          totalDiscrepancies: items.filter((i) => i.isDiscrepancy).length
        };
        t.set(ref, saved);
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to record scan.');
    }
    return saved;
  },

  async finishAudit(auditId: string, status: 'Approved' | 'Cancelled'): Promise<PhysicalAudit> {
    const u = requireRole(MANAGER_ROLES, 'close audits');
    await ready();
    let saved!: PhysicalAudit;
    try {
      await runTx(async (t) => {
        const ref = doc(db, 'audits', auditId);
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error('Audit not found.');
        const audit = normalizers.audits(snap.data());
        if (audit.status !== 'In Progress' && audit.status !== 'Review') throw new Error(`This audit is already ${audit.status}.`);
        saved = { ...audit, status, endDate: nowIso() };
        t.set(ref, saved);
        writeLog(
          t,
          makeLog(
            status === 'Approved' ? 'APPROVE_AUDIT' : 'CANCEL_AUDIT',
            'Audit',
            auditId,
            `Audit "${audit.auditName}" ${status.toLowerCase()} by ${u.name}: ${audit.totalScanned}/${audit.totalExpected} verified, ${audit.totalMissing} not found, ${audit.totalDiscrepancies} discrepancies.`
          )
        );
      });
    } catch (e) {
      throw friendlyError(e, 'Failed to close audit.');
    }
    return saved;
  },

  // ----- Google Sheets / export -----
  async getSheetsConfig(): Promise<GoogleSheetsSyncConfig> {
    await ready();
    return (
      sheetsConfigCache || {
        spreadsheetId: '',
        isConfigured: false,
        tabsFound: { startHere: false, masterAssets: false, categories: false, employeesLocations: false, assetTransactions: false },
        totalSyncedRows: 0,
        autoSyncOnChange: false
      }
    );
  },

  async testSheetsConnection(spreadsheetIdOrUrl: string): Promise<{ success: boolean; message: string; rowCount?: number }> {
    requireRole(MANAGER_ROLES, 'configure Google Sheets');
    const m = /\/d\/([a-zA-Z0-9-_]+)/.exec(spreadsheetIdOrUrl);
    const id = (m ? m[1] : spreadsheetIdOrUrl).trim();
    if (!/^[a-zA-Z0-9-_]{20,}$/.test(id)) {
      return { success: false, message: 'That does not look like a Google Sheets ID. Copy the long code between /d/ and /edit in the sheet URL.' };
    }
    const cfg: GoogleSheetsSyncConfig = {
      ...(await api.getSheetsConfig()),
      spreadsheetId: id,
      isConfigured: true,
      lastSyncTimestamp: nowIso()
    };
    try {
      await setDoc(doc(db, 'systemSettings', 'sheetsConfig'), cfg);
    } catch (e) {
      throw friendlyError(e, 'Failed to save spreadsheet ID.');
    }
    sheetsConfigCache = cfg;
    return {
      success: true,
      message: 'Spreadsheet ID saved. Automatic two-way sync is not enabled yet: download each tab as CSV below and import it into the sheet (File → Import).'
    };
  },

  async getWorkbookExport(): Promise<Record<string, string[][]>> {
    await ready();
    const employees = derivedEmployees();
    return {
      'Master Assets': [
        ['Asset ID', 'Item Name', 'Category ID', 'Category Name', 'Brand', 'Model', 'Serial Number', 'Quantity', 'Unit', 'Purchase Date', 'Purchase Cost (PKR)', 'Supplier', 'City / Branch', 'Building - Room', 'Status', 'Condition', 'Assigned Employee ID', 'Assigned To', 'Due Date', 'Warranty Expiry', 'Invoice Link', 'Record Completion', 'Remarks', 'Last Updated'],
        ...cache.assets.map((a) => [
          a.assetId, a.itemName, a.categoryId, a.categoryName, a.brand, a.model, a.serialNumber, String(a.quantity), a.unit,
          a.purchaseDate, String(a.purchaseCost), a.supplier, a.officeBranch, a.buildingRoom, a.status, a.condition,
          a.status === 'Issued' ? a.assignedEmployeeId : '', a.status === 'Issued' ? a.assignedTo : '', str(a.dueDate),
          a.warrantyExpiry, a.invoiceDocLink, a.recordCompletion, a.remarks, a.lastUpdated
        ].map(csvCell))
      ],
      Categories: [
        ['Category ID', 'Category Name', 'Description', 'Total Assets'],
        ...derivedCategories().map((c) => [c.categoryId, c.categoryName, c.description, String(c.totalAssets)])
      ],
      Employees: [
        ['Employee ID', 'Full Name', 'Department', 'Designation', 'Email', 'Phone', 'Station', 'Role', 'Active', 'Assets Held'],
        ...employees.map((e) => [e.employeeId, e.fullName, e.department, e.designation, e.email, e.phone, e.officeBranch, str(e.role), e.activeStatus ? 'Yes' : 'No', String(e.assignedAssetCount)])
      ],
      Locations: [
        ['Location ID', 'City / Branch', 'Building', 'Floor', 'Room', 'Store?', 'Assets', 'Description'],
        ...derivedLocations().map((l) => [l.locationId, l.officeBranch, l.building, l.floor, l.room, l.isStore ? 'Yes' : 'No', String(l.assetCount), l.description])
      ],
      'Asset Transactions': [
        ['Transaction ID', 'Date', 'Type', 'Asset ID', 'Asset Name', 'Employee ID', 'Employee Name', 'Previous Status', 'New Status', 'Condition', 'Quantity', 'Location', 'Performed By', 'Notes'],
        ...cache.transactions.map((t) => [
          t.transactionId, t.timestamp, t.transactionType, t.assetId, t.assetName, t.employeeId, t.employeeName, t.previousStatus,
          t.newStatus, t.condition, t.quantity !== undefined ? String(t.quantity) : '', str(t.location), t.performedByName, t.notes
        ].map(csvCell))
      ],
      Consumables: [
        ['Item Code', 'Item Name', 'Category', 'Unit', 'Opening Balance', 'Current Stock', 'Minimum Threshold', 'Unit Cost (PKR)', 'Location', 'Supplier', 'Last Updated'],
        ...cache.consumables.map((c) => [c.itemCode, c.itemName, c.category, c.unit, String(c.openingBalance), String(c.currentStock), String(c.minimumThreshold), String(c.unitCost), c.location, c.supplier, c.lastUpdated])
      ]
    };
  },

  /** Imports rows shaped like the "Master Assets" export: new IDs are created, existing IDs updated (status/custody untouched). */
  async importSheetsRows(rows: Record<string, string>[]): Promise<{ importedCount: number; updatedCount: number; skippedCount: number; errors: string[] }> {
    requireRole(MANAGER_ROLES, 'import assets');
    await ready();
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const ops: Array<(b: WriteBatch) => void> = [];
    const ts = nowIso();
    rows.forEach((row, i) => {
      const id = norm(row['Asset ID']);
      const name = str(row['Item Name']).trim();
      if (!id || !name) {
        skippedCount++;
        errors.push(`Row ${i + 2}: Asset ID and Item Name are required.`);
        return;
      }
      const cat = cache.categories.find((c) => same(c.categoryId, row['Category ID']) || same(c.categoryName, row['Category Name']));
      if (!cat) {
        skippedCount++;
        errors.push(`Row ${i + 2} (${id}): category "${row['Category ID'] || row['Category Name'] || ''}" not found.`);
        return;
      }
      const fields = {
        itemName: name,
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        brand: str(row['Brand']),
        model: str(row['Model']),
        serialNumber: str(row['Serial Number']),
        quantity: Math.max(1, num(row['Quantity'], 1)),
        unit: str(row['Unit']) || 'Unit',
        purchaseDate: str(row['Purchase Date']),
        purchaseCost: Math.max(0, num(row['Purchase Cost (PKR)'] ?? row['Purchase Cost'])),
        supplier: str(row['Supplier']),
        officeBranch: str(row['City / Branch'] ?? row['Office Branch']),
        buildingRoom: str(row['Building - Room'] ?? row['Location']),
        condition: (AUDIT_CONDITIONS.includes(row['Condition'] as AssetCondition) ? row['Condition'] : 'Good') as AssetCondition,
        warrantyExpiry: str(row['Warranty Expiry']),
        invoiceDocLink: str(row['Invoice Link']),
        remarks: str(row['Remarks']),
        lastUpdated: ts
      };
      const existing = cache.assets.find((a) => same(a.assetId, id));
      if (existing) {
        updatedCount++;
        ops.push((b) => b.update(doc(db, 'assets', existing.assetId), fields));
      } else {
        importedCount++;
        const asset = normalizers.assets({ ...fields, assetId: id, status: 'Available', recordCompletion: 'Complete', createdAt: ts });
        ops.push((b) => b.set(doc(db, 'assets', id), asset));
        ops.push((b) => writeTx(b, makeTx(asset, 'INITIAL_IMPORT', 'Available', 'Available', { notes: 'Imported from spreadsheet', location: asset.buildingRoom })));
      }
    });
    if (ops.length) {
      ops.push((b) => writeLog(b, makeLog('SHEETS_IMPORT', 'SheetsSync', 'IMPORT', `Imported ${importedCount} new and updated ${updatedCount} assets (${skippedCount} skipped).`)));
      try {
        await commitInChunks(ops);
      } catch (e) {
        throw friendlyError(e, 'Import failed.');
      }
    }
    return { importedCount, updatedCount, skippedCount, errors };
  },

  // ----- backup -----
  exportFullBackup(): string {
    return JSON.stringify(
      {
        exportedAt: nowIso(),
        app: 'WANG Inventory',
        version: 2,
        assets: cache.assets,
        employees: cache.employees.map(({ assignedAssetCount, ...e }) => e),
        categories: cache.categories.map(({ totalAssets, ...c }) => c),
        locations: cache.locations.map(({ assetCount, ...l }) => l),
        consumables: cache.consumables,
        transactions: cache.transactions,
        requests: cache.requests,
        maintenance: cache.maintenance,
        audits: cache.audits,
        activityLogs: cache.activityLogs
      },
      null,
      2
    );
  },

  /** Restores a backup by upserting every record (nothing is deleted). */
  async importFullBackup(jsonContent: string): Promise<{ success: boolean; message: string }> {
    requireRole(['Super Admin'], 'restore backups');
    await ready();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      return { success: false, message: 'The file is not valid JSON.' };
    }
    if (!parsed || !Array.isArray(parsed.assets)) return { success: false, message: 'Invalid backup file: no assets list found.' };
    const keys: Record<CollectionName, string> = {
      assets: 'assetId',
      employees: 'employeeId',
      categories: 'categoryId',
      locations: 'locationId',
      consumables: 'itemCode',
      transactions: 'transactionId',
      requests: 'requestId',
      maintenance: 'maintenanceId',
      audits: 'auditId',
      activityLogs: 'logId'
    };
    const ops: Array<(b: WriteBatch) => void> = [];
    let total = 0;
    for (const name of COLLECTIONS) {
      const list = Array.isArray(parsed[name]) ? parsed[name] : [];
      for (const rec of list) {
        const id = str(rec?.[keys[name]]).trim();
        if (!id || id.includes('/')) continue;
        total++;
        ops.push((b) => b.set(doc(db, name, id), rec));
      }
    }
    ops.push((b) => writeLog(b, makeLog('RESTORE_BACKUP', 'System', 'BACKUP', `Backup restored (${total} records).`)));
    try {
      await commitInChunks(ops);
    } catch (e) {
      return { success: false, message: friendlyError(e, 'Restore failed.').message };
    }
    return { success: true, message: `Backup restored: ${total} records (${parsed.assets.length} assets).` };
  }
};
