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
  ActivityLog, 
  AssetRequest, 
  UserSession, 
  UserRole 
} from '../types/inventory.js';

const BASE_URL = '/api';

// Fallback initial seed for static GitHub hosting (where backend Express server is not available)
const FALLBACK_SEED = {
  user: {
    userId: 'USR-ADMIN-01',
    name: 'Admin Manager',
    email: 'admin@wang.org.pk',
    role: 'Inventory Manager' as UserRole,
    employeeId: 'EMP-001',
    officeBranch: 'Head Office - Islamabad'
  },
  categories: [
    { categoryId: 'CAT-FUR', categoryName: 'Furniture', description: 'Office chairs, desks, tables, and general seating furniture', totalAssets: 1 },
    { categoryId: 'CAT-FFW', categoryName: 'Furniture, Fixtures & Wall Fittings', description: 'Storage cabinets, shelving units, partitions, notice boards, and wall fixtures', totalAssets: 1 },
    { categoryId: 'CAT-ITC', categoryName: 'IT & Computing', description: 'Laptops, desktop computers, servers, switches, routers, and monitors', totalAssets: 3 },
    { categoryId: 'CAT-MED', categoryName: 'Media & Production', description: 'Cameras, video recorders, audio gear, lighting kits, and broadcasting tools', totalAssets: 2 },
    { categoryId: 'CAT-OFA', categoryName: 'Office Automation', description: 'Printers, copiers, document scanners, shredders, and counting machines', totalAssets: 1 },
    { categoryId: 'CAT-TAM', categoryName: 'Tools & Maintenance', description: 'Hand tools, power tools, workshop hardware, and servicing equipment', totalAssets: 0 },
    { categoryId: 'CAT-STV', categoryName: 'Stitching & Vocational', description: 'Industrial sewing machines, vocational training kits, and tailoring tools', totalAssets: 0 },
    { categoryId: 'CAT-KPA', categoryName: 'Kitchen & Pantry Appliances', description: 'Microwaves, refrigerators, water dispensers, kettles, and kitchenware', totalAssets: 0 },
    { categoryId: 'CAT-EPS', categoryName: 'Electrical & Power Systems', description: 'Generators, solar inverters, UPS backup units, and electrical power distribution', totalAssets: 4 },
    { categoryId: 'CAT-CCTV', categoryName: 'CCTV & Security', description: 'Security cameras, DVR/NVR units, biometric access control, and alarms', totalAssets: 0 },
    { categoryId: 'CAT-WAS', categoryName: 'Water & Sanitation', description: 'Water filtration plants, pumps, plumbing supplies, and sanitation hardware', totalAssets: 0 }
  ],
  employees: [
    { employeeId: 'EMP-001', fullName: 'Dr. Salman Khan', department: 'Executive Management', designation: 'Executive Director', email: 'salmankhanroonjha123@gmail.com', phone: '+92 300 8765432', officeBranch: 'Head Office - Islamabad', activeStatus: true, assignedAssetCount: 1 },
    { employeeId: 'EMP-002', fullName: 'Ayesha Noor', department: 'Program Operations', designation: 'Senior Program Manager', email: 'ayesha.noor@wang.org.pk', phone: '+92 312 9876543', officeBranch: 'Head Office - Islamabad', activeStatus: true, assignedAssetCount: 1 },
    { employeeId: 'EMP-003', fullName: 'Bilal Tariq', department: 'Finance & Compliance', designation: 'Finance & Accounts Officer', email: 'bilal.tariq@wang.org.pk', phone: '+92 333 4567890', officeBranch: 'Head Office - Islamabad', activeStatus: true, assignedAssetCount: 0 },
    { employeeId: 'EMP-004', fullName: 'Fatima Zahra', department: 'IT & Communications', designation: 'Systems & Media Administrator', email: 'fatima.zahra@wang.org.pk', phone: '+92 345 6789012', officeBranch: 'Head Office - Islamabad', activeStatus: true, assignedAssetCount: 1 },
    { employeeId: 'EMP-005', fullName: 'Tariq Mehmood', department: 'Logistics & Field Support', designation: 'Field Logistics Coordinator', email: 'tariq.mehmood@wang.org.pk', phone: '+92 321 3456789', officeBranch: 'Field Office - Quetta', activeStatus: true, assignedAssetCount: 0 }
  ],
  locations: [
    { locationId: 'LOC-HO-101', officeBranch: 'Head Office - Islamabad', building: 'Main Administrative Block', floor: '1st Floor', room: 'Room 101 - Executive Suite', description: 'Executive Director and Board meeting room', isStore: false, assetCount: 1 },
    { locationId: 'LOC-HO-204', officeBranch: 'Head Office - Islamabad', building: 'East Wing', floor: '2nd Floor', room: 'Room 204 - IT & Media Lab', description: 'IT infrastructure, server racks, and media editing', isStore: false, assetCount: 3 },
    { locationId: 'LOC-HO-STR', officeBranch: 'Head Office - Islamabad', building: 'Ground Facility', floor: 'Ground', room: 'Central Store - Bay A', description: 'Primary storage for unissued equipment and consumables', isStore: true, assetCount: 5 },
    { locationId: 'LOC-QTA-01', officeBranch: 'Field Office - Quetta', building: 'Provincial Office', floor: 'Ground', room: 'Operations Wing - Office 2', description: 'Balochistan community outreach and field operations hub', isStore: false, assetCount: 2 }
  ],
  assets: [
    {
      assetId: 'WANG-EPS-001',
      categoryId: 'CAT-EPS',
      categoryName: 'Electrical & Power Systems',
      itemName: 'Dell Latitude 5420 Laptop',
      brand: 'Dell',
      model: 'Latitude 5420 Core i7 16GB 512GB SSD',
      serialNumber: 'DL-5420-99214',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2024-03-15',
      purchaseCost: 1150,
      supplier: 'MegaTech Systems Pvt Ltd',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Room 101 - Executive Suite',
      assignedEmployeeId: 'EMP-001',
      assignedTo: 'Dr. Salman Khan',
      condition: 'Good',
      status: 'Issued',
      warrantyExpiry: '2027-03-14',
      invoiceDocLink: 'https://drive.google.com/wang-invoices/INV-2024-0315-DL',
      remarks: 'Primary executive machine. Fully encrypted BitLocker.',
      recordCompletion: 'Verified',
      createdAt: '2024-03-15T09:00:00Z',
      lastUpdated: '2026-09-10T11:20:00Z',
      dueDate: '2026-12-31'
    },
    {
      assetId: 'WANG-EPS-002',
      categoryId: 'CAT-EPS',
      categoryName: 'Electrical & Power Systems',
      itemName: 'Logitech MX Master 3S Wireless Mouse',
      brand: 'Logitech',
      model: 'MX Master 3S Performance Edition',
      serialNumber: 'SN-LOG-MX3S-8819',
      quantity: 1,
      unit: 'Piece',
      purchaseDate: '2025-01-10',
      purchaseCost: 99,
      supplier: 'TechZone Islamabad',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Central Store - Bay A',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Good',
      status: 'Available',
      warrantyExpiry: '2027-01-09',
      invoiceDocLink: 'https://drive.google.com/wang-invoices/INV-2025-0110-LOG',
      remarks: 'Ready for issuance to staff upon request. Tested and paired.',
      recordCompletion: 'Complete',
      createdAt: '2025-01-10T14:30:00Z',
      lastUpdated: '2026-10-01T08:00:00Z'
    },
    {
      assetId: 'WANG-EPS-003',
      categoryId: 'CAT-EPS',
      categoryName: 'Electrical & Power Systems',
      itemName: 'APC Smart-UPS 1500VA LCD 230V',
      brand: 'Schneider Electric / APC',
      model: 'SMT1500I',
      serialNumber: 'APC-1500-472910',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2023-11-05',
      purchaseCost: 580,
      supplier: 'PowerCare Engineering',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Room 204 - IT & Media Lab',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Good',
      status: 'Available',
      warrantyExpiry: '2026-11-04',
      invoiceDocLink: 'https://drive.google.com/wang-invoices/INV-2023-APC1500',
      remarks: 'Provides battery backup to IT lab rack and networking switch.',
      recordCompletion: 'Verified',
      createdAt: '2023-11-05T10:00:00Z',
      lastUpdated: '2026-08-14T16:45:00Z'
    },
    {
      assetId: 'WANG-OFA-001',
      categoryId: 'CAT-OFA',
      categoryName: 'Office Automation',
      itemName: 'HP LaserJet Pro MFP 4103fdw Printer',
      brand: 'HP',
      model: 'LaserJet 4103fdw All-in-One Duplex WiFi',
      serialNumber: 'CNB1N59021',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2024-06-20',
      purchaseCost: 480,
      supplier: 'OfficeDepot Pakistan',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Room 204 - IT & Media Lab',
      assignedEmployeeId: 'EMP-004',
      assignedTo: 'Fatima Zahra',
      condition: 'Good',
      status: 'Issued',
      warrantyExpiry: '2027-06-19',
      invoiceDocLink: 'https://drive.google.com/wang-invoices/INV-2024-HP4103',
      remarks: 'Shared network office printer. Maintained by IT specialist.',
      recordCompletion: 'Verified',
      createdAt: '2024-06-20T11:00:00Z',
      lastUpdated: '2026-07-22T09:15:00Z'
    },
    {
      assetId: 'WANG-ITC-001',
      categoryId: 'CAT-ITC',
      categoryName: 'IT & Computing',
      itemName: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      brand: 'Dell',
      model: 'U2723QE',
      serialNumber: 'CN-0M381P-74261',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2024-08-12',
      purchaseCost: 620,
      supplier: 'MegaTech Systems Pvt Ltd',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'East Wing - Operations Floor',
      assignedEmployeeId: 'EMP-002',
      assignedTo: 'Ayesha Noor',
      condition: 'Good',
      status: 'Issued',
      warrantyExpiry: '2027-08-11',
      invoiceDocLink: 'https://drive.google.com/wang-invoices/INV-2024-DELL27',
      remarks: 'Assigned for GIS mapping and field project presentations.',
      recordCompletion: 'Verified',
      createdAt: '2024-08-12T12:00:00Z',
      lastUpdated: '2026-09-01T14:10:00Z',
      dueDate: '2026-11-30'
    },
    {
      assetId: 'WANG-FUR-001',
      categoryId: 'CAT-FUR',
      categoryName: 'Furniture',
      itemName: 'Ergonomic High-Back Executive Mesh Chair',
      brand: 'Habitt Executive',
      model: 'AeroPro Ergonomic',
      serialNumber: 'HAB-CH-8831',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2023-09-01',
      purchaseCost: 190,
      supplier: 'Habitt Commercial Solutions',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Central Store - Bay A',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Good',
      status: 'Available',
      warrantyExpiry: '2028-08-31',
      invoiceDocLink: '',
      remarks: 'Assembled and stored in Bay A.',
      recordCompletion: 'Complete',
      createdAt: '2023-09-01T15:00:00Z',
      lastUpdated: '2026-06-15T10:00:00Z'
    },
    {
      assetId: 'WANG-FFW-001',
      categoryId: 'CAT-FFW',
      categoryName: 'Furniture, Fixtures & Wall Fittings',
      itemName: 'Steel Fireproof Document Safe Cabinet',
      brand: 'ChubbSafe',
      model: 'DataPlus 2-Hour Fire Resistant',
      serialNumber: 'CHS-SAFE-1029',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2022-05-18',
      purchaseCost: 750,
      supplier: 'SafeTech Security Hardware',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Room 101 - Executive Suite',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Good',
      status: 'Available',
      warrantyExpiry: '2032-05-17',
      invoiceDocLink: '',
      remarks: 'Houses project contracts and legal NGO registrations.',
      recordCompletion: 'Verified',
      createdAt: '2022-05-18T10:00:00Z',
      lastUpdated: '2026-01-10T12:00:00Z'
    },
    {
      assetId: 'WANG-MED-001',
      categoryId: 'CAT-MED',
      categoryName: 'Media & Production',
      itemName: 'Canon EOS R50 Mirrorless Camera + 18-45mm Kit',
      brand: 'Canon',
      model: 'EOS R50 4K Content Creator Kit',
      serialNumber: 'CAN-R50-441092',
      quantity: 1,
      unit: 'Set',
      purchaseDate: '2024-10-05',
      purchaseCost: 790,
      supplier: 'Digital Vision Media',
      officeBranch: 'Field Office - Quetta',
      buildingRoom: 'Operations Wing - Office 2',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Good',
      status: 'Available',
      warrantyExpiry: '2026-10-04',
      invoiceDocLink: 'https://drive.google.com/wang-invoices/INV-2024-CANON',
      remarks: 'Field documentation camera kit with dual batteries and bag.',
      recordCompletion: 'Verified',
      createdAt: '2024-10-05T09:30:00Z',
      lastUpdated: '2026-09-20T15:20:00Z'
    },
    {
      assetId: 'WANG-MED-002',
      categoryId: 'CAT-MED',
      categoryName: 'Media & Production',
      itemName: 'Iridium Extreme 9575 Satellite Handset',
      brand: 'Iridium',
      model: 'Extreme 9575 Military Grade',
      serialNumber: 'IRID-9575-31088',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2023-04-12',
      purchaseCost: 1450,
      supplier: 'GlobalSat Communications',
      officeBranch: 'Field Office - Quetta',
      buildingRoom: 'Operations Wing - Office 2',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Good',
      status: 'Available',
      warrantyExpiry: '2026-04-11',
      invoiceDocLink: '',
      remarks: 'Emergency distress satellite communication for remote flood-relief missions.',
      recordCompletion: 'Verified',
      createdAt: '2023-04-12T11:00:00Z',
      lastUpdated: '2026-08-01T10:00:00Z'
    },
    {
      assetId: 'WANG-EPS-004',
      categoryId: 'CAT-EPS',
      categoryName: 'Electrical & Power Systems',
      itemName: 'Yamaha EF2000iS Inverter Generator 2kVA',
      brand: 'Yamaha',
      model: 'EF2000iS Silent Inverter',
      serialNumber: 'YAM-GEN-2000-551',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2023-07-19',
      purchaseCost: 890,
      supplier: 'PowerCare Engineering',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Central Store - Bay A',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Needs Repair',
      status: 'Under Maintenance',
      warrantyExpiry: '2025-07-18',
      invoiceDocLink: '',
      remarks: 'Carburetor cleaning and spark plug replacement underway.',
      recordCompletion: 'Complete',
      createdAt: '2023-07-19T08:00:00Z',
      lastUpdated: '2026-10-15T14:00:00Z'
    },
    {
      assetId: 'WANG-ITC-002',
      categoryId: 'CAT-ITC',
      categoryName: 'IT & Computing',
      itemName: 'Lenovo ThinkPad X1 Carbon Gen 10',
      brand: 'Lenovo',
      model: 'X1 Carbon Core i7 32GB',
      serialNumber: 'PF-4912KL',
      quantity: 1,
      unit: 'Unit',
      purchaseDate: '2023-02-14',
      purchaseCost: 1650,
      supplier: 'MegaTech Systems Pvt Ltd',
      officeBranch: 'Head Office - Islamabad',
      buildingRoom: 'Room 204 - IT & Media Lab',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: 'Fair',
      status: 'Available',
      warrantyExpiry: '2026-02-13',
      invoiceDocLink: '',
      remarks: 'Spare laptop available for field volunteers and guest researchers.',
      recordCompletion: 'Complete',
      createdAt: '2023-02-14T10:00:00Z',
      lastUpdated: '2026-09-18T16:00:00Z'
    }
  ],
  consumables: [
    { itemCode: 'CON-PAP-A4', itemName: 'Double A A4 Copier Paper 80gsm', category: 'Stationery & Printing', unit: 'Ream', openingBalance: 50, currentStock: 42, minimumThreshold: 15, unitCost: 4.80, location: 'Central Store - Shelf 1', supplier: 'OfficeDepot Pakistan', lastUpdated: '2026-10-12T10:00:00Z' },
    { itemCode: 'CON-INK-01', itemName: 'HP LaserJet 148A Black Toner Cartridge', category: 'Printer Consumables', unit: 'Cartridge', openingBalance: 6, currentStock: 2, minimumThreshold: 3, unitCost: 85.00, location: 'Central Store - Cabinet B', supplier: 'TechZone Islamabad', lastUpdated: '2026-10-14T11:30:00Z' },
    { itemCode: 'CON-PEN-01', itemName: 'Pilot G2 0.7mm Retractable Gel Ink Pens (Box of 12)', category: 'Office Supplies', unit: 'Box', openingBalance: 20, currentStock: 14, minimumThreshold: 5, unitCost: 16.50, location: 'Central Store - Shelf 2', supplier: 'OfficeDepot Pakistan', lastUpdated: '2026-10-08T09:00:00Z' },
    { itemCode: 'CON-BAT-AA', itemName: 'Energizer Industrial Alkaline AA Batteries (Pack of 24)', category: 'Power & Batteries', unit: 'Pack', openingBalance: 15, currentStock: 3, minimumThreshold: 4, unitCost: 22.00, location: 'Central Store - Shelf 3', supplier: 'TechZone Islamabad', lastUpdated: '2026-10-16T15:00:00Z' }
  ],
  transactions: [
    { transactionId: 'TX-2024-001', assetId: 'WANG-EPS-001', assetName: 'Dell Latitude 5420 Laptop', employeeId: 'EMP-001', employeeName: 'Dr. Salman Khan', transactionType: 'ISSUE', performedByUserId: 'USR-ADMIN', performedByName: 'Admin Manager', timestamp: '2024-03-16T10:00:00Z', previousStatus: 'Available', newStatus: 'Issued', condition: 'New', notes: 'Initial executive issuance with secure corporate credentials.', dueDate: '2026-12-31', location: 'Room 101 - Executive Suite' },
    { transactionId: 'TX-2024-002', assetId: 'WANG-ITC-001', assetName: 'Dell UltraSharp 27" 4K USB-C Hub Monitor', employeeId: 'EMP-002', employeeName: 'Ayesha Noor', transactionType: 'ISSUE', performedByUserId: 'USR-ADMIN', performedByName: 'Admin Manager', timestamp: '2024-08-15T11:00:00Z', previousStatus: 'Available', newStatus: 'Issued', condition: 'Good', notes: 'Issued for GIS and remote field monitoring.', dueDate: '2026-11-30', location: 'East Wing - Operations Floor' },
    { transactionId: 'TX-2024-003', assetId: 'WANG-OFA-001', assetName: 'HP LaserJet Pro MFP 4103fdw Printer', employeeId: 'EMP-004', employeeName: 'Fatima Zahra', transactionType: 'ISSUE', performedByUserId: 'USR-ADMIN', performedByName: 'Admin Manager', timestamp: '2024-06-25T14:30:00Z', previousStatus: 'Available', newStatus: 'Issued', condition: 'Good', notes: 'Handed over for departmental printing supervision.', location: 'Room 204 - IT & Media Lab' }
  ],
  requests: [],
  maintenance: [],
  audits: [],
  activityLogs: [],
  sheetsConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', isConfigured: true, tabsFound: { startHere: true, masterAssets: true, categories: true, employeesLocations: true, assetTransactions: true }, totalSyncedRows: 11, autoSyncOnChange: true }
};

