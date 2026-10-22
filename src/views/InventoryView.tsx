import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  PlusCircle, 
  Download, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  X,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  MapPin,
  Building2,
  AlertCircle,
  Tag,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { Asset, Category, LocationRecord } from '../types/inventory.js';
import { api } from '../services/api.js';

interface InventoryViewProps {
  assets: Asset[];
  categories: Category[];
  locations: LocationRecord[];
  initialLocationFilter?: string;
  initialCategoryFilter?: string;
  onOpenDetailModal: (asset: Asset) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (asset: Asset) => void;
  onOpenIssueModal: (asset: Asset) => void;
  onOpenReturnModal: (asset: Asset) => void;
  onDeleteAsset?: (assetId: string) => Promise<void> | void;
  onBatchDeleteAssets?: (assetIds: string[]) => Promise<void> | void;
  onRefreshData?: () => void;
  canManage: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  assets,
  categories,
  locations,
  initialLocationFilter = 'all',
  initialCategoryFilter = 'all',
  onOpenDetailModal,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenIssueModal,
  onOpenReturnModal,
  onDeleteAsset,
  onBatchDeleteAssets,
  onRefreshData,
  canManage
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(initialCategoryFilter);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState(initialLocationFilter);

  // Sync if initial filters change from navigation
  useEffect(() => {
    if (initialCategoryFilter && initialCategoryFilter !== 'all') {
      setSelectedCat(initialCategoryFilter);
    }
  }, [initialCategoryFilter]);

  useEffect(() => {
    if (initialLocationFilter && initialLocationFilter !== 'all') {
      setSelectedLocation(initialLocationFilter);
    }
  }, [initialLocationFilter]);

  // Multi-Selection State for Bulk / Batch Operations
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Single Delete modal state
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Batch Delete modal state
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // File input for restoring JSON backup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Dynamic distinct locations from registered locations list
  const distinctLocations = useMemo(() => {
    const branches = new Set<string>();
    locations.forEach(l => {
      if (l.officeBranch) branches.add(l.officeBranch);
    });
    return Array.from(branches).sort();
  }, [locations]);

  // Quick stats summary
  const stats = useMemo(() => {
    return {
      total: assets.length,
      available: assets.filter(a => a.status === 'Available').length,
      issued: assets.filter(a => a.status === 'Issued').length,
      maintenance: assets.filter(a => a.status === 'Under Maintenance').length,
      missingLost: assets.filter(a => a.status === 'Missing' || a.status === 'Lost').length
    };
  }, [assets]);

