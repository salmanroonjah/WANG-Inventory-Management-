/**
 * WANG Office Inventory Management System - Data Types
 * Welfare Association for New Generation
 */

export type AssetStatus = 
  | 'Available'
  | 'Issued'
  | 'Under Maintenance'
  | 'Missing'
  | 'Lost'
  | 'Retired'
  | 'Archived';

export type AssetCondition = 
  | 'New'
  | 'Good'
  | 'Fair'
  | 'Minor Wear'
  | 'Needs Repair'
  | 'Damaged';

export type RecordCompletion = 
  | 'Pending'
  | 'Partial'
  | 'Complete'
  | 'Verified';

export type UserRole = 
  | 'Super Admin'
  | 'Inventory & Finance Admin'
  | 'IT Administrator'
  | 'Employee'
  | 'Inventory Manager' // Backward-compatible alias for Inventory & Finance Admin
  | 'Approver'
  | 'Auditor';


export type ViewTab = 
  | 'dashboard'
  | 'scan'
  | 'issue'
  | 'return'
  | 'inventory'
  | 'consumables'
  | 'missing-lost'
  | 'employees'
  | 'categories'
  | 'locations'
  | 'requests'
  | 'maintenance'
  | 'audits'
  | 'reports'
  | 'activity'
  | 'sheets';

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  officeBranch?: string;
}

export interface Asset {
  assetId: string; // e.g. WANG-ELE-001
  categoryId: string; // e.g. CAT-ELE
  categoryName: string; // Electrical & Power Systems
  itemName: string; // Dell Latitude 5420 Laptop
  brand: string;
  model: string;
  serialNumber: string;
  quantity: number; // 1 for individual fixed assets
  unit: string; // Unit, Set, Piece
  purchaseDate: string; // YYYY-MM-DD
  purchaseCost: number; // in USD or PKR
  supplier: string;
  officeBranch: string; // Head Office, Field Office - Quetta
  buildingRoom: string; // Room 204 - IT Lab
  assignedEmployeeId: string; // EMP-001 or empty
  assignedTo: string; // Full Name or empty
  condition: AssetCondition;
  status: AssetStatus;
  warrantyExpiry: string; // YYYY-MM-DD
  invoiceDocLink: string;
  remarks: string;
  recordCompletion: RecordCompletion;
  createdAt: string; // ISO
  lastUpdated: string; // ISO
  isConsumable?: boolean;
  dueDate?: string; // Optional return due date
}

export type TransactionType = 
  | 'ISSUE'
  | 'RETURN'
  | 'TRANSFER'
  | 'CONDITION_CHANGE'
  | 'REPORT_MISSING'
  | 'REPORT_LOST'
  | 'RESOLVE_MISSING'
  | 'MAINTENANCE_SENT'
  | 'MAINTENANCE_RETURNED'
  | 'RETIRED'
  | 'STOCK_RECEIVED'
  | 'STOCK_ADJUSTED'
  | 'INITIAL_IMPORT';

export interface AssetTransaction {
  transactionId: string;
  assetId: string;
  assetName: string;
  employeeId: string;
  employeeName: string;
  transactionType: TransactionType;
  performedByUserId: string;
  performedByName: string;
  timestamp: string; // ISO
  previousStatus: AssetStatus;
  newStatus: AssetStatus;
  condition: AssetCondition;
  notes: string;
  dueDate?: string;
  quantity?: number;
  location?: string;
}

export interface Employee {
  employeeId: string; // e.g. EMP-001
  fullName: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  officeBranch: string;
  activeStatus: boolean;
  assignedAssetCount: number;
  role?: UserRole;
}

export interface Category {
  categoryId: string; // CAT-ELE, CAT-IT, CAT-FUR, CAT-COM
  categoryName: string;
  description: string;
  totalAssets: number;
  iconName?: string;
}

export interface LocationRecord {
  locationId: string;
  officeBranch: string;
  building: string;
  floor: string;
  room: string;
  description: string;
  isStore: boolean;
  assetCount: number;
}

export interface ConsumableItem {
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  openingBalance: number;
  currentStock: number;
  minimumThreshold: number;
  unitCost: number;
  location: string;
  supplier: string;
  lastUpdated: string;
}

export interface AssetRequest {
  requestId: string;
  requestNumber: string;
  requestingEmployeeId: string;
  requestingEmployeeName: string;
  department: string;
  itemType: 'Fixed Asset' | 'Consumable';
  itemDescription: string;
  quantity: number;
  businessJustification: string;
  requestDate: string;
  requiredDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
  approverId?: string;
  approverName?: string;
  decisionDate?: string;
  rejectionReason?: string;
  fulfilledAssetId?: string;
}

export interface MaintenanceRecord {
  maintenanceId: string;
  assetId: string;
  assetName: string;
  issueDescription: string;
  reportedDate: string;
  serviceProvider: string;
  repairCost: number;
  workPerformed: string;
  status: 'Reported' | 'In Progress' | 'Waiting for Parts' | 'Completed' | 'Cancelled';
  completionDate?: string;
  warrantyStatus: string;
  reportedBy: string;
}

export interface PhysicalAuditItem {
  assetId: string;
  expectedStatus: AssetStatus;
  expectedLocation: string;
  expectedEmployee: string;
  scannedAt?: string;
  scannedBy?: string;
  observedCondition?: AssetCondition;
  observedLocation?: string;
  isFound: boolean;
  isDiscrepancy: boolean;
  notes?: string;
}

export interface PhysicalAudit {
  auditId: string;
  auditName: string;
  officeBranch: string;
  locationOrCategory: string;
  startDate: string;
  endDate?: string;
  status: 'In Progress' | 'Review' | 'Approved' | 'Cancelled';
  createdBy: string;
  totalExpected: number;
  totalScanned: number;
  totalMissing: number;
  totalDiscrepancies: number;
  items: PhysicalAuditItem[];
}

export interface ActivityLog {
  logId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  recordType: 'Asset' | 'Employee' | 'Consumable' | 'Maintenance' | 'Audit' | 'SheetsSync' | 'Request' | 'Category' | 'Location';
  recordId: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
}

export interface GoogleSheetsSyncConfig {
  spreadsheetId: string;
  isConfigured: boolean;
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'Success' | 'Failed' | 'In Progress';
  lastSyncError?: string;
  tabsFound: {
    startHere: boolean;
    masterAssets: boolean;
    categories: boolean;
    employeesLocations: boolean;
    assetTransactions: boolean;
  };
  totalSyncedRows: number;
  autoSyncOnChange: boolean;
}

export interface DashboardStats {
  totalAssets: number;
  availableAssets: number;
  issuedAssets: number;
  underMaintenanceAssets: number;
  missingLostAssets: number;
  retiredAssets: number;
  overdueAssetsCount: number;
  totalConsumableStock: number;
  lowStockItemsCount: number;
  pendingRequestsCount: number;
  activeAuditsCount: number;
  categoryDistribution: { category: string; count: number }[];
  conditionDistribution: { condition: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  recentTransactions: AssetTransaction[];
}
