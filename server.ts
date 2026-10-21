import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { sheetsSyncService } from './server/sheetsSync.js';
import { UserRole } from './src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory active session for testing role-based access control
let activeSession = {
  userId: 'USR-EXEC-01',
  name: 'Dr. Salman Khan',
  email: 'salmankhanroonjha123@gmail.com',
  role: 'Super Admin' as UserRole,
  employeeId: 'EMP-001',
  officeBranch: 'Head Office - Islamabad'
};

// --- HEALTH & STATUS ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- AUTH & ROLES ---
app.get('/api/auth/current-user', (_req: Request, res: Response) => {
  res.json({ success: true, user: activeSession });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const { name, email, phone, officeBranch, designation } = req.body;
  if (name) activeSession.name = name;
  if (email) activeSession.email = email;
  if (officeBranch) activeSession.officeBranch = officeBranch;

  if (activeSession.employeeId) {
    db.updateEmployee(activeSession.employeeId, {
      fullName: name || activeSession.name,
      email: email || activeSession.email,
      phone: phone,
      officeBranch: officeBranch || activeSession.officeBranch,
      designation: designation
    }, {
      userId: activeSession.userId,
      name: activeSession.name
    });
  }

  res.json({ success: true, message: 'Profile updated successfully', user: activeSession });
});

app.post('/api/auth/switch-role', (req: Request, res: Response) => {
  const { role, employeeId, name } = req.body;
  if (!role) {
    return res.status(400).json({ success: false, message: 'Role is required.' });
  }
  activeSession.role = role;
  if (name) activeSession.name = name;
  if (employeeId) activeSession.employeeId = employeeId;
  const targetEmp = db.getEmployees().find(e => (employeeId && e.employeeId === employeeId) || e.role === role);
  if (targetEmp) {
    activeSession.name = targetEmp.fullName;
    activeSession.email = targetEmp.email;
    activeSession.employeeId = targetEmp.employeeId;
    activeSession.officeBranch = targetEmp.officeBranch;
  }
  res.json({ success: true, message: `Switched role to ${role}`, user: activeSession });
});

// --- DASHBOARD & STATS ---
app.get('/api/stats/dashboard', (_req: Request, res: Response) => {
  try {
    const stats = db.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- ASSET MANAGEMENT ---
app.get('/api/assets', (req: Request, res: Response) => {
  try {
    const { search, category, status, condition, location, employeeId, completion } = req.query;
    const assets = db.getAssets({
      search: search as string,
      category: category as string,
      status: status as string,
      condition: condition as string,
      location: location as string,
      employeeId: employeeId as string,
      completion: completion as string
    });
    res.json({ success: true, count: assets.length, assets });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/assets/:id', (req: Request, res: Response) => {
  const asset = db.getAssetById(req.params.id);
  if (!asset) {
    return res.status(404).json({ success: false, message: `Asset "${req.params.id}" not found.` });
  }
  const transactions = db.getTransactions({ assetId: asset.assetId });
  res.json({ success: true, asset, transactions });
});

app.post('/api/assets', (req: Request, res: Response) => {
  // Authorization check: Only Admin or Inventory Manager can register assets
  if (activeSession.role === 'Employee' || activeSession.role === 'Auditor') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Your role does not allow asset registration.' });
  }

  const result = db.createAsset(req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(201).json(result);
});

app.put('/api/assets/:id', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee' || activeSession.role === 'Auditor') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Read-only access.' });
  }

  const result = db.updateAsset(req.params.id, req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/assets/:id', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee' || activeSession.role === 'Auditor') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Managers and Admins can delete assets.' });
  }

  const result = db.deleteAsset(req.params.id, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) {
    return res.status(404).json(result);
  }
  res.json(result);
});

app.post('/api/assets/batch-delete', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee' || activeSession.role === 'Auditor') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Managers and Admins can delete assets.' });
  }

  const { assetIds } = req.body;
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    return res.status(400).json({ success: false, message: 'assetIds array is required.' });
  }

  const result = db.deleteMultipleAssets(assetIds, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  res.json(result);
});

