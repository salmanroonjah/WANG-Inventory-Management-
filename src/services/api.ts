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

export const api = {
  // Auth & Roles
  async getCurrentUser(): Promise<UserSession> {
    const res = await fetch(`${BASE_URL}/auth/current-user`);
    const data = await res.json();
    return data.user;
  },

  async switchRole(role: UserRole, employeeId?: string, name?: string): Promise<UserSession> {
    const res = await fetch(`${BASE_URL}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, employeeId, name })
    });
    const data = await res.json();
    return data.user;
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${BASE_URL}/stats/dashboard`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.stats;
  },

  // Assets
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
    const res = await fetch(`${BASE_URL}/assets?${query.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.assets;
  },

  async getAssetById(id: string): Promise<{ asset: Asset; transactions: AssetTransaction[] }> {
    const res = await fetch(`${BASE_URL}/assets/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Asset not found');
    return { asset: data.asset, transactions: data.transactions };
  },

  async createAsset(asset: Partial<Asset>): Promise<{ asset: Asset; message: string }> {
    const res = await fetch(`${BASE_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<{ asset: Asset; message: string }> {
    const res = await fetch(`${BASE_URL}/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Issue & Return Core Workflows
  async issueAsset(payload: {
    assetId: string;
    employeeId: string;
    condition?: AssetCondition;
    dueDate?: string;
    notes?: string;
    location?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    const res = await fetch(`${BASE_URL}/assets/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  async returnAsset(payload: {
    assetId: string;
    returnCondition: AssetCondition;
    notes?: string;
    targetLocation?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    const res = await fetch(`${BASE_URL}/assets/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  async transferAsset(payload: {
    assetId: string;
    newEmployeeId?: string;
    newLocation?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset }> {
    const res = await fetch(`${BASE_URL}/assets/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Missing & Lost Management
  async reportMissingOrLost(payload: {
    assetId: string;
    status: 'Missing' | 'Lost';
    reason: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    const res = await fetch(`${BASE_URL}/assets/report-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  async resolveMissingStatus(payload: {
    assetId: string;
    newStatus: 'Available' | 'Under Maintenance';
    condition: AssetCondition;
    resolutionNotes: string;
    location?: string;
  }): Promise<{ success: boolean; message: string; asset: Asset; transaction: AssetTransaction }> {
    const res = await fetch(`${BASE_URL}/assets/resolve-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Employees & Accounts
  async getEmployees(): Promise<Employee[]> {
    const res = await fetch(`${BASE_URL}/employees`);
    const data = await res.json();
    return data.employees;
  },

  async getEmployeeById(id: string): Promise<{ employee: Employee; assignedAssets: Asset[]; history: AssetTransaction[] }> {
    const res = await fetch(`${BASE_URL}/employees/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Categories & Locations
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${BASE_URL}/categories`);
    const data = await res.json();
    return data.categories;
  },

  async getLocations(): Promise<LocationRecord[]> {
    const res = await fetch(`${BASE_URL}/locations`);
    const data = await res.json();
    return data.locations;
  },

  // Consumables
  async getConsumables(): Promise<ConsumableItem[]> {
    const res = await fetch(`${BASE_URL}/consumables`);
    const data = await res.json();
    return data.consumables;
  },

  async adjustConsumable(payload: {
    itemCode: string;
    deltaQty: number;
    reason: string;
    employeeId?: string;
  }): Promise<{ item: ConsumableItem; message: string }> {
    const res = await fetch(`${BASE_URL}/consumables/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Transactions & Audit Logs
  async getTransactions(filters?: { assetId?: string; employeeId?: string; type?: string }): Promise<AssetTransaction[]> {
    const q = new URLSearchParams();
    if (filters?.assetId) q.set('assetId', filters.assetId);
    if (filters?.employeeId) q.set('employeeId', filters.employeeId);
    if (filters?.type && filters.type !== 'all') q.set('type', filters.type);
    const res = await fetch(`${BASE_URL}/transactions?${q.toString()}`);
    const data = await res.json();
    return data.transactions;
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await fetch(`${BASE_URL}/activity-logs`);
    const data = await res.json();
    return data.logs;
  },

  // Requests
  async getRequests(): Promise<AssetRequest[]> {
    const res = await fetch(`${BASE_URL}/requests`);
    const data = await res.json();
    return data.requests;
  },

  async createRequest(req: Partial<AssetRequest>): Promise<AssetRequest> {
    const res = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.request;
  },

  async updateRequestStatus(id: string, status: 'Approved' | 'Rejected' | 'Fulfilled', extra?: { rejectionReason?: string; fulfilledAssetId?: string }): Promise<AssetRequest> {
    const res = await fetch(`${BASE_URL}/requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.request;
  },

  // Maintenance
  async getMaintenance(): Promise<MaintenanceRecord[]> {
    const res = await fetch(`${BASE_URL}/maintenance`);
    const data = await res.json();
    return data.maintenance;
  },

  async createMaintenance(data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const res = await fetch(`${BASE_URL}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!resData.success) throw new Error(resData.message);
    return resData.maintenance;
  },

  async updateMaintenance(id: string, updates: Partial<MaintenanceRecord>): Promise<void> {
    const res = await fetch(`${BASE_URL}/maintenance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
  },

  // Audits
  async getAudits(): Promise<PhysicalAudit[]> {
    const res = await fetch(`${BASE_URL}/audits`);
    const data = await res.json();
    return data.audits;
  },

  async startAudit(name: string, branch: string, locationOrCategory: string): Promise<PhysicalAudit> {
    const res = await fetch(`${BASE_URL}/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, branch, locationOrCategory })
    });
    const data = await res.json();
    return data.audit;
  },

  async scanAuditItem(auditId: string, assetId: string, observedCondition?: AssetCondition, notes?: string): Promise<PhysicalAudit> {
    const res = await fetch(`${BASE_URL}/audits/${auditId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, observedCondition, notes })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.audit;
  },

  // Google Sheets
  async getSheetsConfig(): Promise<GoogleSheetsSyncConfig> {
    const res = await fetch(`${BASE_URL}/sync/sheets/config`);
    const data = await res.json();
    return data.config;
  },

  async testSheetsConnection(spreadsheetId: string): Promise<{ success: boolean; message: string; rowCount?: number }> {
    const res = await fetch(`${BASE_URL}/sync/sheets/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId })
    });
    return await res.json();
  },

  async getWorkbookExport(): Promise<Record<string, string[][]>> {
    const res = await fetch(`${BASE_URL}/sync/sheets/export`);
    const data = await res.json();
    return data.workbook;
  },

  async importSheetsRows(rows: Record<string, string>[]): Promise<{ importedCount: number; updatedCount: number; skippedCount: number; errors: string[] }> {
    const res = await fetch(`${BASE_URL}/sync/sheets/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    return await res.json();
  },

  async resetDemoData(): Promise<void> {
    await fetch(`${BASE_URL}/reset-demo`, { method: 'POST' });
  }
};
