/**
 * WANG Office Inventory Management System
 * Welfare Association for New Generation (WANG)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar, ViewTab, isTabAllowed } from './components/Sidebar.js';
import { BarcodeScannerModal } from './components/BarcodeScannerModal.js';
import { HandoverReceiptModal } from './components/HandoverReceiptModal.js';
import { AssetDetailModal } from './components/AssetDetailModal.js';
import { IssueAssetModal } from './components/IssueAssetModal.js';
import { ReturnAssetModal } from './components/ReturnAssetModal.js';
import { ReportMissingModal } from './components/ReportMissingModal.js';
import { ResolveMissingModal } from './components/ResolveMissingModal.js';
import { AssetFormModal } from './components/AssetFormModal.js';

// Views
import { DashboardView } from './views/DashboardView.js';
import { ScanAssetView } from './views/ScanAssetView.js';
import { IssueAssetView } from './views/IssueAssetView.js';
import { ReturnAssetView } from './views/ReturnAssetView.js';
import { InventoryView } from './views/InventoryView.js';
import { ConsumablesView } from './views/ConsumablesView.js';
import { MissingLostView } from './views/MissingLostView.js';
import { EmployeesView } from './views/EmployeesView.js';
import { CategoriesView } from './views/CategoriesView.js';
import { LocationsView } from './views/LocationsView.js';
import { RequestsView } from './views/RequestsView.js';
import { MaintenanceView } from './views/MaintenanceView.js';
import { StockAuditsView } from './views/StockAuditsView.js';
import { ReportsView } from './views/ReportsView.js';
import { ActivityLogsView } from './views/ActivityLogsView.js';
import { GoogleSheetsSyncView } from './views/GoogleSheetsSyncView.js';

import {
  Asset,
  AssetTransaction,
  Category,
  ConsumableItem,
  DashboardStats,
  Employee,
  LocationRecord,
  MaintenanceRecord,
  PhysicalAudit,
  ActivityLog,
  AssetRequest,
  UserSession
} from './types/inventory.js';
import { api, MANAGER_ROLES } from './services/api.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserSession>(() => api.getInitialUser());

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [audits, setAudits] = useState<PhysicalAudit[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>(() => api.getInitialStats());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCallback, setScannerCallback] = useState<((id: string) => void) | null>(null);
  const [scannerTitle, setScannerTitle] = useState('Scan Asset Barcode');

  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

  const [issueModalAsset, setIssueModalAsset] = useState<Asset | null>(null);
  const [returnModalAsset, setReturnModalAsset] = useState<Asset | null>(null);
  const [reportMissingModalAsset, setReportMissingModalAsset] = useState<Asset | null>(null);
  const [resolveMissingModalAsset, setResolveMissingModalAsset] = useState<Asset | null>(null);
  const [editModalAsset, setEditModalAsset] = useState<Asset | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPrefillId, setCreatePrefillId] = useState<string | null>(null);

  const [voucherData, setVoucherData] = useState<{ asset: Asset; transaction: AssetTransaction } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters passed into InventoryView when navigating from Categories / Locations
  const [inventoryLocationFilter, setInventoryLocationFilter] = useState('all');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [missingInitialTab, setMissingInitialTab] = useState<'missing' | 'overdue' | undefined>(undefined);

  const [issueScannedId, setIssueScannedId] = useState<string | null>(null);
  const [issueEmployeeId, setIssueEmployeeId] = useState<string | null>(null);
  const [returnScannedId, setReturnScannedId] = useState<string | null>(null);
  const [scanViewId, setScanViewId] = useState<string | null>(null);

  const canManage = MANAGER_ROLES.includes(currentUser.role);
  const loadSeq = useRef(0);

  const loadData = useCallback(async () => {
    const seq = ++loadSeq.current;
    const results = await Promise.allSettled([
      api.getCurrentUser(),
      api.getDashboardStats(),
      api.getAssets(),
      api.getEmployees(),
      api.getCategories(),
      api.getLocations(),
      api.getConsumables(),
      api.getTransactions(),
      api.getRequests(),
      api.getMaintenance(),
      api.getAudits(),
      api.getActivityLogs()
    ]);
    if (seq !== loadSeq.current) return; // a newer refresh already ran
    const val = <T,>(r: PromiseSettledResult<T>, set: (v: T) => void) => {
      if (r.status === 'fulfilled') set(r.value);
    };
    val(results[0] as PromiseSettledResult<UserSession>, setCurrentUser);
    val(results[1] as PromiseSettledResult<DashboardStats>, setStats);
    val(results[2] as PromiseSettledResult<Asset[]>, setAssets);
    val(results[3] as PromiseSettledResult<Employee[]>, setEmployees);
    val(results[4] as PromiseSettledResult<Category[]>, setCategories);
    val(results[5] as PromiseSettledResult<LocationRecord[]>, setLocations);
    val(results[6] as PromiseSettledResult<ConsumableItem[]>, setConsumables);
    val(results[7] as PromiseSettledResult<AssetTransaction[]>, setTransactions);
    val(results[8] as PromiseSettledResult<AssetRequest[]>, setRequests);
    val(results[9] as PromiseSettledResult<MaintenanceRecord[]>, setMaintenance);
    val(results[10] as PromiseSettledResult<PhysicalAudit[]>, setAudits);
    val(results[11] as PromiseSettledResult<ActivityLog[]>, setActivityLogs);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    setLoadError(failed ? failed.reason?.message || 'Some records could not be loaded.' : api.getSyncError());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    // Live multi-device sync via Firestore listeners.
    const unsubscribe = api.subscribeToCloudSync((payload) => {
      if (payload.assets) setAssets(payload.assets);
      if (payload.employees) setEmployees(payload.employees);
      if (payload.categories) setCategories(payload.categories);
      if (payload.locations) setLocations(payload.locations);
      if (payload.consumables) setConsumables(payload.consumables);
      if (payload.transactions) setTransactions(payload.transactions);
      if (payload.requests) setRequests(payload.requests);
      if (payload.maintenance) setMaintenance(payload.maintenance);
      if (payload.audits) setAudits(payload.audits);
      if (payload.activityLogs) setActivityLogs(payload.activityLogs);
      api.getDashboardStats().then(setStats).catch(() => {});
      if (payload.employees) api.getCurrentUser().then(setCurrentUser).catch(() => {});
    });
    return unsubscribe;
  }, [loadData]);

  // If the active user loses access to the open screen, go back to the dashboard.
  useEffect(() => {
    if (!isTabAllowed(currentTab, currentUser.role)) setCurrentTab('dashboard');
  }, [currentUser.role, currentTab]);

  const navigate = (tab: ViewTab) => {
    // Sidebar navigation always opens screens unfiltered.
    setInventoryCategoryFilter('all');
    setInventoryLocationFilter('all');
    setMissingInitialTab(undefined);
    setCurrentTab(tab);
  };

  // Scanning the same ID twice must trigger a fresh lookup, so clear first.
  const rescan = (set: (v: string | null) => void, id: string) => {
    set(null);
    setTimeout(() => set(id), 0);
  };

  const handleOpenScanner = (callback?: (id: string) => void, title?: string) => {
    setScannerTitle(title || 'Scan Asset Barcode');
    setScannerCallback(() => callback || null);
    setIsScannerOpen(true);
  };

  const handleScanComplete = (scannedAssetId: string) => {
    if (scannerCallback) {
      scannerCallback(scannedAssetId);
      setScannerCallback(null);
    } else {
      // Default: open the Scan screen with this ID looked up.
      rescan(setScanViewId, scannedAssetId);
      setCurrentTab('scan');
    }
  };

  // Always show the latest version of the asset in the detail modal.
  const detailAsset = detailAssetId ? assets.find((a) => a.assetId === detailAssetId) || null : null;
  const detailTransactions = detailAsset ? transactions.filter((t) => t.assetId === detailAsset.assetId) : [];

  const handleOpenDetailModal = (asset: Asset) => setDetailAssetId(asset.assetId);

  const handleCustodySuccess = (updatedAsset: Asset, transaction: AssetTransaction) => {
    loadData();
    setVoucherData({ asset: updatedAsset, transaction });
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await api.deleteAsset(assetId);
    } finally {
      await loadData();
    }
  };

  const handleBatchDeleteAssets = async (assetIds: string[]) => {
    try {
      return await api.deleteMultipleAssets(assetIds);
    } finally {
      await loadData();
    }
  };

  const handleSwitchUser = async (employeeId: string) => {
    try {
      const emp = employees.find((e) => e.employeeId === employeeId);
      const updatedUser = await api.switchRole(emp?.role || 'Employee', employeeId);
      setCurrentUser(updatedUser);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Could not switch user.');
    }
  };

  const handleClearActivityLogs = async () => {
    await api.clearActivityLogs();
    await loadData();
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased">
        <Navbar
          currentUser={currentUser}
          employees={employees}
          onSwitchUser={handleSwitchUser}
          onOpenScanner={() => handleOpenScanner()}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={navigate}
            userRole={currentUser.role}
            counts={{
              overdue: stats?.overdueAssetsCount,
              lowStock: stats?.lowStockItemsCount,
              pendingRequests: stats?.pendingRequestsCount,
              missingLost: stats?.missingLostAssets
            }}
            isOpenMobile={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />

          <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              {loadError && (
                <div className="mb-4 p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-center justify-between gap-3">
                  <span>
                    <strong>Database connection problem:</strong> {loadError}
                  </span>
                  <button onClick={() => loadData()} className="px-2.5 py-1 rounded bg-rose-700 text-white font-semibold shrink-0">
                    Retry
                  </button>
                </div>
              )}
              {isLoading && (
                <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs">Loading records from the database…</div>
              )}

              {currentTab === 'dashboard' && stats && (
                <DashboardView
                  stats={stats}
                  onNavigate={(tab, opts) => {
                    navigate(tab);
                    if (opts?.missingTab) setMissingInitialTab(opts.missingTab);
                  }}
                  onOpenScanner={() => handleOpenScanner()}
                  userRole={currentUser.role}
                />
              )}

              {currentTab === 'scan' && (
                <ScanAssetView
                  assets={assets}
                  transactions={transactions}
                  initialAssetId={scanViewId}
                  onOpenScannerModal={() =>
                    handleOpenScanner((id) => rescan(setScanViewId, id), 'Scan Asset Barcode')
                  }
                  onOpenIssueModal={(a) => setIssueModalAsset(a)}
                  onOpenReturnModal={(a) => setReturnModalAsset(a)}
                  onOpenReportMissingModal={(a) => setReportMissingModalAsset(a)}
                  onOpenResolveStatusModal={(a) => setResolveMissingModalAsset(a)}
                  onOpenEditModal={(a) => setEditModalAsset(a)}
                  onRegisterUnknown={(id) => {
                    setEditModalAsset(null);
                    setCreatePrefillId(id);
                    setIsCreateModalOpen(true);
                  }}
                  onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                  canManage={canManage}
                />
              )}

              {currentTab === 'issue' && (
                <IssueAssetView
                  onOpenScanner={() =>
                    handleOpenScanner((id) => {
                      rescan(setIssueScannedId, id);
                      setCurrentTab('issue');
                    }, 'Scan Asset to Issue')
                  }
                  initialAssetId={issueScannedId}
                  initialEmployeeId={issueEmployeeId}
                  employees={employees}
                  allAssets={assets}
                  locations={locations}
                  onIssueSuccess={(a, tx) => {
                    setIssueScannedId(null);
                    setIssueEmployeeId(null);
                    handleCustodySuccess(a, tx);
                  }}
                  onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                  canManage={canManage}
                />
              )}

              {currentTab === 'return' && (
                <ReturnAssetView
                  onOpenScanner={() =>
                    handleOpenScanner((id) => {
                      rescan(setReturnScannedId, id);
                      setCurrentTab('return');
                    }, 'Scan Returning Asset')
                  }
                  initialAssetId={returnScannedId}
                  allAssets={assets}
                  locations={locations}
                  onReturnSuccess={(a, tx) => {
                    setReturnScannedId(null);
                    handleCustodySuccess(a, tx);
                  }}
                  onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                  canManage={canManage}
                />
              )}

              {currentTab === 'inventory' && (
                <InventoryView
                  assets={assets}
                  categories={categories}
                  locations={locations}
                  initialLocationFilter={inventoryLocationFilter}
                  initialCategoryFilter={inventoryCategoryFilter}
                  onOpenDetailModal={handleOpenDetailModal}
                  onOpenCreateModal={() => {
                    setCreatePrefillId(null);
                    setIsCreateModalOpen(true);
                  }}
                  onOpenEditModal={(a) => setEditModalAsset(a)}
                  onOpenIssueModal={(a) => setIssueModalAsset(a)}
                  onOpenReturnModal={(a) => setReturnModalAsset(a)}
                  onDeleteAsset={handleDeleteAsset}
                  onBatchDeleteAssets={handleBatchDeleteAssets}
                  onRefreshData={loadData}
                  canManage={canManage}
                  canRestoreBackup={currentUser.role === 'Super Admin'}
                />
              )}

              {currentTab === 'consumables' && (
                <ConsumablesView
                  consumables={consumables}
                  employees={employees}
                  locations={locations}
                  onRefresh={loadData}
                  canManage={canManage}
                />
              )}

              {currentTab === 'missing-lost' && (
                <MissingLostView
                  assets={assets}
                  initialTab={missingInitialTab}
                  onOpenReportMissingModal={(a) => setReportMissingModalAsset(a)}
                  onOpenResolveStatusModal={(a) => setResolveMissingModalAsset(a)}
                  onOpenReturnModal={(a) => setReturnModalAsset(a)}
                  onOpenScanner={(cb) => handleOpenScanner(cb, 'Scan Asset to Report Missing')}
                  canManage={canManage}
                />
              )}

              {currentTab === 'employees' && (
                <EmployeesView
                  employees={employees}
                  allAssets={assets}
                  transactions={transactions}
                  locations={locations}
                  userRole={currentUser.role}
                  currentUser={currentUser}
                  onOpenIssueForEmployee={(empId) => {
                    setIssueEmployeeId(empId);
                    setIssueScannedId(null);
                    setCurrentTab('issue');
                  }}
                  onOpenReturnForAsset={(a) => setReturnModalAsset(a)}
                  onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                  onRefreshData={loadData}
                  onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
                  canManage={canManage}
                />
              )}

              {currentTab === 'categories' && (
                <CategoriesView
                  categories={categories}
                  allAssets={assets}
                  canManage={canManage}
                  onRefreshData={loadData}
                  onSelectCategory={(catId) => {
                    setInventoryCategoryFilter(catId);
                    setInventoryLocationFilter('all');
                    setCurrentTab('inventory');
                  }}
                />
              )}

              {currentTab === 'locations' && (
                <LocationsView
                  locations={locations}
                  allAssets={assets}
                  canManage={canManage}
                  onRefreshData={loadData}
                  onSelectLocation={(locStr) => {
                    setInventoryLocationFilter(locStr);
                    setInventoryCategoryFilter('all');
                    setCurrentTab('inventory');
                  }}
                />
              )}

              {currentTab === 'requests' && (
                <RequestsView
                  requests={requests}
                  employees={employees}
                  currentUser={currentUser}
                  userRole={currentUser.role}
                  onRefresh={loadData}
                />
              )}

              {currentTab === 'maintenance' && (
                <MaintenanceView maintenance={maintenance} assets={assets} onRefresh={loadData} canManage={canManage} />
              )}

              {currentTab === 'audits' && (
                <StockAuditsView
                  audits={audits}
                  locations={locations}
                  onOpenScanner={(cb) => handleOpenScanner(cb, 'Scan Asset for Audit')}
                  onRefresh={loadData}
                  canManage={canManage}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView assets={assets} transactions={transactions} consumables={consumables} employees={employees} />
              )}

              {currentTab === 'activity' && (
                <ActivityLogsView logs={activityLogs} userRole={currentUser.role} onClearHistory={handleClearActivityLogs} />
              )}

              {currentTab === 'sheets' && <GoogleSheetsSyncView onRefresh={loadData} canManage={canManage} />}
            </div>
          </main>
        </div>

        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScannerCallback(null);
          }}
          onScan={handleScanComplete}
          title={scannerTitle}
        />

        <AssetDetailModal
          isOpen={!!detailAsset}
          onClose={() => setDetailAssetId(null)}
          asset={detailAsset}
          transactions={detailTransactions}
          onOpenIssue={(a) => setIssueModalAsset(a)}
          onOpenReturn={(a) => setReturnModalAsset(a)}
          onOpenReportMissing={(a) => setReportMissingModalAsset(a)}
          onOpenResolveStatus={(a) => setResolveMissingModalAsset(a)}
          onOpenEdit={(a) => setEditModalAsset(a)}
          canManage={canManage}
        />

        <IssueAssetModal
          isOpen={!!issueModalAsset}
          onClose={() => setIssueModalAsset(null)}
          asset={issueModalAsset}
          employees={employees}
          locations={locations}
          onSuccess={handleCustodySuccess}
        />

        <ReturnAssetModal
          isOpen={!!returnModalAsset}
          onClose={() => setReturnModalAsset(null)}
          asset={returnModalAsset}
          locations={locations}
          onSuccess={handleCustodySuccess}
        />

        <ReportMissingModal
          isOpen={!!reportMissingModalAsset}
          onClose={() => setReportMissingModalAsset(null)}
          asset={reportMissingModalAsset}
          onSuccess={() => loadData()}
        />

        <ResolveMissingModal
          isOpen={!!resolveMissingModalAsset}
          onClose={() => setResolveMissingModalAsset(null)}
          asset={resolveMissingModalAsset}
          locations={locations}
          onSuccess={() => loadData()}
        />

        <AssetFormModal
          isOpen={isCreateModalOpen || !!editModalAsset}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditModalAsset(null);
            setCreatePrefillId(null);
          }}
          assetToEdit={editModalAsset}
          initialAssetId={createPrefillId}
          categories={categories}
          locations={locations}
          existingAssets={assets}
          onSuccess={() => loadData()}
        />

        {voucherData && (
          <HandoverReceiptModal
            isOpen={true}
            onClose={() => setVoucherData(null)}
            asset={voucherData.asset}
            transaction={voucherData.transaction}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