// --- CORE TRANSACTION ENDPOINTS: ISSUE & RETURN ---
app.post('/api/assets/issue', (req: Request, res: Response) => {
  // Role verification: Unauthorized users cannot issue
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({
      success: false,
      message: `Unauthorized: Role "${activeSession.role}" cannot issue assets. Only Inventory Manager or Super Admin can issue.`
    });
  }

  const { assetId, employeeId, condition, dueDate, notes, location } = req.body;
  if (!assetId || !employeeId) {
    return res.status(400).json({ success: false, message: 'Asset ID and Employee ID are required.' });
  }

  const result = db.issueAsset({
    assetId,
    employeeId,
    condition,
    dueDate,
    notes,
    location,
    performedByUserId: activeSession.userId,
    performedByName: activeSession.name
  });

  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/assets/return', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({
      success: false,
      message: `Unauthorized: Role "${activeSession.role}" cannot process returns.`
    });
  }

  const { assetId, returnCondition, notes, targetLocation } = req.body;
  if (!assetId || !returnCondition) {
    return res.status(400).json({ success: false, message: 'Asset ID and Return Condition are required.' });
  }

  const result = db.returnAsset({
    assetId,
    returnCondition,
    notes,
    targetLocation,
    performedByUserId: activeSession.userId,
    performedByName: activeSession.name
  });

  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/assets/transfer', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized to transfer assets.' });
  }

  const { assetId, newEmployeeId, newLocation, notes } = req.body;
  const result = db.transferAsset({
    assetId,
    newEmployeeId,
    newLocation,
    notes,
    performedByUserId: activeSession.userId,
    performedByName: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- MISSING & LOST ITEMS ---
app.post('/api/assets/report-missing', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Reporting missing/lost items requires managerial privilege.' });
  }

  const { assetId, status, reason } = req.body;
  if (!assetId || !status || !reason) {
    return res.status(400).json({ success: false, message: 'Asset ID, status (Missing/Lost), and reason are required.' });
  }

  const result = db.reportMissingOrLost({
    assetId,
    status,
    reason,
    performedByUserId: activeSession.userId,
    performedByName: activeSession.name
  });

  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/assets/resolve-status', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Resolving missing item status requires managerial privilege.' });
  }

  const { assetId, newStatus, condition, resolutionNotes, location } = req.body;
  const result = db.resolveMissingStatus({
    assetId,
    newStatus,
    condition,
    resolutionNotes,
    location,
    performedByUserId: activeSession.userId,
    performedByName: activeSession.name
  });

  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- EMPLOYEES & PROFILES ---
app.get('/api/employees', (_req: Request, res: Response) => {
  res.json({ success: true, employees: db.getEmployees() });
});

app.get('/api/employees/:id', (req: Request, res: Response) => {
  const emp = db.getEmployeeById(req.params.id);
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }
  const assignedAssets = db.getAssets({ employeeId: emp.employeeId, status: 'Issued' });
  const history = db.getTransactions({ employeeId: emp.employeeId });

  res.json({
    success: true,
    employee: {
      ...emp,
      assignedAssetCount: assignedAssets.length
    },
    assignedAssets,
    history
  });
});

app.post('/api/employees', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Super Admin can register new staff/admin profiles.' });
  }

  const result = db.createEmployee(req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.status(201).json(result);
});

app.put('/api/employees/:id', (req: Request, res: Response) => {
  const isSelf = activeSession.employeeId === req.params.id;
  const isSuperAdmin = activeSession.role === 'Super Admin';

  if (!isSuperAdmin && !isSelf) {
    return res.status(403).json({ success: false, message: 'Unauthorized: You do not have permission to edit other staff profiles.' });
  }

  const updates = { ...req.body };
  if (!isSuperAdmin) {
    delete updates.role;
    delete updates.employeeId;
  }

  const result = db.updateEmployee(req.params.id, updates, {
    userId: activeSession.userId,
    name: activeSession.name
  });

  if (!result.success) return res.status(400).json(result);

  if (isSelf) {
    if (updates.fullName) activeSession.name = updates.fullName;
    if (updates.email) activeSession.email = updates.email;
    if (updates.role && isSuperAdmin) activeSession.role = updates.role;
    if (updates.officeBranch) activeSession.officeBranch = updates.officeBranch;
  }

  res.json(result);
});

app.delete('/api/employees/:id', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Super Admin can remove employee records.' });
  }

  const result = db.deleteEmployee(req.params.id, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- CATEGORIES & LOCATIONS ---
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({ success: true, categories: db.getCategories() });
});

app.post('/api/categories', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Staff members cannot create asset categories.' });
  }
  const result = db.createCategory(req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.status(201).json(result);
});

app.put('/api/categories/:id', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Staff members cannot modify asset categories.' });
  }
  const result = db.updateCategory(req.params.id, req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory & Finance Admin' && (activeSession.role as any) !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Administrative roles can delete categories.' });
  }
  const result = db.deleteCategory(req.params.id, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/locations', (_req: Request, res: Response) => {
  res.json({ success: true, locations: db.getLocations() });
});

app.post('/api/locations', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Staff members cannot create location records.' });
  }
  const result = db.createLocation(req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.status(201).json(result);
});

