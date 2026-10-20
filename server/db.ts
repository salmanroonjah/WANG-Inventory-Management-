import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  Asset, 
  AssetTransaction, 
  Employee, 
  Category, 
  LocationRecord, 
  ConsumableItem, 
  AssetRequest, 
  MaintenanceRecord, 
  PhysicalAudit, 
  ActivityLog, 
  GoogleSheetsSyncConfig, 
  DashboardStats,
  AssetStatus,
  AssetCondition
} from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'wang_inventory_db.json');

export interface DatabaseSchema {
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
  sheetsConfig: GoogleSheetsSyncConfig;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const INITIAL_SEED: DatabaseSchema = {
  categories: [
    {
      categoryId: 'CAT-ELE',
      categoryName: 'Electrical & Power Systems',
      description: 'Generators, solar inverters, UPS backup units, power distribution, and electrical test tools',
      totalAssets: 3
    },
    {
      categoryId: 'CAT-IT',
      categoryName: 'IT & Computing Equipment',
      description: 'Laptops, desktop workstations, high-speed network switches, and enterprise routers',
      totalAssets: 4
    },
    {
      categoryId: 'CAT-FUR',
      categoryName: 'Office Furniture & Fixtures',
      description: 'Ergonomic chairs, conference tables, file storage cabinets, and partition workstations',
      totalAssets: 2
    },
    {
      categoryId: 'CAT-COM',
      categoryName: 'Media & Field Communications',
      description: 'Cameras, sound recording gear, satellite phones, and field radio transmitters',
      totalAssets: 2
    }
  ],
  employees: [
    {
      employeeId: 'EMP-001',
      fullName: 'Dr. Salman Khan',
      department: 'Executive Management',
      designation: 'Executive Director',
      email: 'salmankhanroonjha123@gmail.com',
      phone: '+92 300 8765432',
      officeBranch: 'Head Office - Islamabad',
      activeStatus: true,
      assignedAssetCount: 1
    },
    {
      employeeId: 'EMP-002',
      fullName: 'Ayesha Noor',
      department: 'Program Operations',
      designation: 'Senior Program Manager',
      email: 'ayesha.noor@wang.org.pk',
      phone: '+92 312 9876543',
      officeBranch: 'Head Office - Islamabad',
      activeStatus: true,
      assignedAssetCount: 1
    },
    {
      employeeId: 'EMP-003',
      fullName: 'Bilal Tariq',
      department: 'Finance & Compliance',
      designation: 'Finance & Accounts Officer',
      email: 'bilal.tariq@wang.org.pk',
      phone: '+92 333 4567890',
      officeBranch: 'Head Office - Islamabad',
      activeStatus: true,
      assignedAssetCount: 0
    },
    {
      employeeId: 'EMP-004',
      fullName: 'Fatima Zahra',
      department: 'IT & Communications',
      designation: 'Systems & Media Administrator',
      email: 'fatima.zahra@wang.org.pk',
      phone: '+92 345 6789012',
      officeBranch: 'Head Office - Islamabad',
      activeStatus: true,
      assignedAssetCount: 1
    },
    {
      employeeId: 'EMP-005',
      fullName: 'Tariq Mehmood',
      department: 'Logistics & Field Support',
      designation: 'Field Logistics Coordinator',
      email: 'tariq.mehmood@wang.org.pk',
      phone: '+92 321 3456789',
      officeBranch: 'Field Office - Quetta',
      activeStatus: true,
      assignedAssetCount: 0
    }
  ],
  locations: [
    {
      locationId: 'LOC-HO-101',
      officeBranch: 'Head Office - Islamabad',
      building: 'Main Administrative Block',
      floor: '1st Floor',
      room: 'Room 101 - Executive Suite',
      description: 'Executive Director and Board meeting room',
      isStore: false,
      assetCount: 1
    },
    {
      locationId: 'LOC-HO-204',
      officeBranch: 'Head Office - Islamabad',
      building: 'East Wing',
      floor: '2nd Floor',
      room: 'Room 204 - IT & Media Lab',
      description: 'IT infrastructure, server racks, and media editing',
      isStore: false,
      assetCount: 3
    },
    {
      locationId: 'LOC-HO-STR',
      officeBranch: 'Head Office - Islamabad',
      building: 'Ground Facility',
      floor: 'Ground',
      room: 'Central Store - Bay A',
      description: 'Primary storage for unissued equipment and consumables',
      isStore: true,
      assetCount: 5
    },
    {
      locationId: 'LOC-QTA-01',
      officeBranch: 'Field Office - Quetta',
      building: 'Provincial Office',
      floor: 'Ground',
      room: 'Operations Wing - Office 2',
      description: 'Balochistan community outreach and field operations hub',
      isStore: false,
      assetCount: 2
    }
  ],
  assets: [
    {
      assetId: 'WANG-ELE-001',
      categoryId: 'CAT-ELE',
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
      assetId: 'WANG-ELE-002',
      categoryId: 'CAT-ELE',
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
      assetId: 'WANG-ELE-003',
      categoryId: 'CAT-ELE',
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
      assetId: 'WANG-IT-001',
      categoryId: 'CAT-IT',
      categoryName: 'IT & Computing Equipment',
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
      assetId: 'WANG-IT-002',
      categoryId: 'CAT-IT',
      categoryName: 'IT & Computing Equipment',
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
      categoryName: 'Office Furniture & Fixtures',
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
      assetId: 'WANG-FUR-002',
      categoryId: 'CAT-FUR',
      categoryName: 'Office Furniture & Fixtures',
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
      assetId: 'WANG-COM-001',
      categoryId: 'CAT-COM',
      categoryName: 'Media & Field Communications',
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
      assetId: 'WANG-COM-002',
      categoryId: 'CAT-COM',
      categoryName: 'Media & Field Communications',
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
      assetId: 'WANG-ELE-004',
      categoryId: 'CAT-ELE',
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
      assetId: 'WANG-IT-003',
      categoryId: 'CAT-IT',
      categoryName: 'IT & Computing Equipment',
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
    {
      itemCode: 'CON-PAP-A4',
      itemName: 'Double A A4 Copier Paper 80gsm',
      category: 'Stationery & Printing',
      unit: 'Ream',
      openingBalance: 50,
      currentStock: 42,
      minimumThreshold: 15,
      unitCost: 4.80,
      location: 'Central Store - Shelf 1',
      supplier: 'OfficeDepot Pakistan',
      lastUpdated: '2026-10-12T10:00:00Z'
    },
    {
      itemCode: 'CON-INK-01',
      itemName: 'HP LaserJet 148A Black Toner Cartridge',
      category: 'Printer Consumables',
      unit: 'Cartridge',
      openingBalance: 6,
      currentStock: 2,
      minimumThreshold: 3,
      unitCost: 85.00,
      location: 'Central Store - Cabinet B',
      supplier: 'TechZone Islamabad',
      lastUpdated: '2026-10-14T11:30:00Z'
    },
    {
      itemCode: 'CON-PEN-01',
      itemName: 'Pilot G2 0.7mm Retractable Gel Ink Pens (Box of 12)',
      category: 'Office Supplies',
      unit: 'Box',
      openingBalance: 20,
      currentStock: 14,
      minimumThreshold: 5,
      unitCost: 16.50,
      location: 'Central Store - Shelf 2',
      supplier: 'OfficeDepot Pakistan',
      lastUpdated: '2026-10-08T09:00:00Z'
    },
    {
      itemCode: 'CON-BAT-AA',
      itemName: 'Energizer Industrial Alkaline AA Batteries (Pack of 24)',
      category: 'Power & Batteries',
      unit: 'Pack',
      openingBalance: 15,
      currentStock: 3,
      minimumThreshold: 4,
      unitCost: 22.00,
      location: 'Central Store - Shelf 3',
      supplier: 'TechZone Islamabad',
      lastUpdated: '2026-10-16T15:00:00Z'
    }
  ],
  transactions: [
    {
      transactionId: 'TX-2024-001',
      assetId: 'WANG-ELE-001',
      assetName: 'Dell Latitude 5420 Laptop',
      employeeId: 'EMP-001',
      employeeName: 'Dr. Salman Khan',
      transactionType: 'ISSUE',
      performedByUserId: 'USR-ADMIN',
      performedByName: 'Admin Manager',
      timestamp: '2024-03-16T10:00:00Z',
      previousStatus: 'Available',
      newStatus: 'Issued',
      condition: 'New',
      notes: 'Initial executive issuance with secure corporate credentials.',
      dueDate: '2026-12-31',
      location: 'Room 101 - Executive Suite'
    },
    {
      transactionId: 'TX-2024-002',
      assetId: 'WANG-IT-002',
      assetName: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      employeeId: 'EMP-002',
      employeeName: 'Ayesha Noor',
      transactionType: 'ISSUE',
      performedByUserId: 'USR-ADMIN',
      performedByName: 'Admin Manager',
      timestamp: '2024-08-15T11:00:00Z',
      previousStatus: 'Available',
      newStatus: 'Issued',
      condition: 'Good',
      notes: 'Issued for GIS and remote field monitoring.',
      dueDate: '2026-11-30',
      location: 'East Wing - Operations Floor'
    },
    {
      transactionId: 'TX-2024-003',
      assetId: 'WANG-IT-001',
      assetName: 'HP LaserJet Pro MFP 4103fdw Printer',
      employeeId: 'EMP-004',
      employeeName: 'Fatima Zahra',
      transactionType: 'ISSUE',
      performedByUserId: 'USR-ADMIN',
      performedByName: 'Admin Manager',
      timestamp: '2024-06-25T14:30:00Z',
      previousStatus: 'Available',
      newStatus: 'Issued',
      condition: 'Good',
      notes: 'Handed over for departmental printing supervision.',
      location: 'Room 204 - IT & Media Lab'
    }
  ],
  requests: [
    {
      requestId: 'REQ-101',
      requestNumber: 'REQ-2026-0042',
      requestingEmployeeId: 'EMP-003',
      requestingEmployeeName: 'Bilal Tariq',
      department: 'Finance & Compliance',
      itemType: 'Fixed Asset',
      itemDescription: 'Ergonomic Wireless Mouse for financial audit spreadsheet work',
      quantity: 1,
      businessJustification: 'Current peripheral is erratic; needed for Q3 donor financial reconciliation.',
      requestDate: '2026-10-17T09:00:00Z',
      requiredDate: '2026-10-22',
      status: 'Approved',
      approverId: 'USR-ADMIN',
      approverName: 'Admin Manager',
      decisionDate: '2026-10-18T10:00:00Z',
      fulfilledAssetId: ''
    },
    {
      requestId: 'REQ-102',
      requestNumber: 'REQ-2026-0043',
      requestingEmployeeId: 'EMP-005',
      requestingEmployeeName: 'Tariq Mehmood',
      department: 'Logistics & Field Support',
      itemType: 'Consumable',
      itemDescription: 'A4 Copier Paper - 4 Reams for field community center distribution vouchers',
      quantity: 4,
      businessJustification: 'Field printing of registration forms in Pishin district.',
      requestDate: '2026-10-18T14:20:00Z',
      requiredDate: '2026-10-24',
      status: 'Pending'
    }
  ],
  maintenance: [
    {
      maintenanceId: 'MNT-2026-01',
      assetId: 'WANG-ELE-004',
      assetName: 'Yamaha EF2000iS Inverter Generator 2kVA',
      issueDescription: 'Engine turns over but stalls under 50% electrical load.',
      reportedDate: '2026-10-15',
      serviceProvider: 'PowerCare Engineering Islamabad',
      repairCost: 120,
      workPerformed: 'Carburetor jet overhaul and stator electrical test.',
      status: 'In Progress',
      warrantyStatus: 'Expired (Out-of-warranty servicing)',
      reportedBy: 'Tariq Mehmood'
    }
  ],
  audits: [
    {
      auditId: 'AUD-2026-Q3',
      auditName: 'Q3 2026 Head Office Physical Asset Audit',
      officeBranch: 'Head Office - Islamabad',
      locationOrCategory: 'All Categories',
      startDate: '2026-09-25T09:00:00Z',
      endDate: '2026-09-27T17:00:00Z',
      status: 'Approved',
      createdBy: 'Fatima Zahra',
      totalExpected: 9,
      totalScanned: 9,
      totalMissing: 0,
      totalDiscrepancies: 0,
      items: []
    }
  ],
  activityLogs: [
    {
      logId: 'LOG-001',
      userId: 'SYSTEM',
      userName: 'WANG System Core',
      userRole: 'Super Admin',
      action: 'SYSTEM_BOOT',
      recordType: 'SheetsSync',
      recordId: 'WANG-SYNC-001',
      timestamp: '2026-10-19T05:00:00Z',
      details: 'WANG Inventory Database initialized with verified Asset IDs.'
    }
  ],
  sheetsConfig: {
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Example standard template ID
    isConfigured: true,
    lastSyncTimestamp: '2026-10-19T05:30:00Z',
    lastSyncStatus: 'Success',
    tabsFound: {
      startHere: true,
      masterAssets: true,
      categories: true,
      employeesLocations: true,
      assetTransactions: true
    },
    totalSyncedRows: 11,
    autoSyncOnChange: true
  }
};

class Database {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Ensure all required fields exist
        return {
          ...INITIAL_SEED,
          ...parsed,
          assets: parsed.assets || INITIAL_SEED.assets,
          employees: parsed.employees || INITIAL_SEED.employees,
          categories: parsed.categories || INITIAL_SEED.categories,
          locations: parsed.locations || INITIAL_SEED.locations,
          consumables: parsed.consumables || INITIAL_SEED.consumables,
          transactions: parsed.transactions || INITIAL_SEED.transactions,
          requests: parsed.requests || INITIAL_SEED.requests,
          maintenance: parsed.maintenance || INITIAL_SEED.maintenance,
          audits: parsed.audits || INITIAL_SEED.audits,
          activityLogs: parsed.activityLogs || INITIAL_SEED.activityLogs,
          sheetsConfig: { ...INITIAL_SEED.sheetsConfig, ...(parsed.sheetsConfig || {}) }
        };
      }
    } catch (err) {
      console.error('[DB] Failed to load data from file, falling back to seed:', err);
    }
    // Save initial seed to file
    this.saveData(INITIAL_SEED);
    return JSON.parse(JSON.stringify(INITIAL_SEED));
  }

  private saveData(dataToSave?: DatabaseSchema): void {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      const data = dataToSave || this.data;
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Error atomically writing database:', err);
    } finally {
      this.isWriting = false;
    }
  }

  // --- Read Operations ---
  public getAssets(filters?: { 
    search?: string; 
    category?: string; 
    status?: string; 
    condition?: string;
    location?: string;
    employeeId?: string;
    completion?: string;
  }): Asset[] {
    let list = [...this.data.assets];

    if (!filters) return list;

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(a => 
        a.assetId.toLowerCase().includes(q) ||
        a.itemName.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        a.assignedTo.toLowerCase().includes(q)
      );
    }

    if (filters.category && filters.category !== 'all') {
      list = list.filter(a => a.categoryId === filters.category || a.categoryName === filters.category);
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter(a => a.status === filters.status);
    }

    if (filters.condition && filters.condition !== 'all') {
      list = list.filter(a => a.condition === filters.condition);
    }

    if (filters.location && filters.location !== 'all') {
      const locFilter = filters.location;
      list = list.filter(a => a.officeBranch === locFilter || (Boolean(a.buildingRoom) && a.buildingRoom.includes(locFilter)));
    }

    if (filters.employeeId && filters.employeeId !== 'all') {
      list = list.filter(a => a.assignedEmployeeId === filters.employeeId);
    }

    if (filters.completion && filters.completion !== 'all') {
      list = list.filter(a => a.recordCompletion === filters.completion);
    }

    return list;
  }

  public getAssetById(assetId: string): Asset | undefined {
    const normalized = assetId.trim().toUpperCase();
    return this.data.assets.find(a => a.assetId.toUpperCase() === normalized);
  }

  public getEmployees(): Employee[] {
    // Recalculate assigned asset count
    return this.data.employees.map(emp => {
      const count = this.data.assets.filter(a => a.assignedEmployeeId === emp.employeeId && a.status === 'Issued').length;
      return { ...emp, assignedAssetCount: count };
    });
  }

  public getEmployeeById(employeeId: string): Employee | undefined {
    return this.data.employees.find(e => e.employeeId === employeeId);
  }

  public getCategories(): Category[] {
    return this.data.categories.map(cat => {
      const count = this.data.assets.filter(a => a.categoryId === cat.categoryId).length;
      return { ...cat, totalAssets: count };
    });
  }

  public getLocations(): LocationRecord[] {
    return this.data.locations.map(loc => {
      const count = this.data.assets.filter(a => a.officeBranch === loc.officeBranch && a.buildingRoom.includes(loc.room)).length;
      return { ...loc, assetCount: count };
    });
  }

  public getConsumables(): ConsumableItem[] {
    return [...this.data.consumables];
  }

  public getTransactions(filters?: { assetId?: string; employeeId?: string; type?: string }): AssetTransaction[] {
    let list = [...this.data.transactions];
    if (filters?.assetId) {
      const normalized = filters.assetId.trim().toUpperCase();
      list = list.filter(t => t.assetId.toUpperCase() === normalized);
    }
    if (filters?.employeeId) {
      list = list.filter(t => t.employeeId === filters.employeeId);
    }
    if (filters?.type && filters.type !== 'all') {
      list = list.filter(t => t.transactionType === filters.type);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getRequests(): AssetRequest[] {
    return [...this.data.requests].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }

  public getMaintenance(): MaintenanceRecord[] {
    return [...this.data.maintenance].sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());
  }

  public getAudits(): PhysicalAudit[] {
    return [...this.data.audits];
  }

  public getActivityLogs(): ActivityLog[] {
    return [...this.data.activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getSheetsConfig(): GoogleSheetsSyncConfig {
    return { ...this.data.sheetsConfig };
  }

  public getDashboardStats(): DashboardStats {
    const totalAssets = this.data.assets.length;
    const availableAssets = this.data.assets.filter(a => a.status === 'Available').length;
    const issuedAssets = this.data.assets.filter(a => a.status === 'Issued').length;
    const underMaintenanceAssets = this.data.assets.filter(a => a.status === 'Under Maintenance').length;
    const missingLostAssets = this.data.assets.filter(a => a.status === 'Missing' || a.status === 'Lost').length;
    const retiredAssets = this.data.assets.filter(a => a.status === 'Retired' || a.status === 'Archived').length;

    const now = new Date();
    const overdueAssetsCount = this.data.assets.filter(a => {
      if (a.status !== 'Issued' || !a.dueDate) return false;
      return new Date(a.dueDate) < now;
    }).length;

    const totalConsumableStock = this.data.consumables.reduce((acc, c) => acc + c.currentStock, 0);
    const lowStockItemsCount = this.data.consumables.filter(c => c.currentStock <= c.minimumThreshold).length;
    const pendingRequestsCount = this.data.requests.filter(r => r.status === 'Pending').length;
    const activeAuditsCount = this.data.audits.filter(aud => aud.status === 'In Progress').length;

    // Categories distribution
    const catMap = new Map<string, number>();
    for (const a of this.data.assets) {
      const name = a.categoryName || 'Other';
      catMap.set(name, (catMap.get(name) || 0) + 1);
    }
    const categoryDistribution = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));

    // Condition distribution
    const condMap = new Map<string, number>();
    for (const a of this.data.assets) {
      const cond = a.condition || 'Good';
      condMap.set(cond, (condMap.get(cond) || 0) + 1);
    }
    const conditionDistribution = Array.from(condMap.entries()).map(([condition, count]) => ({ condition, count }));

    // Status distribution
    const statMap = new Map<string, number>();
    for (const a of this.data.assets) {
      statMap.set(a.status, (statMap.get(a.status) || 0) + 1);
    }
    const statusDistribution = Array.from(statMap.entries()).map(([status, count]) => ({ status, count }));

    return {
      totalAssets,
      availableAssets,
      issuedAssets,
      underMaintenanceAssets,
      missingLostAssets,
      retiredAssets,
      overdueAssetsCount,
      totalConsumableStock,
      lowStockItemsCount,
      pendingRequestsCount,
      activeAuditsCount,
      categoryDistribution,
      conditionDistribution,
      statusDistribution,
      recentTransactions: this.getTransactions().slice(0, 8)
    };
  }

  // --- Transactional Core Workflows ---

  /**
   * ISSUE ASSET (Atomic Operation)
   * 1. Validates asset is Available
   * 2. Validates receiving employee exists
   * 3. Sets status to Issued, updates assignedEmployeeId and assignedTo
   * 4. Logs immutable transaction & activity log
   */
  public issueAsset(params: {
    assetId: string;
    employeeId: string;
    condition?: AssetCondition;
    dueDate?: string;
    notes?: string;
    performedByUserId: string;
    performedByName: string;
    location?: string;
  }): { success: boolean; message: string; asset?: Asset; transaction?: AssetTransaction } {
    const asset = this.getAssetById(params.assetId);
    if (!asset) {
      return { success: false, message: `Asset "${params.assetId}" does not exist in inventory.` };
    }

    if (asset.status !== 'Available') {
      return { 
        success: false, 
        message: `Cannot issue asset: Current status is "${asset.status}". It must be "Available" to issue. (Assigned to: ${asset.assignedTo || 'N/A'})` 
      };
    }

    const employee = this.getEmployeeById(params.employeeId);
    if (!employee) {
      return { success: false, message: `Employee ID "${params.employeeId}" not found in employee register.` };
    }

    const now = new Date().toISOString();
    const previousStatus = asset.status;
    const finalCondition = params.condition || asset.condition;

    // Mutate asset record
    asset.status = 'Issued';
    asset.assignedEmployeeId = employee.employeeId;
    asset.assignedTo = employee.fullName;
    asset.condition = finalCondition;
    asset.dueDate = params.dueDate || '';
    if (params.location) {
      asset.buildingRoom = params.location;
    }
    asset.lastUpdated = now;

    // Create immutable transaction
    const transaction: AssetTransaction = {
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      transactionType: 'ISSUE',
      performedByUserId: params.performedByUserId,
      performedByName: params.performedByName,
      timestamp: now,
      previousStatus: previousStatus,
      newStatus: 'Issued',
      condition: finalCondition,
      notes: params.notes || `Asset issued to ${employee.fullName} (${employee.employeeId})`,
      dueDate: params.dueDate,
      location: asset.buildingRoom
    };

    this.data.transactions.unshift(transaction);

    // Activity log
    this.logActivity({
      userId: params.performedByUserId,
      userName: params.performedByName,
      userRole: 'Inventory Manager',
      action: 'ISSUE_ASSET',
      recordType: 'Asset',
      recordId: asset.assetId,
      details: `Issued ${asset.itemName} (${asset.assetId}) to ${employee.fullName}. Condition: ${finalCondition}. Due: ${params.dueDate || 'Open'}`
    });

    this.saveData();
    return { success: true, message: `Asset ${asset.assetId} successfully issued to ${employee.fullName}.`, asset, transaction };
  }

  /**
   * RETURN ASSET (Atomic Operation)
   * 1. Validates asset is currently Issued
   * 2. Records return condition (Good -> Available, Needs Repair/Damaged -> Under Maintenance)
   * 3. Clears assignment
   * 4. Logs immutable transaction & activity log
   */
  public returnAsset(params: {
    assetId: string;
    returnCondition: AssetCondition;
    notes?: string;
    performedByUserId: string;
    performedByName: string;
    targetLocation?: string;
  }): { success: boolean; message: string; asset?: Asset; transaction?: AssetTransaction } {
    const asset = this.getAssetById(params.assetId);
    if (!asset) {
      return { success: false, message: `Asset "${params.assetId}" does not exist in inventory.` };
    }

    if (asset.status !== 'Issued') {
      return { 
        success: false, 
        message: `Asset "${asset.assetId}" is not currently Issued (Current status: ${asset.status}).` 
      };
    }

    const previousEmployeeId = asset.assignedEmployeeId;
    const previousEmployeeName = asset.assignedTo;
    const previousStatus = asset.status;
    const now = new Date().toISOString();

    // Determine target status based on condition
    let newStatus: AssetStatus = 'Available';
    if (params.returnCondition === 'Needs Repair' || params.returnCondition === 'Damaged') {
      newStatus = 'Under Maintenance';
    }

    // Mutate asset record
    asset.status = newStatus;
    asset.condition = params.returnCondition;
    asset.assignedEmployeeId = '';
    asset.assignedTo = '';
    asset.dueDate = '';
    if (params.targetLocation) {
      asset.buildingRoom = params.targetLocation;
    }
    asset.lastUpdated = now;

    // Create immutable transaction
    const transaction: AssetTransaction = {
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: previousEmployeeId,
      employeeName: previousEmployeeName,
      transactionType: 'RETURN',
      performedByUserId: params.performedByUserId,
      performedByName: params.performedByName,
      timestamp: now,
      previousStatus: previousStatus,
      newStatus: newStatus,
      condition: params.returnCondition,
      notes: params.notes || `Returned by ${previousEmployeeName}. Condition assessed: ${params.returnCondition}`,
      location: asset.buildingRoom
    };

    this.data.transactions.unshift(transaction);

    // If item needs repair, create an automatic maintenance notice record
    if (newStatus === 'Under Maintenance') {
      this.data.maintenance.unshift({
        maintenanceId: `MNT-${Date.now()}`,
        assetId: asset.assetId,
        assetName: asset.itemName,
        issueDescription: `Item returned in ${params.returnCondition} condition. Return remarks: ${params.notes || 'None'}`,
        reportedDate: now.split('T')[0],
        serviceProvider: 'Pending Inspection',
        repairCost: 0,
        workPerformed: 'Initial return inspection required',
        status: 'Reported',
        warrantyStatus: asset.warrantyExpiry ? `Warranty expires ${asset.warrantyExpiry}` : 'Check invoice',
        reportedBy: params.performedByName
      });
    }

    // Activity log
    this.logActivity({
      userId: params.performedByUserId,
      userName: params.performedByName,
      userRole: 'Inventory Manager',
      action: 'RETURN_ASSET',
      recordType: 'Asset',
      recordId: asset.assetId,
      details: `Returned from ${previousEmployeeName}. Status: ${newStatus}, Condition: ${params.returnCondition}`
    });

    this.saveData();
    return { 
      success: true, 
      message: `Asset ${asset.assetId} successfully returned. Status updated to "${newStatus}".`, 
      asset, 
      transaction 
    };
  }

  /**
   * REPORT MISSING OR LOST (Atomic Operation)
   * Requires mandatory reason, authorization, and updates status
   */
  public reportMissingOrLost(params: {
    assetId: string;
    status: 'Missing' | 'Lost';
    reason: string;
    performedByUserId: string;
    performedByName: string;
  }): { success: boolean; message: string; asset?: Asset; transaction?: AssetTransaction } {
    const asset = this.getAssetById(params.assetId);
    if (!asset) {
      return { success: false, message: `Asset "${params.assetId}" does not exist.` };
    }

    if (!params.reason || params.reason.trim().length < 5) {
      return { success: false, message: 'A detailed reason (minimum 5 characters) is required to report an asset missing or lost.' };
    }

    const previousStatus = asset.status;
    const now = new Date().toISOString();

    asset.status = params.status;
    asset.remarks = `[REPORTED ${params.status.toUpperCase()} on ${now.split('T')[0]} by ${params.performedByName}]: ${params.reason}. Previous Remarks: ${asset.remarks}`;
    asset.lastUpdated = now;

    const transaction: AssetTransaction = {
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: asset.assignedEmployeeId,
      employeeName: asset.assignedTo,
      transactionType: params.status === 'Missing' ? 'REPORT_MISSING' : 'REPORT_LOST',
      performedByUserId: params.performedByUserId,
      performedByName: params.performedByName,
      timestamp: now,
      previousStatus: previousStatus,
      newStatus: params.status,
      condition: asset.condition,
      notes: `Asset reported ${params.status}. Reason: ${params.reason}`,
      location: asset.buildingRoom
    };

    this.data.transactions.unshift(transaction);

    this.logActivity({
      userId: params.performedByUserId,
      userName: params.performedByName,
      userRole: 'Super Admin',
      action: params.status === 'Missing' ? 'REPORT_MISSING' : 'REPORT_LOST',
      recordType: 'Asset',
      recordId: asset.assetId,
      details: `Asset ${asset.assetId} reported as ${params.status}. Reason: ${params.reason}`
    });

    this.saveData();
    return { success: true, message: `Asset ${asset.assetId} marked as ${params.status}.`, asset, transaction };
  }

  /**
   * RESOLVE MISSING / LOST STATUS
   */
  public resolveMissingStatus(params: {
    assetId: string;
    newStatus: 'Available' | 'Under Maintenance';
    condition: AssetCondition;
    resolutionNotes: string;
    location?: string;
    performedByUserId: string;
    performedByName: string;
  }): { success: boolean; message: string; asset?: Asset; transaction?: AssetTransaction } {
    const asset = this.getAssetById(params.assetId);
    if (!asset) {
      return { success: false, message: `Asset "${params.assetId}" does not exist.` };
    }

    if (asset.status !== 'Missing' && asset.status !== 'Lost') {
      return { success: false, message: `Asset "${asset.assetId}" is not currently marked Missing or Lost.` };
    }

    const previousStatus = asset.status;
    const now = new Date().toISOString();

    asset.status = params.newStatus;
    asset.condition = params.condition;
    asset.assignedEmployeeId = '';
    asset.assignedTo = '';
    if (params.location) asset.buildingRoom = params.location;
    asset.remarks = `[RESOLVED ${previousStatus} on ${now.split('T')[0]}]: ${params.resolutionNotes}. Prior: ${asset.remarks}`;
    asset.lastUpdated = now;

    const transaction: AssetTransaction = {
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: '',
      employeeName: '',
      transactionType: 'RESOLVE_MISSING',
      performedByUserId: params.performedByUserId,
      performedByName: params.performedByName,
      timestamp: now,
      previousStatus: previousStatus,
      newStatus: params.newStatus,
      condition: params.condition,
      notes: `Status resolved from ${previousStatus} to ${params.newStatus}. Notes: ${params.resolutionNotes}`,
      location: asset.buildingRoom
    };

    this.data.transactions.unshift(transaction);
    this.logActivity({
      userId: params.performedByUserId,
      userName: params.performedByName,
      userRole: 'Super Admin',
      action: 'RESOLVE_MISSING',
      recordType: 'Asset',
      recordId: asset.assetId,
      details: `Asset ${asset.assetId} recovered/resolved from ${previousStatus} to ${params.newStatus}.`
    });

    this.saveData();
    return { success: true, message: `Asset ${asset.assetId} recovered and marked ${params.newStatus}.`, asset, transaction };
  }

  /**
   * TRANSFER ASSET (Between employees or locations)
   */
  public transferAsset(params: {
    assetId: string;
    newEmployeeId?: string;
    newLocation?: string;
    notes?: string;
    performedByUserId: string;
    performedByName: string;
  }): { success: boolean; message: string; asset?: Asset; transaction?: AssetTransaction } {
    const asset = this.getAssetById(params.assetId);
    if (!asset) return { success: false, message: 'Asset not found.' };

    const now = new Date().toISOString();
    let newEmpName = asset.assignedTo;
    if (params.newEmployeeId) {
      const emp = this.getEmployeeById(params.newEmployeeId);
      if (emp) {
        asset.assignedEmployeeId = emp.employeeId;
        asset.assignedTo = emp.fullName;
        newEmpName = emp.fullName;
      }
    }

    if (params.newLocation) {
      asset.buildingRoom = params.newLocation;
    }
    asset.lastUpdated = now;

    const transaction: AssetTransaction = {
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: asset.assetId,
      assetName: asset.itemName,
      employeeId: asset.assignedEmployeeId,
      employeeName: newEmpName,
      transactionType: 'TRANSFER',
      performedByUserId: params.performedByUserId,
      performedByName: params.performedByName,
      timestamp: now,
      previousStatus: asset.status,
      newStatus: asset.status,
      condition: asset.condition,
      notes: params.notes || `Transferred to ${newEmpName} / ${asset.buildingRoom}`,
      location: asset.buildingRoom
    };

    this.data.transactions.unshift(transaction);
    this.logActivity({
      userId: params.performedByUserId,
      userName: params.performedByName,
      userRole: 'Inventory Manager',
      action: 'TRANSFER_ASSET',
      recordType: 'Asset',
      recordId: asset.assetId,
      details: `Asset ${asset.assetId} transferred to ${newEmpName} at ${asset.buildingRoom}`
    });

    this.saveData();
    return { success: true, message: `Asset ${asset.assetId} transfer recorded.`, asset, transaction };
  }

  /**
   * CREATE OR REGISTER NEW ASSET
   * Preserves exact Asset ID. Rejects duplicates.
   */
  public createAsset(asset: Partial<Asset>, performedBy: { userId: string; name: string }): { success: boolean; message: string; asset?: Asset } {
    if (!asset.assetId || !asset.assetId.trim()) {
      return { success: false, message: 'Asset ID is mandatory.' };
    }

    const cleanId = asset.assetId.trim().toUpperCase();
    const existing = this.getAssetById(cleanId);
    if (existing) {
      return { success: false, message: `An asset with Asset ID "${cleanId}" already exists.` };
    }

    const now = new Date().toISOString();
    const newAsset: Asset = {
      assetId: cleanId,
      categoryId: asset.categoryId || 'CAT-IT',
      categoryName: asset.categoryName || 'IT & Computing Equipment',
      itemName: asset.itemName || 'Unregistered Asset',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      quantity: 1,
      unit: asset.unit || 'Unit',
      purchaseDate: asset.purchaseDate || now.split('T')[0],
      purchaseCost: Number(asset.purchaseCost) || 0,
      supplier: asset.supplier || '',
      officeBranch: asset.officeBranch || 'Head Office - Islamabad',
      buildingRoom: asset.buildingRoom || 'Central Store - Bay A',
      assignedEmployeeId: asset.assignedEmployeeId || '',
      assignedTo: asset.assignedTo || '',
      condition: asset.condition || 'Good',
      status: asset.status || 'Available',
      warrantyExpiry: asset.warrantyExpiry || '',
      invoiceDocLink: asset.invoiceDocLink || '',
      remarks: asset.remarks || '',
      recordCompletion: asset.recordCompletion || 'Partial',
      createdAt: now,
      lastUpdated: now,
      dueDate: asset.dueDate || ''
    };

    this.data.assets.push(newAsset);

    this.data.transactions.unshift({
      transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assetId: newAsset.assetId,
      assetName: newAsset.itemName,
      employeeId: newAsset.assignedEmployeeId,
      employeeName: newAsset.assignedTo,
      transactionType: 'INITIAL_IMPORT',
      performedByUserId: performedBy.userId,
      performedByName: performedBy.name,
      timestamp: now,
      previousStatus: 'Available',
      newStatus: newAsset.status,
      condition: newAsset.condition,
      notes: 'Asset registered in system.',
      location: newAsset.buildingRoom
    });

    this.logActivity({
      userId: performedBy.userId,
      userName: performedBy.name,
      userRole: 'Inventory Manager',
      action: 'REGISTER_ASSET',
      recordType: 'Asset',
      recordId: newAsset.assetId,
      details: `New asset registered: ${newAsset.itemName} (${newAsset.assetId})`
    });

    this.saveData();
    return { success: true, message: `Asset ${newAsset.assetId} successfully registered.`, asset: newAsset };
  }

  /**
   * UPDATE ASSET DETAILS
   */
  public updateAsset(assetId: string, updates: Partial<Asset>, performedBy: { userId: string; name: string }): { success: boolean; message: string; asset?: Asset } {
    const asset = this.getAssetById(assetId);
    if (!asset) {
      return { success: false, message: `Asset "${assetId}" not found.` };
    }

    const previousCondition = asset.condition;
    const previousStatus = asset.status;
    const now = new Date().toISOString();

    // Prevent changing Asset ID
    delete (updates as Record<string, unknown>).assetId;

    Object.assign(asset, updates, { lastUpdated: now });

    // If condition changed, log condition transaction
    if (updates.condition && updates.condition !== previousCondition) {
      this.data.transactions.unshift({
        transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        assetId: asset.assetId,
        assetName: asset.itemName,
        employeeId: asset.assignedEmployeeId,
        employeeName: asset.assignedTo,
        transactionType: 'CONDITION_CHANGE',
        performedByUserId: performedBy.userId,
        performedByName: performedBy.name,
        timestamp: now,
        previousStatus: previousStatus,
        newStatus: asset.status,
        condition: asset.condition,
        notes: `Condition updated from ${previousCondition} to ${asset.condition}`,
        location: asset.buildingRoom
      });
    }

    this.logActivity({
      userId: performedBy.userId,
      userName: performedBy.name,
      userRole: 'Inventory Manager',
      action: 'UPDATE_ASSET',
      recordType: 'Asset',
      recordId: asset.assetId,
      details: `Updated details for ${asset.itemName} (${asset.assetId})`
    });

    this.saveData();
    return { success: true, message: `Asset ${asset.assetId} updated.`, asset };
  }

  // --- Consumables Transactions ---
  public adjustConsumableStock(params: {
    itemCode: string;
    deltaQty: number; // positive for restock, negative for issuance
    reason: string;
    employeeId?: string;
    performedByUserId: string;
    performedByName: string;
  }): { success: boolean; message: string; item?: ConsumableItem } {
    const item = this.data.consumables.find(c => c.itemCode === params.itemCode);
    if (!item) return { success: false, message: `Consumable ${params.itemCode} not found.` };

    const newStock = item.currentStock + params.deltaQty;
    if (newStock < 0) {
      return { success: false, message: `Insufficient stock! Current: ${item.currentStock}, Requested change: ${params.deltaQty}` };
    }

    item.currentStock = newStock;
    item.lastUpdated = new Date().toISOString();

    this.logActivity({
      userId: params.performedByUserId,
      userName: params.performedByName,
      userRole: 'Inventory Manager',
      action: params.deltaQty > 0 ? 'RESTOCK_CONSUMABLE' : 'ISSUE_CONSUMABLE',
      recordType: 'Consumable',
      recordId: item.itemCode,
      details: `Stock adjustment of ${params.deltaQty} ${item.unit}(s) for ${item.itemName}. New balance: ${newStock}. Reason: ${params.reason}`
    });

    this.saveData();
    return { success: true, message: `Stock updated for ${item.itemName}. New balance: ${newStock} ${item.unit}(s).`, item };
  }

  // --- Requests Management ---
  public createRequest(request: Partial<AssetRequest>): { success: boolean; message: string; request?: AssetRequest } {
    const now = new Date().toISOString();
    const newReq: AssetRequest = {
      requestId: `REQ-${Date.now()}`,
      requestNumber: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requestingEmployeeId: request.requestingEmployeeId || 'EMP-001',
      requestingEmployeeName: request.requestingEmployeeName || 'Dr. Salman Khan',
      department: request.department || 'Operations',
      itemType: request.itemType || 'Fixed Asset',
      itemDescription: request.itemDescription || '',
      quantity: request.quantity || 1,
      businessJustification: request.businessJustification || '',
      requestDate: now,
      requiredDate: request.requiredDate || now.split('T')[0],
      status: 'Pending'
    };

    this.data.requests.unshift(newReq);
    this.logActivity({
      userId: newReq.requestingEmployeeId,
      userName: newReq.requestingEmployeeName,
      userRole: 'Employee',
      action: 'SUBMIT_REQUEST',
      recordType: 'Request',
      recordId: newReq.requestId,
      details: `New request submitted for ${newReq.quantity}x ${newReq.itemDescription}`
    });

    this.saveData();
    return { success: true, message: 'Request submitted for managerial review.', request: newReq };
  }

  public updateRequestStatus(params: {
    requestId: string;
    status: 'Approved' | 'Rejected' | 'Fulfilled';
    approverId: string;
    approverName: string;
    rejectionReason?: string;
    fulfilledAssetId?: string;
  }): { success: boolean; message: string; request?: AssetRequest } {
    const req = this.data.requests.find(r => r.requestId === params.requestId);
    if (!req) return { success: false, message: 'Request not found.' };

    req.status = params.status;
    req.approverId = params.approverId;
    req.approverName = params.approverName;
    req.decisionDate = new Date().toISOString();
    if (params.rejectionReason) req.rejectionReason = params.rejectionReason;
    if (params.fulfilledAssetId) req.fulfilledAssetId = params.fulfilledAssetId;

    this.logActivity({
      userId: params.approverId,
      userName: params.approverName,
      userRole: 'Approver',
      action: `REQUEST_${params.status.toUpperCase()}`,
      recordType: 'Request',
      recordId: req.requestId,
      details: `Request ${req.requestNumber} status set to ${params.status}`
    });

    this.saveData();
    return { success: true, message: `Request ${req.requestNumber} ${params.status.toLowerCase()}.`, request: req };
  }

  // --- Maintenance Workflows ---
  public createMaintenanceTicket(data: Partial<MaintenanceRecord>, performedBy: { userId: string; name: string }): { success: boolean; message: string; maintenance?: MaintenanceRecord } {
    const asset = data.assetId ? this.getAssetById(data.assetId) : null;
    const now = new Date().toISOString();

    const mnt: MaintenanceRecord = {
      maintenanceId: `MNT-${Date.now()}`,
      assetId: data.assetId || '',
      assetName: asset ? asset.itemName : (data.assetName || ''),
      issueDescription: data.issueDescription || '',
      reportedDate: data.reportedDate || now.split('T')[0],
      serviceProvider: data.serviceProvider || 'Pending Vendor Selection',
      repairCost: Number(data.repairCost) || 0,
      workPerformed: data.workPerformed || '',
      status: 'Reported',
      warrantyStatus: asset?.warrantyExpiry ? `Warranty expires ${asset.warrantyExpiry}` : 'Out of warranty',
      reportedBy: performedBy.name
    };

    if (asset) {
      asset.status = 'Under Maintenance';
      asset.lastUpdated = now;
    }

    this.data.maintenance.unshift(mnt);
    this.saveData();
    return { success: true, message: 'Maintenance record created.', maintenance: mnt };
  }

  public updateMaintenanceStatus(maintenanceId: string, updates: Partial<MaintenanceRecord>, performedBy: { userId: string; name: string }): { success: boolean; message: string } {
    const mnt = this.data.maintenance.find(m => m.maintenanceId === maintenanceId);
    if (!mnt) return { success: false, message: 'Record not found.' };

    Object.assign(mnt, updates);
    if (updates.status === 'Completed' && mnt.assetId) {
      const asset = this.getAssetById(mnt.assetId);
      if (asset && asset.status === 'Under Maintenance') {
        asset.status = 'Available';
        asset.condition = 'Good';
        asset.lastUpdated = new Date().toISOString();
      }
    }

    this.saveData();
    return { success: true, message: 'Maintenance record updated.' };
  }

  // --- Physical Audits ---
  public startAudit(name: string, branch: string, locationOrCategory: string, createdBy: string): PhysicalAudit {
    const expectedAssets = this.data.assets.filter(a => {
      if (branch && branch !== 'all' && a.officeBranch !== branch) return false;
      return true;
    });

    const audit: PhysicalAudit = {
      auditId: `AUD-${Date.now()}`,
      auditName: name,
      officeBranch: branch,
      locationOrCategory,
      startDate: new Date().toISOString(),
      status: 'In Progress',
      createdBy,
      totalExpected: expectedAssets.length,
      totalScanned: 0,
      totalMissing: expectedAssets.length,
      totalDiscrepancies: 0,
      items: expectedAssets.map(a => ({
        assetId: a.assetId,
        expectedStatus: a.status,
        expectedLocation: a.buildingRoom,
        expectedEmployee: a.assignedTo,
        isFound: false,
        isDiscrepancy: false
      }))
    };

    this.data.audits.unshift(audit);
    this.saveData();
    return audit;
  }

  public recordAuditScan(auditId: string, assetId: string, scannedBy: string, observedCondition?: AssetCondition, notes?: string): { success: boolean; message: string; audit?: PhysicalAudit } {
    const audit = this.data.audits.find(a => a.auditId === auditId);
    if (!audit) return { success: false, message: 'Audit not found.' };

    const cleanId = assetId.trim().toUpperCase();
    let item = audit.items.find(i => i.assetId.toUpperCase() === cleanId);
    const asset = this.getAssetById(cleanId);

    if (!item) {
      // Unregistered or unexpected asset found!
      item = {
        assetId: cleanId,
        expectedStatus: asset ? asset.status : 'Available',
        expectedLocation: asset ? asset.buildingRoom : 'Unregistered',
        expectedEmployee: asset ? asset.assignedTo : 'None',
        isFound: true,
        isDiscrepancy: true,
        scannedAt: new Date().toISOString(),
        scannedBy,
        observedCondition: observedCondition || (asset ? asset.condition : 'Good'),
        notes: notes || 'Asset found during audit but was not in expected batch.'
      };
      audit.items.push(item);
    } else {
      item.isFound = true;
      item.scannedAt = new Date().toISOString();
      item.scannedBy = scannedBy;
      item.observedCondition = observedCondition || (asset ? asset.condition : 'Good');
      if (notes) item.notes = notes;
    }

    audit.totalScanned = audit.items.filter(i => i.isFound).length;
    audit.totalMissing = audit.items.filter(i => !i.isFound).length;
    audit.totalDiscrepancies = audit.items.filter(i => i.isDiscrepancy).length;

    this.saveData();
    return { success: true, message: `Scanned ${cleanId} in audit.`, audit };
  }

  // --- Google Sheets Sync Configuration & Helper ---
  public updateSheetsConfig(config: Partial<GoogleSheetsSyncConfig>): GoogleSheetsSyncConfig {
    this.data.sheetsConfig = { ...this.data.sheetsConfig, ...config };
    this.saveData();
    return this.data.sheetsConfig;
  }

  public resetToDefaultSeed(): void {
    this.data = JSON.parse(JSON.stringify(INITIAL_SEED));
    this.saveData();
  }

  private logActivity(entry: Omit<ActivityLog, 'logId' | 'timestamp'>): void {
    const log: ActivityLog = {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.activityLogs.unshift(log);
    // Keep max 200 logs
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs.pop();
    }
  }
}

export const db = new Database();