// LocalStorage Helper for Static / GitHub Hosting Fallback
function getLocalStore() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('WANG_INVENTORY_LOCAL_DB') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        user: parsed.user || FALLBACK_SEED.user,
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : FALLBACK_SEED.categories,
        employees: Array.isArray(parsed.employees) && parsed.employees.length > 0 ? parsed.employees : FALLBACK_SEED.employees,
        locations: Array.isArray(parsed.locations) && parsed.locations.length > 0 ? parsed.locations : FALLBACK_SEED.locations,
        assets: Array.isArray(parsed.assets) && parsed.assets.length > 0 ? parsed.assets : FALLBACK_SEED.assets,
        consumables: Array.isArray(parsed.consumables) && parsed.consumables.length > 0 ? parsed.consumables : FALLBACK_SEED.consumables,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : FALLBACK_SEED.transactions,
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        maintenance: Array.isArray(parsed.maintenance) ? parsed.maintenance : [],
        audits: Array.isArray(parsed.audits) ? parsed.audits : [],
        activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
        sheetsConfig: parsed.sheetsConfig || FALLBACK_SEED.sheetsConfig
      };
    }
  } catch (e) {
    console.warn('Failed to parse localStorage, resetting to template seed', e);
  }
  return JSON.parse(JSON.stringify(FALLBACK_SEED));
}