app.put('/api/locations/:id', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Staff members cannot modify location records.' });
  }
  const result = db.updateLocation(req.params.id, req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.delete('/api/locations/:id', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory & Finance Admin' && (activeSession.role as any) !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Administrative roles can delete locations.' });
  }
  const result = db.deleteLocation(req.params.id, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.put('/api/buildings', (req: Request, res: Response) => {
  if (activeSession.role === 'Employee') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Staff members cannot modify building records.' });
  }
  const { oldCity, oldBuilding, newCity, newBuilding } = req.body;
  if (!oldCity || !oldBuilding || !newCity || !newBuilding) {
    return res.status(400).json({ success: false, message: 'Missing required building update fields.' });
  }
  const result = db.updateBuilding(oldCity, oldBuilding, newCity, newBuilding, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/buildings/delete', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory & Finance Admin' && (activeSession.role as any) !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only Administrative roles can delete buildings.' });
  }
  const { city, buildingName } = req.body;
  if (!city || !buildingName) {
    return res.status(400).json({ success: false, message: 'City and Building Name are required.' });
  }
  const result = db.deleteBuilding(city, buildingName, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- CONSUMABLES ---
app.get('/api/consumables', (_req: Request, res: Response) => {
  res.json({ success: true, consumables: db.getConsumables() });
});

app.post('/api/consumables/adjust', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Cannot adjust stock.' });
  }

  const { itemCode, deltaQty, reason, employeeId } = req.body;
  const result = db.adjustConsumableStock({
    itemCode,
    deltaQty: Number(deltaQty),
    reason,
    employeeId,
    performedByUserId: activeSession.userId,
    performedByName: activeSession.name
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- AUDIT TRAIL / TRANSACTIONS ---
app.get('/api/transactions', (req: Request, res: Response) => {
  const { assetId, employeeId, type } = req.query;
  const list = db.getTransactions({
    assetId: assetId as string,
    employeeId: employeeId as string,
    type: type as string
  });
  res.json({ success: true, count: list.length, transactions: list });
});

app.get('/api/activity-logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: db.getActivityLogs() });
});

// --- REQUESTS & APPROVALS ---
app.get('/api/requests', (_req: Request, res: Response) => {
  res.json({ success: true, requests: db.getRequests() });
});

app.post('/api/requests', (req: Request, res: Response) => {
  const result = db.createRequest(req.body);
  res.status(201).json(result);
});

app.put('/api/requests/:id/status', (req: Request, res: Response) => {
  if (activeSession.role !== 'Super Admin' && activeSession.role !== 'Approver' && activeSession.role !== 'Inventory Manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized to approve/reject requests.' });
  }

  const { status, rejectionReason, fulfilledAssetId } = req.body;
  const result = db.updateRequestStatus({
    requestId: req.params.id,
    status,
    approverId: activeSession.userId,
    approverName: activeSession.name,
    rejectionReason,
    fulfilledAssetId
  });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- MAINTENANCE ---
app.get('/api/maintenance', (_req: Request, res: Response) => {
  res.json({ success: true, maintenance: db.getMaintenance() });
});

app.post('/api/maintenance', (req: Request, res: Response) => {
  const result = db.createMaintenanceTicket(req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  res.status(201).json(result);
});

app.put('/api/maintenance/:id', (req: Request, res: Response) => {
  const result = db.updateMaintenanceStatus(req.params.id, req.body, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  res.json(result);
});

// --- PHYSICAL AUDITS ---
app.get('/api/audits', (_req: Request, res: Response) => {
  res.json({ success: true, audits: db.getAudits() });
});

app.post('/api/audits', (req: Request, res: Response) => {
  const { name, branch, locationOrCategory } = req.body;
  const audit = db.startAudit(
    name || `Physical Audit ${new Date().toISOString().split('T')[0]}`,
    branch || 'All Branches',
    locationOrCategory || 'All Categories',
    activeSession.name
  );
  res.status(201).json({ success: true, audit });
});

app.post('/api/audits/:id/scan', (req: Request, res: Response) => {
  const { assetId, observedCondition, notes } = req.body;
  const result = db.recordAuditScan(req.params.id, assetId, activeSession.name, observedCondition, notes);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// --- GOOGLE SHEETS SYNC ENDPOINTS ---
app.get('/api/sync/sheets/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: db.getSheetsConfig() });
});

app.post('/api/sync/sheets/test', async (req: Request, res: Response) => {
  const { spreadsheetId } = req.body;
  const result = await sheetsSyncService.testConnection(spreadsheetId);
  res.json(result);
});

app.get('/api/sync/sheets/export', (_req: Request, res: Response) => {
  const workbook = sheetsSyncService.generateWorkbookExport();
  res.json({ success: true, workbook });
});

app.post('/api/sync/sheets/import', (req: Request, res: Response) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: 'Invalid rows array' });
  }
  const result = sheetsSyncService.importAssetRows(rows, {
    userId: activeSession.userId,
    name: activeSession.name
  });
  res.json({ success: true, ...result });
});

// Reset demo state
app.post('/api/reset-demo', (_req: Request, res: Response) => {
  db.resetToDefaultSeed();
  res.json({ success: true, message: 'Database reset to original seed data.' });
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WANG SERVER] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[WANG SERVER] Fatal startup error:', err);
});
