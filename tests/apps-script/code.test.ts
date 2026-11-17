/// <reference types="node" />
/**
 * Runs apps-script/Code.gs in Node against in-memory fakes of Google Sheets
 * and the Firestore REST API. No network, no real database.
 *
 *   npm run test:script
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadScript } from './fakes';

const SECRET = 'test-secret-1234567890';
let t: ReturnType<typeof loadScript>;

function seed() {
  t.fs.put('categories', 'CAT-IT', { categoryId: 'CAT-IT', categoryName: 'IT Equipment', description: 'Computers' });
  t.fs.put('categories', 'CAT-FUR', { categoryId: 'CAT-FUR', categoryName: 'Furniture', description: '' });
  t.fs.put('locations', 'LOC-HEA-01', { locationId: 'LOC-HEA-01', officeBranch: 'Quetta', building: 'Head Office', floor: '1', room: 'Store', description: '', isStore: true });
  t.fs.put('employees', 'EMP-001', { employeeId: 'EMP-001', fullName: 'Dr. Salman Khan', department: 'Admin', designation: 'ED', email: 'boss@example.com', phone: '', officeBranch: 'Quetta', activeStatus: true, role: 'Super Admin' });
  t.fs.put('assets', 'WANG-IT-001', {
    assetId: 'WANG-IT-001', categoryId: 'CAT-IT', categoryName: 'IT Equipment', itemName: 'Dell Laptop', brand: 'Dell', model: '5420',
    serialNumber: 'SN1', quantity: 1, unit: 'Unit', purchaseDate: '2024-01-05', purchaseCost: 150000, supplier: 'ABC', officeBranch: 'Quetta',
    buildingRoom: 'Head Office - Store', assignedEmployeeId: 'EMP-001', assignedTo: 'Dr. Salman Khan', condition: 'Good', status: 'Issued',
    dueDate: '2026-12-31', warrantyExpiry: '', invoiceDocLink: '', remarks: '', recordCompletion: 'Complete', createdAt: '2024-01-05T00:00:00Z', lastUpdated: '2024-01-05T00:00:00Z'
  });
  t.fs.put('transactions', 'TX-1', { transactionId: 'TX-1', timestamp: '2024-01-05T00:00:00Z', transactionType: 'ISSUE', assetId: 'WANG-IT-001', assetName: 'Dell Laptop', employeeId: 'EMP-001', employeeName: 'Dr. Salman Khan', previousStatus: 'Available', newStatus: 'Issued', condition: 'Good', performedByName: 'Admin', notes: '' });
  t.fs.put('consumables', 'CON-001', { itemCode: 'CON-001', itemName: 'A4 Paper', category: 'Stationery', unit: 'Ream', openingBalance: 10, currentStock: 8, minimumThreshold: 2, unitCost: 1200, location: 'Store', supplier: '', lastUpdated: '' });
}

const logs = () => t.fs.list('activityLogs');

beforeEach(() => {
  t = loadScript({ secret: SECRET });
  seed();
});

describe('headers', () => {
  it('match the app export (getWorkbookExport in api.ts)', () => {
    const api = readFileSync(resolve(process.cwd(), 'src/services/api.ts'), 'utf8');
    for (const tab of t.sandbox.TABS) {
      const expected = JSON.stringify(tab.columns.map((c: any) => c.h)).replace(/"/g, "'").replace(/,/g, ', ');
      expect(api.includes(expected), `${tab.sheet} headers`).toBe(true);
    }
  });
});

describe('web app (doPost)', () => {
  it('rejects a wrong or missing secret', () => {
    expect(t.post({ action: 'ping', secret: 'nope' }).ok).toBe(false);
    expect(t.post({ action: 'ping' }).ok).toBe(false);
  });

  it('refuses to run when SYNC_SECRET is not set', () => {
    t = loadScript({ secret: '' });
    const r = t.post({ action: 'ping', secret: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/SYNC_SECRET/);
  });

  it('ping reports tabs, triggers and Firestore access', () => {
    const r = t.post({ action: 'ping', secret: SECRET });
    expect(r.ok).toBe(true);
    expect(r.firestore.ok).toBe(true);
    expect(r.missingTabs).toContain('Master Assets');
    expect(r.triggersInstalled).toBe(false);
  });

  it('fullSync fills every tab, with custody only for Issued assets', () => {
    const r = t.post({ action: 'fullSync', secret: SECRET });
    expect(r.ok).toBe(true);
    expect(r.counts).toMatchObject({ 'Master Assets': 1, Categories: 2, Employees: 1, Locations: 1, 'Asset Transactions': 1, Consumables: 1 });
    const asset = t.ss.getSheetByName('Master Assets')!.rows()[0];
    expect(asset).toMatchObject({ 'Asset ID': 'WANG-IT-001', Status: 'Issued', 'Assigned To': 'Dr. Salman Khan', 'Purchase Cost (PKR)': '150000' });
    expect(t.ss.getSheetByName('Categories')!.rows().find((r) => r['Category ID'] === 'CAT-IT')!['Total Assets']).toBe('1');
    expect(t.ss.getSheetByName('Employees')!.rows()[0]['Assets Held']).toBe('1');
    expect(t.ss.getSheetByName('Locations')!.rows()[0]['Assets']).toBe('1');
    expect(t.fs.get('systemSettings', 'sheetsConfig')).toMatchObject({ lastSyncStatus: 'Success', totalSyncedRows: 7 });
  });

  it('changes: re-reads records from Firestore (payload carries IDs only)', () => {
    t.post({ action: 'fullSync', secret: SECRET });
    const a = t.fs.get('assets', 'WANG-IT-001')!;
    t.fs.put('assets', 'WANG-IT-001', { ...a, brand: 'HP' });
    t.fs.put('assets', 'WANG-FUR-001', { ...a, assetId: 'WANG-FUR-001', itemName: 'Chair', status: 'Available', categoryId: 'CAT-FUR' });
    const r = t.post({
      action: 'changes',
      secret: SECRET,
      changes: [
        { collection: 'assets', id: 'WANG-IT-001', brand: 'IGNORED' },
        { collection: 'assets', id: 'WANG-FUR-001' },
        { collection: 'activityLogs', id: 'LOG-1' }
      ]
    });
    expect(r).toMatchObject({ ok: true, updated: 2, removed: 0 });
    const rows = t.ss.getSheetByName('Master Assets')!.rows();
    expect(rows.find((x) => x['Asset ID'] === 'WANG-IT-001')!.Brand).toBe('HP');
    expect(rows.find((x) => x['Asset ID'] === 'WANG-FUR-001')).toMatchObject({ 'Item Name': 'Chair', 'Assigned To': '' });
  });

  it('changes: removes the row of a record deleted in the app', () => {
    t.post({ action: 'fullSync', secret: SECRET });
    t.fs.docs.delete('consumables/CON-001');
    expect(t.post({ action: 'changes', secret: SECRET, changes: [{ collection: 'consumables', id: 'CON-001' }] })).toMatchObject({ removed: 1 });
    expect(t.ss.getSheetByName('Consumables')!.rows()).toHaveLength(0);
  });
});

describe('sheet edits → Firestore', () => {
  beforeEach(() => {
    t.post({ action: 'fullSync', secret: SECRET });
  });
  const col = (sheet: string, header: string) => t.ss.getSheetByName(sheet)!.data[0].indexOf(header) + 1;

  it('saves an editable cell and logs it as SheetsSync', () => {
    t.edit('Master Assets', 2, col('Master Assets', 'Brand'), [['Lenovo']]);
    expect(t.fs.get('assets', 'WANG-IT-001')!.brand).toBe('Lenovo');
    const log = logs().find((l) => l.action === 'SHEET_EDIT')!;
    expect(log).toMatchObject({ recordType: 'SheetsSync', recordId: 'WANG-IT-001', userId: 'SHEETS-SYNC' });
    expect(log.userName).toContain('editor@example.com');
    expect(log.logId).toMatch(/^LOG-/);
  });

  it('undoes edits to Status / custody columns and never writes them', () => {
    for (const h of ['Status', 'Assigned Employee ID', 'Assigned To', 'Due Date', 'Category Name', 'Last Updated']) {
      t.edit('Master Assets', 2, col('Master Assets', h), [['HACKED']]);
    }
    const a = t.fs.get('assets', 'WANG-IT-001')!;
    expect(a).toMatchObject({ status: 'Issued', assignedTo: 'Dr. Salman Khan', dueDate: '2026-12-31', categoryName: 'IT Equipment' });
    const row = t.ss.getSheetByName('Master Assets')!.rows()[0];
    expect(row.Status).toBe('Issued');
    expect(row['Assigned To']).toBe('Dr. Salman Khan');
    expect(logs()).toHaveLength(0);
  });

  it('refuses to rename an Asset ID', () => {
    t.edit('Master Assets', 2, 1, [['WANG-IT-999']], 'WANG-IT-001');
    expect(t.ss.getSheetByName('Master Assets')!.rows()[0]['Asset ID']).toBe('WANG-IT-001');
    expect(t.fs.get('assets', 'WANG-IT-999')).toBeUndefined();
  });

  it('rejects bad values with a note and restores the row', () => {
    t.edit('Master Assets', 2, col('Master Assets', 'Purchase Cost (PKR)'), [['lots']]);
    t.edit('Master Assets', 2, col('Master Assets', 'Condition'), [['Shiny']]);
    t.edit('Master Assets', 2, col('Master Assets', 'Item Name'), [['']]);
    t.edit('Master Assets', 2, col('Master Assets', 'Category ID'), [['CAT-NOPE']]);
    expect(t.fs.get('assets', 'WANG-IT-001')).toMatchObject({ purchaseCost: 150000, condition: 'Good', itemName: 'Dell Laptop', categoryId: 'CAT-IT' });
    expect(t.ss.getSheetByName('Master Assets')!.rows()[0]['Item Name']).toBe('Dell Laptop');
    expect(t.ss.getSheetByName('Master Assets')!.notes.get('2,1')).toMatch(/Not saved/);
  });

  it('category change also updates the category name; condition / location changes add history rows', () => {
    t.edit('Master Assets', 2, col('Master Assets', 'Category ID'), [['cat-fur']]);
    expect(t.fs.get('assets', 'WANG-IT-001')).toMatchObject({ categoryId: 'CAT-FUR', categoryName: 'Furniture' });
    t.edit('Master Assets', 2, col('Master Assets', 'Condition'), [['fair']]);
    t.edit('Master Assets', 2, col('Master Assets', 'Building - Room'), [['Head Office - Room 2']]);
    const types = t.fs.list('transactions').map((x) => x.transactionType);
    expect(types).toEqual(expect.arrayContaining(['CONDITION_CHANGE', 'TRANSFER']));
    expect(t.fs.get('assets', 'WANG-IT-001')).toMatchObject({ condition: 'Fair', buildingRoom: 'Head Office - Room 2', status: 'Issued' });
    // the new history rows also appear on the read-only tab
    expect(t.ss.getSheetByName('Asset Transactions')!.rows().length).toBe(3);
  });

  it('a new row with a new Asset ID creates an Available asset', () => {
    const sheet = t.ss.getSheetByName('Master Assets')!;
    const headers = sheet.data[0];
    const row = headers.map((h) =>
      ({ 'Asset ID': 'wang-fur-010', 'Item Name': 'Office Chair', 'Category ID': 'CAT-FUR', Status: 'Issued', 'Assigned To': 'Someone', Quantity: '2' } as any)[h] ?? ''
    );
    t.edit('Master Assets', 3, 1, [row]);
    const a = t.fs.get('assets', 'WANG-FUR-010')!;
    expect(a).toMatchObject({ itemName: 'Office Chair', status: 'Available', assignedTo: '', categoryName: 'Furniture', quantity: 2 });
    expect(t.fs.list('transactions').some((x) => x.assetId === 'WANG-FUR-010' && x.transactionType === 'INITIAL_IMPORT')).toBe(true);
    expect(logs().some((l) => l.action === 'SHEET_CREATE' && l.recordType === 'SheetsSync')).toBe(true);
    expect(sheet.rows().find((r) => r['Asset ID'] === 'WANG-FUR-010')!.Status).toBe('Available');
  });

  it('clearing / deleting a row never deletes data, and the next sync restores it', () => {
    const sheet = t.ss.getSheetByName('Master Assets')!;
    const width = sheet.data[0].length;
    t.edit('Master Assets', 2, 1, [Array(width).fill('')]);
    expect(t.fs.get('assets', 'WANG-IT-001')).toBeDefined();
    sheet.deleteRow(2);
    expect(t.fs.get('assets', 'WANG-IT-001')).toBeDefined();
    t.sandbox.scheduledFullSync();
    expect(sheet.rows()[0]['Asset ID']).toBe('WANG-IT-001');
  });

  it('Asset Transactions tab is read-only', () => {
    t.edit('Asset Transactions', 2, 3, [['RETURN']]);
    expect(t.fs.get('transactions', 'TX-1')!.transactionType).toBe('ISSUE');
    expect(t.ss.getSheetByName('Asset Transactions')!.rows()[0].Type).toBe('ISSUE');
  });

  it('employee sheet: name change updates assets; email / role / active are locked', () => {
    t.edit('Employees', 2, col('Employees', 'Full Name'), [['Salman K.']]);
    expect(t.fs.get('employees', 'EMP-001')!.fullName).toBe('Salman K.');
    expect(t.fs.get('assets', 'WANG-IT-001')!.assignedTo).toBe('Salman K.');
    t.edit('Employees', 2, col('Employees', 'Role'), [['Employee']]);
    t.edit('Employees', 2, col('Employees', 'Email'), [['attacker@example.com']]);
    t.edit('Employees', 2, col('Employees', 'Active'), [['No']]);
    expect(t.fs.get('employees', 'EMP-001')).toMatchObject({ role: 'Super Admin', email: 'boss@example.com', activeStatus: true });
  });

  it('new employee rows are not created from the sheet', () => {
    t.edit('Employees', 3, 1, [['EMP-050', 'New Person']]);
    expect(t.fs.get('employees', 'EMP-050')).toBeUndefined();
  });

  it('consumables: stock columns are locked on existing rows', () => {
    t.edit('Consumables', 2, col('Consumables', 'Current Stock'), [['999']]);
    t.edit('Consumables', 2, col('Consumables', 'Unit Cost (PKR)'), [['1,300']]);
    expect(t.fs.get('consumables', 'CON-001')).toMatchObject({ currentStock: 8, unitCost: 1300 });
  });

  it('header row edits are undone', () => {
    t.edit('Master Assets', 1, 2, [['Something else']]);
    expect(t.ss.getSheetByName('Master Assets')!.data[0][1]).toBe('Item Name');
  });
});

describe('setup', () => {
  it('installs the on-edit and 10-minute triggers', () => {
    t.sandbox.setupSheet();
    expect(t.triggers.map((x: any) => x.getHandlerFunction()).sort()).toEqual(['handleSheetEdit', 'scheduledFullSync']);
    expect(t.post({ action: 'ping', secret: SECRET })).toMatchObject({ triggersInstalled: true, missingTabs: [] });
  });
});