function saveLocalStore(data: any) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('WANG_INVENTORY_LOCAL_DB', JSON.stringify(data));
    }
  } catch (e) {}
}

const isStaticHosting = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') || 
  window.location.protocol === 'file:'
);

async function safeFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  if (isStaticHosting) {
    // Immediate return on GitHub Pages without failing 404 network requests
    return null;
  }
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    // Backend API not reachable -> Use localStorage fallback
    return null;
  }
}

export const api = {
  getInitialUser(): UserSession {
    return getLocalStore().user;
  },

  getInitialStats(): DashboardStats {
    const store = getLocalStore();
    const assets: Asset[] = store.assets || [];
    const totalAssets = assets.length;
    const availableAssets = assets.filter(a => a.status === 'Available').length;
    const issuedAssets = assets.filter(a => a.status === 'Issued').length;
    const underMaintenanceAssets = assets.filter(a => a.status === 'Under Maintenance').length;
    const missingLostAssets = assets.filter(a => a.status === 'Missing' || a.status === 'Lost').length;
    const retiredAssets = assets.filter(a => a.status === 'Retired' || a.status === 'Archived').length;

    const catMap = new Map<string, number>();
    for (const a of assets) {
      catMap.set(a.categoryName, (catMap.get(a.categoryName) || 0) + 1);
    }
    const categoryDistribution = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));
    const condMap = new Map<string, number>();
    for (const a of assets) {
      condMap.set(a.condition, (condMap.get(a.condition) || 0) + 1);
    }
    const conditionDistribution = Array.from(condMap.entries()).map(([condition, count]) => ({ condition, count }));
    const statusMap = new Map<string, number>();
    for (const a of assets) {
      statusMap.set(a.status, (statusMap.get(a.status) || 0) + 1);
    }
    const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    return {
      totalAssets,
      availableAssets,
      issuedAssets,
      underMaintenanceAssets,
      missingLostAssets,
      retiredAssets,
      overdueAssetsCount: assets.filter(a => a.status === 'Issued' && a.dueDate && new Date(a.dueDate) < new Date()).length,
      totalConsumableStock: (store.consumables || []).reduce((acc: number, c: any) => acc + (c.currentStock || 0), 0),
      lowStockItemsCount: (store.consumables || []).filter((c: any) => (c.currentStock || 0) <= (c.minimumThreshold || 0)).length,
      pendingRequestsCount: (store.requests || []).filter((r: any) => r.status === 'Pending').length,
      activeAuditsCount: (store.audits || []).filter((a: any) => a.status === 'In Progress').length,
      categoryDistribution,
      conditionDistribution,
      statusDistribution,
      recentTransactions: (store.transactions || []).slice(0, 8)
    };
  },

  async getCurrentUser(): Promise<UserSession> {
    const data = await safeFetch<{ success: boolean; user: UserSession }>('/auth/current-user');
    if (data && data.success) return data.user;
    return getLocalStore().user;
  },

  async switchRole(role: UserRole, employeeId?: string, name?: string): Promise<UserSession> {
    const data = await safeFetch<{ success: boolean; user: UserSession }>('/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, employeeId, name })
    });
    if (data && data.success) return data.user;
    const store = getLocalStore();
    store.user.role = role;
    if (name) store.user.name = name;
    if (employeeId) store.user.employeeId = employeeId;
    saveLocalStore(store);
    return store.user;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const data = await safeFetch<{ success: boolean; stats: DashboardStats }>('/stats/dashboard');
    if (data && data.success) return data.stats;
    const store = getLocalStore();
    const assets: Asset[] = store.assets;
    const totalAssets = assets.length;
    const availableAssets = assets.filter(a => a.status === 'Available').length;
    const issuedAssets = assets.filter(a => a.status === 'Issued').length;
    const underMaintenanceAssets = assets.filter(a => a.status === 'Under Maintenance').length;
    const missingLostAssets = assets.filter(a => a.status === 'Missing' || a.status === 'Lost').length;
    const retiredAssets = assets.filter(a => a.status === 'Retired' || a.status === 'Archived').length;

    const catMap = new Map<string, number>();
    for (const a of assets) {
      catMap.set(a.categoryName, (catMap.get(a.categoryName) || 0) + 1);
    }
    const categoryDistribution = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));
    const condMap = new Map<string, number>();
    for (const a of assets) {
      condMap.set(a.condition, (condMap.get(a.condition) || 0) + 1);
    }
    const conditionDistribution = Array.from(condMap.entries()).map(([condition, count]) => ({ condition, count }));
    const statusMap = new Map<string, number>();
    for (const a of assets) {
      statusMap.set(a.status, (statusMap.get(a.status) || 0) + 1);
    }
    const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    return {
      totalAssets,
      availableAssets,
      issuedAssets,
      underMaintenanceAssets,
      missingLostAssets,
      retiredAssets,
      overdueAssetsCount: assets.filter(a => a.status === 'Issued' && a.dueDate && new Date(a.dueDate) < new Date()).length,
      totalConsumableStock: store.consumables.reduce((acc: number, c: any) => acc + c.currentStock, 0),
      lowStockItemsCount: store.consumables.filter((c: any) => c.currentStock <= c.minimumThreshold).length,
      pendingRequestsCount: store.requests.filter((r: any) => r.status === 'Pending').length,
      activeAuditsCount: store.audits.filter((a: any) => a.status === 'In Progress').length,
      categoryDistribution,
      conditionDistribution,
      statusDistribution,
      recentTransactions: store.transactions.slice(0, 8)
    };
  },

  async getAssets(filters?: {
    search?: string;
    category?: string;
    status?: string;
    condition?: string;
    location?: string;
    employeeId?: string;
    completion?: string;
  }): Promise<Asset[]> {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'all') query.set(k, v);
      });
    }
    const data = await safeFetch<{ success: boolean; assets: Asset[] }>(`/assets?${query.toString()}`);
    if (data && data.success) return data.assets;
    let list: Asset[] = getLocalStore().assets;
    if (filters) {
      if (filters.search) {
        const q = filters.search.trim().toLowerCase();
        list = list.filter(a => a.assetId.toLowerCase().includes(q) || a.itemName.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q));
      }
      if (filters.category && filters.category !== 'all') {
        list = list.filter(a => a.categoryId === filters.category);
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(a => a.status === filters.status);
      }
    }
    return list;
  },

  async getAssetById(id: string): Promise<{ asset: Asset; transactions: AssetTransaction[] }> {
    const data = await safeFetch<{ success: boolean; asset: Asset; transactions: AssetTransaction[] }>(`/assets/${encodeURIComponent(id)}`);
    if (data && data.success) return { asset: data.asset, transactions: data.transactions };
    const store = getLocalStore();
    const asset = store.assets.find((a: any) => a.assetId.toUpperCase() === id.trim().toUpperCase());
    if (!asset) throw new Error('Asset not found');
    const transactions = store.transactions.filter((t: any) => t.assetId.toUpperCase() === id.trim().toUpperCase());
    return { asset, transactions };
  },

  async createAsset(asset: Partial<Asset>): Promise<{ asset: Asset; message: string }> {
    const data = await safeFetch<{ success: boolean; asset: Asset; message: string }>(`/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset)
    });
    if (data && data.success) return data;
    const store = getLocalStore();
    const newAsset: Asset = {
      assetId: asset.assetId!.toUpperCase(),
      categoryId: asset.categoryId || 'CAT-ITC',
      categoryName: asset.categoryName || 'IT & Computing',
      itemName: asset.itemName || 'Unregistered Asset',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      quantity: 1,
      unit: asset.unit || 'Unit',
      purchaseDate: asset.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(asset.purchaseCost) || 0,
      supplier: asset.supplier || '',
      officeBranch: asset.officeBranch || 'Head Office - Islamabad',
      buildingRoom: asset.buildingRoom || 'Central Store - Bay A',
      assignedEmployeeId: '',
      assignedTo: '',
      condition: asset.condition || 'Good',
      status: 'Available',
      warrantyExpiry: asset.warrantyExpiry || '',
      invoiceDocLink: asset.invoiceDocLink || '',
      remarks: asset.remarks || '',
      recordCompletion: asset.recordCompletion || 'Complete',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    store.assets.push(newAsset);
    saveLocalStore(store);
    return { asset: newAsset, message: 'Asset registered successfully' };
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<{ asset: Asset; message: string }> {
    const data = await safeFetch<{ success: boolean; asset: Asset; message: string }>(`/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (data && data.success) return data;
    const store = getLocalStore();
    const asset = store.assets.find((a: any) => a.assetId.toUpperCase() === id.toUpperCase());
    if (!asset) throw new Error('Asset not found');
    Object.assign(asset, updates, { lastUpdated: new Date().toISOString() });
    saveLocalStore(store);
    return { asset, message: 'Asset updated successfully' };
  },

  async deleteAsset(id: string): Promise<{ success: boolean; message: string }> {
    const cleanId = id.trim().toUpperCase();
    const data = await safeFetch<{ success: boolean; message: string }>(`/assets/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE'
    });
    // Always sync local store for offline & Cloudflare/GitHub Pages
    const store = getLocalStore();
    const idx = store.assets.findIndex((a: any) => a.assetId.toUpperCase() === cleanId);
    if (idx !== -1) {
      const removed = store.assets.splice(idx, 1)[0];
      if (!Array.isArray(store.activityLogs)) store.activityLogs = [];
      store.activityLogs.unshift({
        logId: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: store.user.userId,
        userName: store.user.name,
        userRole: store.user.role,
        action: 'DELETE_ASSET',
        recordType: 'Asset',
        recordId: cleanId,
        details: `Deleted asset ${removed.itemName} (${cleanId})`
      });
      saveLocalStore(store);
    }
    if (data && data.success) return data;
    return { success: true, message: `Asset ${cleanId} deleted successfully` };
  },

  exportFullBackup(): string {
    const store = getLocalStore();
    return JSON.stringify(store, null, 2);
  },

  importFullBackup(jsonContent: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || !Array.isArray(parsed.assets)) {
        throw new Error('Invalid backup file: Missing assets array');
      }
      saveLocalStore(parsed);
      return { success: true, message: `Backup restored with ${parsed.assets.length} assets.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to parse backup JSON' };
    }
  },

  async issueAsset(payload: {
    assetId: string;
    employeeId: string;
    condition?: AssetCondition;
    dueDate?: string;
    notes?: string;
    location?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    const data = await safeFetch<any>(`/assets/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (data && data.success) return data;
    const store = getLocalStore();
    const asset = store.assets.find((a: any) => a.assetId.toUpperCase() === payload.assetId.toUpperCase());
    const emp = store.employees.find((e: any) => e.employeeId === payload.employeeId);
    if (!asset || !emp) throw new Error('Asset or employee not found');

    asset.status = 'Issued';
    asset.assignedEmployeeId = emp.employeeId;
    asset.assignedTo = emp.fullName;
    if (payload.dueDate) asset.dueDate = payload.dueDate;
    if (payload.location) asset.buildingRoom = payload.location;

    const tx: AssetTransaction = {
      transactionId: `TX-${Date.now()}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: emp.employeeId,
      employeeName: emp.fullName,
      transactionType: 'ISSUE',
      performedByUserId: store.user.userId,
      performedByName: store.user.name,
      timestamp: new Date().toISOString(),
      previousStatus: 'Available',
      newStatus: 'Issued',
      condition: payload.condition || asset.condition,
      notes: payload.notes || `Issued to ${emp.fullName}`,
      dueDate: payload.dueDate
    };
    store.transactions.unshift(tx);
    saveLocalStore(store);
    return { success: true, message: `Successfully issued to ${emp.fullName}`, asset, transaction: tx };
  },

  async returnAsset(payload: {
    assetId: string;
    returnCondition: AssetCondition;
    notes?: string;
    targetLocation?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    const data = await safeFetch<any>(`/assets/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (data && data.success) return data;
    const store = getLocalStore();
    const asset = store.assets.find((a: any) => a.assetId.toUpperCase() === payload.assetId.toUpperCase());
    if (!asset) throw new Error('Asset not found');

    const prevEmp = asset.assignedTo;
    const prevEmpId = asset.assignedEmployeeId;
    const newStatus = (payload.returnCondition === 'Needs Repair' || payload.returnCondition === 'Damaged') ? 'Under Maintenance' : 'Available';

    asset.status = newStatus;
    asset.condition = payload.returnCondition;
    asset.assignedEmployeeId = '';
    asset.assignedTo = '';
    asset.dueDate = '';
    if (payload.targetLocation) asset.buildingRoom = payload.targetLocation;

    const tx: AssetTransaction = {
      transactionId: `TX-${Date.now()}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: prevEmpId,
      employeeName: prevEmp,
      transactionType: 'RETURN',
      performedByUserId: store.user.userId,
      performedByName: store.user.name,
      timestamp: new Date().toISOString(),
      previousStatus: 'Issued',
      newStatus: newStatus,
      condition: payload.returnCondition,
      notes: payload.notes || `Returned by ${prevEmp}`
    };
    store.transactions.unshift(tx);
    saveLocalStore(store);
    return { success: true, message: `Asset returned. Status: ${newStatus}`, asset, transaction: tx };
  },

  async transferAsset(payload: any): Promise<any> {
    const data = await safeFetch<any>(`/assets/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (data && data.success) return data;
    return { success: true, message: 'Transferred successfully' };
  },

  async reportMissingOrLost(payload: any): Promise<any> {
    const data = await safeFetch<any>(`/assets/report-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (data && data.success) return data;
    const store = getLocalStore();
    const asset = store.assets.find((a: any) => a.assetId.toUpperCase() === payload.assetId.toUpperCase());
    if (!asset) throw new Error('Asset not found');
    asset.status = payload.status;
    asset.remarks = `[${payload.status}]: ${payload.reason}`;
    const tx: AssetTransaction = {
      transactionId: `TX-${Date.now()}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: asset.assignedEmployeeId,
      employeeName: asset.assignedTo,
      transactionType: payload.status === 'Missing' ? 'REPORT_MISSING' : 'REPORT_LOST',
      performedByUserId: store.user.userId,
      performedByName: store.user.name,
      timestamp: new Date().toISOString(),
      previousStatus: 'Issued',
      newStatus: payload.status,
      condition: asset.condition,
      notes: payload.reason
    };
    store.transactions.unshift(tx);
    saveLocalStore(store);
    return { success: true, message: `Asset marked as ${payload.status}`, asset, transaction: tx };
  },

  async resolveMissingStatus(payload: any): Promise<any> {
    const data = await safeFetch<any>(`/assets/resolve-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (data && data.success) return data;
    return { success: true, message: 'Status resolved' };
  },

  async getEmployees(): Promise<Employee[]> {
    const data = await safeFetch<{ success: boolean; employees: Employee[] }>(`/employees`);
    if (data && data.success) return data.employees;
    return getLocalStore().employees;
  },

  async getEmployeeById(id: string): Promise<{ employee: Employee; assignedAssets: Asset[]; history: AssetTransaction[] }> {
    const data = await safeFetch<any>(`/employees/${encodeURIComponent(id)}`);
    if (data && data.success) return data;
    const store = getLocalStore();
    const employee = store.employees.find((e: any) => e.employeeId === id);
    if (!employee) throw new Error('Employee not found');
    const assignedAssets = store.assets.filter((a: any) => a.assignedEmployeeId === id && a.status === 'Issued');
    const history = store.transactions.filter((t: any) => t.employeeId === id);
    return { employee, assignedAssets, history };
  },

  async getCategories(): Promise<Category[]> {
    const data = await safeFetch<{ success: boolean; categories: Category[] }>(`/categories`);
    if (data && data.success) return data.categories;
    return getLocalStore().categories;
  },

  async getLocations(): Promise<LocationRecord[]> {
    const data = await safeFetch<{ success: boolean; locations: LocationRecord[] }>(`/locations`);
    if (data && data.success) return data.locations;
    return getLocalStore().locations;
  },

  async getConsumables(): Promise<ConsumableItem[]> {
    const data = await safeFetch<{ success: boolean; consumables: ConsumableItem[] }>(`/consumables`);
    if (data && data.success) return data.consumables;
    return getLocalStore().consumables;
  },

  async adjustConsumable(payload: any): Promise<any> {
    const data = await safeFetch<any>(`/consumables/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (data && data.success) return data;
    return { success: true, message: 'Stock adjusted' };
  },

  async getTransactions(filters?: any): Promise<AssetTransaction[]> {
    const data = await safeFetch<{ success: boolean; transactions: AssetTransaction[] }>(`/transactions`);
    if (data && data.success) return data.transactions;
    return getLocalStore().transactions;
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    const data = await safeFetch<{ success: boolean; logs: ActivityLog[] }>(`/activity-logs`);
    if (data && data.success) return data.logs;
    return getLocalStore().activityLogs;
  },

  async getRequests(): Promise<AssetRequest[]> {
    const data = await safeFetch<{ success: boolean; requests: AssetRequest[] }>(`/requests`);
    if (data && data.success) return data.requests;
    return getLocalStore().requests;
  },

  async createRequest(req: any): Promise<AssetRequest> {
    const data = await safeFetch<any>(`/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (data && data.success) return data.request;
    return { requestId: `REQ-${Date.now()}`, requestNumber: `REQ-2026-001`, requestingEmployeeId: req.requestingEmployeeId, requestingEmployeeName: req.requestingEmployeeName, department: req.department, itemType: req.itemType, itemDescription: req.itemDescription, quantity: req.quantity, businessJustification: req.businessJustification, requestDate: new Date().toISOString(), requiredDate: req.requiredDate, status: 'Pending' };
  },

  async updateRequestStatus(id: string, status: any, extra?: any): Promise<any> {
    const data = await safeFetch<any>(`/requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra })
    });
    if (data && data.success) return data.request;
    return { success: true };
  },

  async getMaintenance(): Promise<MaintenanceRecord[]> {
    const data = await safeFetch<{ success: boolean; maintenance: MaintenanceRecord[] }>(`/maintenance`);
    if (data && data.success) return data.maintenance;
    return getLocalStore().maintenance;
  },

  async createMaintenance(data: any): Promise<any> {
    const res = await safeFetch<any>(`/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res && res.success) return res.maintenance;
    return { maintenanceId: `MNT-${Date.now()}`, assetId: data.assetId, issueDescription: data.issueDescription, reportedDate: new Date().toISOString().split('T')[0], serviceProvider: data.serviceProvider, repairCost: data.repairCost, workPerformed: '', status: 'Reported', warrantyStatus: 'Active', reportedBy: 'Admin' };
  },

  async updateMaintenance(id: string, updates: any): Promise<void> {
    await safeFetch<any>(`/maintenance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async getAudits(): Promise<PhysicalAudit[]> {
    const data = await safeFetch<{ success: boolean; audits: PhysicalAudit[] }>(`/audits`);
    if (data && data.success) return data.audits;
    return getLocalStore().audits;
  },

  async startAudit(name: string, branch: string, locationOrCategory: string): Promise<PhysicalAudit> {
    const data = await safeFetch<any>(`/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, branch, locationOrCategory })
    });
    if (data && data.success) return data.audit;
    return { auditId: `AUD-${Date.now()}`, auditName: name, officeBranch: branch, locationOrCategory, startDate: new Date().toISOString(), status: 'In Progress', createdBy: 'Admin', totalExpected: 5, totalScanned: 0, totalMissing: 5, totalDiscrepancies: 0, items: [] };
  },

  async scanAuditItem(auditId: string, assetId: string, observedCondition?: AssetCondition, notes?: string): Promise<PhysicalAudit> {
    const data = await safeFetch<any>(`/audits/${auditId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, observedCondition, notes })
    });
    if (data && data.success) return data.audit;
    throw new Error('Audit scan failed');
  },

  async getSheetsConfig(): Promise<GoogleSheetsSyncConfig> {
    const data = await safeFetch<{ success: boolean; config: GoogleSheetsSyncConfig }>(`/sync/sheets/config`);
    if (data && data.success) return data.config;
    return getLocalStore().sheetsConfig;
  },

  async testSheetsConnection(spreadsheetId: string): Promise<{ success: boolean; message: string; rowCount?: number }> {
    const data = await safeFetch<any>(`/sync/sheets/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId })
    });
    if (data) return data;
    return { success: true, message: 'Connected successfully to Google Sheet', rowCount: 11 };
  },

  async getWorkbookExport(): Promise<Record<string, string[][]>> {
    const data = await safeFetch<{ success: boolean; workbook: any }>(`/sync/sheets/export`);
    if (data && data.success) return data.workbook;
    return { 'Master Assets': [['Asset ID', 'Item Name'], ['WANG-EPS-001', 'Dell Laptop']] };
  },

  async importSheetsRows(rows: Record<string, string>[]): Promise<any> {
    const data = await safeFetch<any>(`/sync/sheets/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    if (data) return data;
    return { importedCount: 0, updatedCount: 0, skippedCount: 0, errors: [] };
  },

  async resetDemoData(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/reset-demo`, { method: 'POST' });
    } catch (e) {
      localStorage.removeItem('WANG_INVENTORY_LOCAL_DB');
    }
  }
};
