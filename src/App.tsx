/**
 * WANG Office Inventory Management System
 * Welfare Association for New Generation (WANG)
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar, ViewTab } from './components/Sidebar.js';
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
  UserRole, 
  UserSession 
} from './types/inventory.js';
import { api } from './services/api.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserSession>(() => api.getInitialUser());

  // Data states initialized synchronously from template seed to eliminate render delays
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

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCallback, setScannerCallback] = useState<((id: string) => void) | null>(null);
  const [scannerTitle, setScannerTitle] = useState('Scan Asset Barcode');
  
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<AssetTransaction[]>([]);

  const [issueModalAsset, setIssueModalAsset] = useState<Asset | null>(null);
  const [returnModalAsset, setReturnModalAsset] = useState<Asset | null>(null);
  const [reportMissingModalAsset, setReportMissingModalAsset] = useState<Asset | null>(null);
  const [resolveMissingModalAsset, setResolveMissingModalAsset] = useState<Asset | null>(null);
  const [editModalAsset, setEditModalAsset] = useState<Asset | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [voucherData, setVoucherData] = useState<{ asset: Asset; transaction: AssetTransaction } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const canManage = currentUser.role === 'Super Admin' || currentUser.role === 'Inventory Manager';

  const loadData = async () => {
    try {
      const [
        userRes,
        statsRes,
        assetsRes,
        empRes,
        catRes,
        locRes,
        conRes,
        txRes,
        reqRes,
        mntRes,
        audRes,
        logRes
      ] = await Promise.all([
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

      setCurrentUser(userRes);
      setStats(statsRes);
      setAssets(assetsRes);
      setEmployees(empRes);
      setCategories(catRes);
      setLocations(locRes);
      setConsumables(conRes);
      setTransactions(txRes);
      setRequests(reqRes);
      setMaintenance(mntRes);
      setAudits(audRes);
      setActivityLogs(logRes);
    } catch (err) {
      console.error('Failed to load WANG database records', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick scanner handler
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
      // Default: Navigate to scan view and lookup
      setCurrentTab('scan');
      const found = assets.find(a => a.assetId === scannedAssetId);
      if (found) {
        handleOpenDetailModal(found);
      }
    }
  };

  const handleOpenDetailModal = async (asset: Asset) => {
    try {
      const res = await api.getAssetById(asset.assetId);
      setDetailAsset(res.asset);
      setDetailTransactions(res.transactions);
    } catch {
      setDetailAsset(asset);
      setDetailTransactions([]);
    }
  };

  const handleIssueSuccess = (updatedAsset: Asset, transaction: AssetTransaction) => {
    loadData();
    setVoucherData({ asset: updatedAsset, transaction });
  };

  const handleReturnSuccess = (updatedAsset: Asset, transaction: AssetTransaction) => {
    loadData();
    setVoucherData({ asset: updatedAsset, transaction });
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await api.deleteAsset(assetId);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete asset:', err);
      alert(err?.message || 'Failed to delete asset.');
    }
  };

  const handleSwitchRole = async (role: UserRole) => {
    try {
      const updatedUser = await api.switchRole(role);
      setCurrentUser(updatedUser);
      loadData();
    } catch (err) {
      console.error('Failed to switch role', err);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset WANG Inventory database to initial template seed data?')) {
      await api.resetDemoData();
      await loadData();
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100 font-sans flex flex-col text-slate-900 antialiased">
      {/* Top Header Navbar */}
      <Navbar
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        onOpenScanner={() => handleOpenScanner()}
        onResetDemo={handleResetDemo}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
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

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {currentTab === 'dashboard' && stats && (
              <DashboardView
                stats={stats}
                onNavigate={setCurrentTab}
                onOpenScanner={() => handleOpenScanner()}
                userRole={currentUser.role}
              />
            )}

            {currentTab === 'scan' && (
              <ScanAssetView
                onOpenScannerModal={() => handleOpenScanner()}
                onOpenIssueModal={(a) => setIssueModalAsset(a)}
                onOpenReturnModal={(a) => setReturnModalAsset(a)}
                onOpenReportMissingModal={(a) => setReportMissingModalAsset(a)}
                onOpenResolveStatusModal={(a) => setResolveMissingModalAsset(a)}
                onOpenEditModal={(a) => setEditModalAsset(a)}
                onRegisterUnknown={(id) => {
                  setEditModalAsset(null);
                  setIsCreateModalOpen(true);
                }}
                onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                canManage={canManage}
              />
            )}

            {currentTab === 'issue' && (
              <IssueAssetView
                onOpenScanner={() => handleOpenScanner((id) => {
                  setCurrentTab('issue');
                }, 'Scan Asset to Issue')}
                employees={employees}
                allAssets={assets}
                onIssueSuccess={handleIssueSuccess}
                onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                canManage={canManage}
              />
            )}

            {currentTab === 'return' && (
              <ReturnAssetView
                onOpenScanner={() => handleOpenScanner((id) => {
                  setCurrentTab('return');
                }, 'Scan Returning Asset')}
                allAssets={assets}
                onReturnSuccess={handleReturnSuccess}
                onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                canManage={canManage}
              />
            )}

            {currentTab === 'inventory' && (
              <InventoryView
                assets={assets}
                categories={categories}
                locations={locations}
                onOpenDetailModal={handleOpenDetailModal}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onOpenEditModal={(a) => setEditModalAsset(a)}
                onOpenIssueModal={(a) => setIssueModalAsset(a)}
                onOpenReturnModal={(a) => setReturnModalAsset(a)}
                onDeleteAsset={handleDeleteAsset}
                onRefreshData={loadData}
                canManage={canManage}
              />
            )}

            {currentTab === 'consumables' && (
              <ConsumablesView
                consumables={consumables}
                employees={employees}
                onRefresh={loadData}
                canManage={canManage}
              />
            )}

            {currentTab === 'missing-lost' && (
              <MissingLostView
                assets={assets}
                onOpenReportMissingModal={(a) => setReportMissingModalAsset(a)}
                onOpenResolveStatusModal={(a) => setResolveMissingModalAsset(a)}
                onOpenReturnModal={(a) => setReturnModalAsset(a)}
                canManage={canManage}
              />
            )}

            {currentTab === 'employees' && (
              <EmployeesView
                employees={employees}
                allAssets={assets}
                userRole={currentUser.role}
                onOpenIssueForEmployee={(empId) => {
                  const available = assets.find(a => a.status === 'Available');
                  if (available) setIssueModalAsset(available);
                }}
                onOpenReturnForAsset={(a) => setReturnModalAsset(a)}
                onPrintVoucher={(a, tx) => setVoucherData({ asset: a, transaction: tx })}
                canManage={canManage}
              />
            )}

            {currentTab === 'categories' && (
              <CategoriesView
                categories={categories}
                onSelectCategory={(catId) => {
                  setCurrentTab('inventory');
                }}
              />
            )}

            {currentTab === 'locations' && (
              <LocationsView
                locations={locations}
                onSelectLocation={(locStr) => {
                  setCurrentTab('inventory');
                }}
              />
            )}

            {currentTab === 'requests' && (
              <RequestsView
                requests={requests}
                employees={employees}
                userRole={currentUser.role}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'maintenance' && (
              <MaintenanceView
                maintenance={maintenance}
                assets={assets}
                onRefresh={loadData}
                canManage={canManage}
              />
            )}

            {currentTab === 'audits' && (
              <StockAuditsView
                audits={audits}
                onOpenScanner={() => handleOpenScanner()}
                onRefresh={loadData}
                canManage={canManage}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                assets={assets}
                transactions={transactions}
                consumables={consumables}
                employees={employees}
              />
            )}

            {currentTab === 'activity' && (
              <ActivityLogsView logs={activityLogs} />
            )}

            {currentTab === 'sheets' && (
              <GoogleSheetsSyncView
                onRefresh={loadData}
                canManage={canManage}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Interactive Workflows & Modals */}

      {/* 1. Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScannerCallback(null);
        }}
        onScan={handleScanComplete}
        title={scannerTitle}
      />

      {/* 2. Asset Profile & History Inspector */}
      <AssetDetailModal
        isOpen={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        asset={detailAsset}
        transactions={detailTransactions}
        onOpenIssue={(a) => setIssueModalAsset(a)}
        onOpenReturn={(a) => setReturnModalAsset(a)}
        onOpenReportMissing={(a) => setReportMissingModalAsset(a)}
        onOpenResolveStatus={(a) => setResolveMissingModalAsset(a)}
        onOpenEdit={(a) => setEditModalAsset(a)}
        canManage={canManage}
      />

      {/* 3. Issue Asset Modal */}
      <IssueAssetModal
        isOpen={!!issueModalAsset}
        onClose={() => setIssueModalAsset(null)}
        asset={issueModalAsset}
        employees={employees}
        onSuccess={handleIssueSuccess}
      />

      {/* 4. Return Asset Modal */}
      <ReturnAssetModal
        isOpen={!!returnModalAsset}
        onClose={() => setReturnModalAsset(null)}
        asset={returnModalAsset}
        onSuccess={handleReturnSuccess}
      />

      {/* 5. Report Missing or Lost Modal */}
      <ReportMissingModal
        isOpen={!!reportMissingModalAsset}
        onClose={() => setReportMissingModalAsset(null)}
        asset={reportMissingModalAsset}
        onSuccess={() => loadData()}
      />

      {/* 6. Resolve Missing / Lost Modal */}
      <ResolveMissingModal
        isOpen={!!resolveMissingModalAsset}
        onClose={() => setResolveMissingModalAsset(null)}
        asset={resolveMissingModalAsset}
        onSuccess={() => loadData()}
      />

      {/* 7. Asset Registration & Edit Modal */}
      <AssetFormModal
        isOpen={isCreateModalOpen || !!editModalAsset}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditModalAsset(null);
        }}
        assetToEdit={editModalAsset}
        categories={categories}
        locations={locations}
        existingAssets={assets}
        onSuccess={() => loadData()}
      />

      {/* 8. Printable Handover / Return Receipt Voucher */}
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