  // Filtered Assets
  const filtered = useMemo(() => {
    return assets.filter(a => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        a.assetId.toLowerCase().includes(q) ||
        a.itemName.toLowerCase().includes(q) ||
        (a.brand && a.brand.toLowerCase().includes(q)) ||
        (a.model && a.model.toLowerCase().includes(q)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(q)) ||
        (a.assignedEmployeeId && a.assignedEmployeeId.toLowerCase().includes(q)) ||
        (a.buildingRoom && a.buildingRoom.toLowerCase().includes(q));

      const matchesCat = selectedCat === 'all' || 
        a.categoryId?.toLowerCase() === selectedCat.toLowerCase() || 
        a.categoryName?.toLowerCase() === selectedCat.toLowerCase() ||
        a.categoryId?.replace(/^CAT-/, '').toLowerCase() === selectedCat.toLowerCase();

      const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
      const matchesCond = selectedCondition === 'all' || a.condition === selectedCondition;
      const matchesLoc = selectedLocation === 'all' || 
        a.officeBranch?.toLowerCase() === selectedLocation.toLowerCase() || 
        (a.buildingRoom && a.buildingRoom.toLowerCase().includes(selectedLocation.toLowerCase()));

      return matchesSearch && matchesCat && matchesStatus && matchesCond && matchesLoc;
    });
  }, [assets, search, selectedCat, selectedStatus, selectedCondition, selectedLocation]);

  // Check if all filtered are selected
  const allFilteredSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every(a => selectedAssetIds.has(a.assetId));
  }, [filtered, selectedAssetIds]);

  const someFilteredSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.some(a => selectedAssetIds.has(a.assetId)) && !allFilteredSelected;
  }, [filtered, selectedAssetIds, allFilteredSelected]);

  // Toggle individual asset selection
  const toggleSelectAsset = (assetId: string) => {
    const updated = new Set(selectedAssetIds);
    if (updated.has(assetId)) {
      updated.delete(assetId);
    } else {
      updated.add(assetId);
    }
    setSelectedAssetIds(updated);
  };

  // Toggle Select All filtered assets
  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      const updated = new Set(selectedAssetIds);
      filtered.forEach(a => updated.delete(a.assetId));
      setSelectedAssetIds(updated);
    } else {
      // Select all filtered
      const updated = new Set(selectedAssetIds);
      filtered.forEach(a => updated.add(a.assetId));
      setSelectedAssetIds(updated);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedAssetIds(new Set());
  };

  // Single Delete Handler
  const handleConfirmSingleDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (onDeleteAsset) {
        await onDeleteAsset(assetToDelete.assetId);
      } else {
        await api.deleteAsset(assetToDelete.assetId);
        if (onRefreshData) onRefreshData();
      }
      setSelectedAssetIds(prev => {
        const next = new Set(prev);
        next.delete(assetToDelete.assetId);
        return next;
      });
      setSuccessToast(`Asset ${assetToDelete.assetId} deleted permanently.`);
      setAssetToDelete(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Delete Handler
  const handleConfirmBatchDelete = async () => {
    const ids = Array.from(selectedAssetIds);
    if (ids.length === 0) return;

    setIsBatchDeleting(true);
    setBatchDeleteError(null);
    try {
      if (onBatchDeleteAssets) {
        await onBatchDeleteAssets(ids);
      } else {
        await api.deleteMultipleAssets(ids);
        if (onRefreshData) onRefreshData();
      }
      setSelectedAssetIds(new Set());
      setIsBatchDeleteModalOpen(false);
      setSuccessToast(`Successfully deleted ${ids.length} assets.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setBatchDeleteError(err?.message || 'Failed to delete selected assets.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Selected Assets Objects
  const selectedAssetsList = useMemo(() => {
    return assets.filter(a => selectedAssetIds.has(a.assetId));
  }, [assets, selectedAssetIds]);

  // Check if any selected asset is currently Issued
  const selectedIssuedCount = useMemo(() => {
    return selectedAssetsList.filter(a => a.status === 'Issued').length;
  }, [selectedAssetsList]);

  // Export CSV (Exports either selected or filtered assets)
  const handleExportCSV = (exportOnlySelected = false) => {
    const listToExport = exportOnlySelected ? selectedAssetsList : filtered;
    if (listToExport.length === 0) {
      alert('No assets available to export.');
      return;
    }

    const headers = [
      'Asset ID', 'Item Name', 'Category', 'Brand', 'Model', 'Serial Number',
      'Location / Branch', 'Building Room', 'Status', 'Condition', 'Assigned To', 'Assigned ID',
      'Cost (PKR)', 'Purchase Date', 'Supplier', 'Warranty Expiry', 'Completion'
    ];

    const rows = listToExport.map(a => [
      `"${a.assetId}"`,
      `"${a.itemName?.replace(/"/g, '""') || ''}"`,
      `"${a.categoryName?.replace(/"/g, '""') || ''}"`,
      `"${a.brand?.replace(/"/g, '""') || ''}"`,
      `"${a.model?.replace(/"/g, '""') || ''}"`,
      `"${a.serialNumber?.replace(/"/g, '""') || ''}"`,
      `"${a.officeBranch?.replace(/"/g, '""') || ''}"`,
      `"${a.buildingRoom?.replace(/"/g, '""') || ''}"`,
      `"${a.status}"`,
      `"${a.condition}"`,
      `"${a.assignedTo?.replace(/"/g, '""') || ''}"`,
      `"${a.assignedEmployeeId || ''}"`,
      `"${a.purchaseCost || 0}"`,
      `"${a.purchaseDate || ''}"`,
      `"${a.supplier?.replace(/"/g, '""') || ''}"`,
      `"${a.warrantyExpiry || ''}"`,
      `"${a.recordCompletion || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WANG_Master_Assets_${exportOnlySelected ? 'Selected_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = api.importFullBackup(text);
        if (res.success) {
          setBackupMessage(res.message);
          if (onRefreshData) onRefreshData();
          setTimeout(() => setBackupMessage(null), 5000);
        } else {
          alert('Error restoring backup: ' + res.message);
        }
      } catch (err: any) {
        alert('Failed to parse backup JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">Available</span>;
      case 'Issued':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#003279]/10 text-[#003279] border border-[#003279]/30">Issued</span>;
      case 'Under Maintenance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">Maintenance</span>;
      case 'Missing':
      case 'Lost':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">{status}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#003279] text-[#f1cc11] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Boxes className="w-6 h-6 text-[#f1cc11]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Master Asset Register</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f1cc11] text-[#003279]">
                  {assets.length} Assets
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Central physical asset registry, barcodes, custody verification & equipment logs
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-[#003279] hover:bg-[#002254] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#f1cc11]" />
                <span>Register Asset</span>
              </button>
            )}

            <button
              onClick={() => handleExportCSV(false)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#003279]" />
              <span>Export CSV</span>
            </button>

            {/* Hidden file input for restore */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreFile}
              accept=".json"
              className="hidden"
            />
            {canManage && (
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Restore inventory from JSON backup"
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Restore DB</span>
              </button>
            )}
          </div>
        </div>

        {/* Success toast notification */}
        {successToast && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Backup message banner */}
        {backupMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupMessage}</span>
          </div>
        )}

        {/* Quick Filter Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-[#003279] text-white border-[#003279] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">All Assets</div>
            <div className={`text-lg font-black ${selectedStatus === 'all' ? 'text-[#f1cc11]' : 'text-slate-900'}`}>
              {stats.total}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('Available')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'Available'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">Available (In Store)</div>
            <div className="text-lg font-black text-emerald-700">
              {stats.available}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('Issued')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'Issued'
                ? 'bg-[#003279] text-white border-[#003279] shadow-xs'
                : 'bg-blue-50 text-[#003279] border-blue-200 hover:bg-blue-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">Issued (In Custody)</div>
            <div className="text-lg font-black text-[#003279]">
              {stats.issued}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('Under Maintenance')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'Under Maintenance'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">Maintenance</div>
            <div className="text-lg font-black text-amber-700">
              {stats.maintenance}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('Missing')}
            className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 cursor-pointer ${
              selectedStatus === 'Missing'
                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">Missing / Lost</div>
            <div className="text-lg font-black text-rose-700">
              {stats.missingLost}
            </div>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main search input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, item name, brand, employee, room..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName} ({c.categoryId.replace(/^CAT-/, '')})
                </option>
              ))}
            </select>
          </div>

          {/* Condition filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="all">All Conditions</option>
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Needs Repair">Needs Repair</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>

          {/* Location filter */}
          <div className="md:col-span-2">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="all">All Locations</option>
              {distinctLocations.map((loc) => (
                <option key={loc} value={loc}>📍 {loc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search, Filter Categories & Selection Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Active filter count & Reset */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{assets.length}</strong> assets
            </span>
            {(search || selectedCat !== 'all' || selectedStatus !== 'all' || selectedCondition !== 'all' || selectedLocation !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCat('all');
                  setSelectedStatus('all');
                  setSelectedCondition('all');
                  setSelectedLocation('all');
                }}
                className="text-[#003279] hover:underline font-bold cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Table-top Select All and Batch Delete Controls right alongside filter categories */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                allFilteredSelected
                  ? 'bg-[#003279] text-white border border-[#003279]'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
              }`}
              title="Select or deselect all visible assets"
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-[#f1cc11]" />
              ) : someFilteredSelected ? (
                <MinusSquare className="w-4 h-4 text-[#003279]" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{allFilteredSelected ? 'Deselect All' : `Select All (${filtered.length})`}</span>
            </button>

            {canManage && (
              <button
                type="button"
                disabled={selectedAssetIds.size === 0}
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title={selectedAssetIds.size === 0 ? 'Select assets using checkboxes first to delete' : `Delete ${selectedAssetIds.size} selected assets`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected {selectedAssetIds.size > 0 ? `(${selectedAssetIds.size})` : ''}</span>
              </button>
            )}

            {selectedAssetIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer ml-1"
              >
                Clear
              </button>
            )}

            {selectedAssetIds.size > 0 && (
              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#003279]" />
                <span>Export ({selectedAssetIds.size})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Asset Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003279] text-white font-semibold">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-[#003279] rounded cursor-pointer accent-[#f1cc11]"
                    title="Select or deselect all visible assets"
                  />
                </th>
                <th className="py-3 px-3 tracking-wide font-bold">Asset ID</th>
                <th className="py-3 px-4 tracking-wide font-bold">Item & Model</th>
                <th className="py-3 px-3 tracking-wide font-bold">Category</th>
                <th className="py-3 px-3 tracking-wide font-bold">Location & Room</th>
                <th className="py-3 px-3 tracking-wide font-bold">Custodian</th>
                <th className="py-3 px-3 tracking-wide font-bold">Condition</th>
                <th className="py-3 px-3 tracking-wide font-bold">Status</th>
                <th className="py-3 px-4 tracking-wide font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-800">No assets found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || selectedCat !== 'all' || selectedStatus !== 'all'
                        ? 'Try clearing your active filters or search keyword.'
                        : 'No assets registered in the system yet.'}
                    </p>
                    {canManage && (
                      <button
                        onClick={onOpenCreateModal}
                        className="mt-3 px-3 py-1.5 bg-[#003279] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#f1cc11]" />
                        <span>Register First Asset</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => {
                  const isSelected = selectedAssetIds.has(asset.assetId);
                  return (
                    <tr 
                      key={asset.assetId} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-blue-50/80 hover:bg-blue-100/60' 
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectAsset(asset.assetId)}
                          className="w-4 h-4 text-[#003279] rounded cursor-pointer accent-[#003279]"
                        />
                      </td>

                      {/* Asset ID */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#003279] bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/80 inline-block shadow-2xs">
                          {asset.assetId}
                        </span>
                      </td>

                      {/* Item Name & Specs */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{asset.itemName}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {asset.brand} {asset.model} {asset.serialNumber ? `• SN: ${asset.serialNumber}` : ''}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{asset.categoryId.replace(/^CAT-/, '')}</span>
                        </span>
                      </td>

                      {/* Location / Room */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{asset.officeBranch}</div>
                        <div className="text-[11px] text-slate-500">{asset.buildingRoom}</div>
                      </td>

                      {/* Custodian */}
                      <td className="py-3 px-3">
                        {asset.assignedTo ? (
                          <div>
                            <div className="font-semibold text-slate-900">{asset.assignedTo}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{asset.assignedEmployeeId}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned (Store)</span>
                        )}
                      </td>

                      {/* Condition */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`text-[11px] font-bold ${
                          asset.condition === 'New' ? 'text-emerald-700' :
                          asset.condition === 'Good' ? 'text-blue-700' :
                          asset.condition === 'Fair' ? 'text-slate-600' :
                          'text-amber-700'
                        }`}>
                          • {asset.condition}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(asset.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenDetailModal(asset)}
                            title="View Asset Profile & History"
                            className="p-1.5 text-slate-600 hover:text-[#003279] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <button
                              onClick={() => onOpenEditModal(asset)}
                              title="Edit Asset Details"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={() => {
                                setAssetToDelete(asset);
                                setDeleteError(null);
                              }}
                              title="Delete Asset"
                              className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filtered.length}</strong> of <strong className="text-slate-800">{assets.length}</strong> master assets
            {selectedAssetIds.size > 0 && (
              <span className="ml-2 font-bold text-[#003279]">
                • {selectedAssetIds.size} row(s) selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportCSV(false)}
              className="text-[#003279] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE ASSET DELETE CONFIRMATION MODAL */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Asset Record</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete asset <strong className="text-slate-900">{assetToDelete.assetId}</strong> ({assetToDelete.itemName})?
            </p>

            {assetToDelete.status === 'Issued' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Notice: </span>
                  This asset is currently in custody of <strong>{assetToDelete.assignedTo}</strong>. Deleting it will purge the assignment record.
                </div>
              </div>
            )}

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH / BULK ASSETS DELETE CONFIRMATION MODAL */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete {selectedAssetIds.size} Selected Assets</h3>
                <p className="text-xs text-slate-500">This action will permanently delete all selected asset records.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              You are about to delete <strong className="text-slate-900">{selectedAssetIds.size}</strong> asset(s) from the WANG Master Registry.
            </p>

            {/* List preview of selected items */}
            <div className="max-h-36 overflow-y-auto mb-4 border border-slate-200 rounded-xl p-2.5 bg-slate-50 divide-y divide-slate-100">
              {selectedAssetsList.map(a => (
                <div key={a.assetId} className="py-1 text-xs flex items-center justify-between text-slate-700">
                  <span className="font-mono font-bold text-[#003279]">{a.assetId}</span>
                  <span className="truncate max-w-[200px] text-slate-600">{a.itemName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">{a.status}</span>
                </div>
              ))}
            </div>

            {selectedIssuedCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Notice ({selectedIssuedCount} Issued): </span>
                  {selectedIssuedCount} of the selected assets are currently Issued to employees. Deleting them will remove active custody records.
                </div>
              </div>
            )}

            {batchDeleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{batchDeleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isBatchDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting {selectedAssetIds.size} Assets...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete All ({selectedAssetIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
