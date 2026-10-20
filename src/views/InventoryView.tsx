import React, { useState, useMemo, useRef } from 'react';
import { 
  Boxes, 
  Search, 
  PlusCircle, 
  Download, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { Asset, Category, LocationRecord } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface InventoryViewProps {
  assets: Asset[];
  categories: Category[];
  locations: LocationRecord[];
  onOpenDetailModal: (asset: Asset) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (asset: Asset) => void;
  onOpenIssueModal: (asset: Asset) => void;
  onOpenReturnModal: (asset: Asset) => void;
  onDeleteAsset?: (assetId: string) => Promise<void> | void;
  onRefreshData?: () => void;
  canManage: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  assets,
  categories,
  locations,
  onOpenDetailModal,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenIssueModal,
  onOpenReturnModal,
  onDeleteAsset,
  onRefreshData,
  canManage
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // Delete confirmation modal state
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // File input for restoring JSON backup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

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
        (a.assignedEmployeeId && a.assignedEmployeeId.toLowerCase().includes(q));

      const matchesCat = selectedCat === 'all' || a.categoryId === selectedCat || a.categoryName === selectedCat;
      const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
      const matchesCond = selectedCondition === 'all' || a.condition === selectedCondition;
      const matchesLoc = selectedLocation === 'all' || a.officeBranch === selectedLocation || (a.buildingRoom && a.buildingRoom.includes(selectedLocation));

      return matchesSearch && matchesCat && matchesStatus && matchesCond && matchesLoc;
    });
  }, [assets, search, selectedCat, selectedStatus, selectedCondition, selectedLocation]);

  const handleExportCSV = () => {
    const headers = [
      'Asset ID', 'Item Name', 'Category', 'Brand', 'Model', 'Serial Number',
      'Location', 'Building Room', 'Status', 'Condition', 'Assigned To', 'Assigned ID',
      'Purchase Date', 'Cost (USD)', 'Supplier', 'Warranty Expiry', 'Completion'
    ];

    const rows = filtered.map(a => [
      `"${a.assetId}"`,
      `"${a.itemName}"`,
      `"${a.categoryName}"`,
      `"${a.brand || ''}"`,
      `"${a.model || ''}"`,
      `"${a.serialNumber || ''}"`,
      `"${a.officeBranch || ''}"`,
      `"${a.buildingRoom || ''}"`,
      `"${a.status}"`,
      `"${a.condition}"`,
      `"${a.assignedTo || ''}"`,
      `"${a.assignedEmployeeId || ''}"`,
      `"${a.purchaseDate || ''}"`,
      a.purchaseCost || 0,
      `"${a.supplier || ''}"`,
      `"${a.warrantyExpiry || ''}"`,
      `"${a.recordCompletion || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WANG_Master_Assets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDelete = async () => {
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
      setAssetToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Available</span>;
      case 'Issued':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#003279]/10 text-[#003279] border border-[#003279]/30">Issued</span>;
      case 'Under Maintenance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Maintenance</span>;
      case 'Missing':
      case 'Lost':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">{status}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#003279] text-[#f1cc11] flex items-center justify-center font-bold shadow-xs">
                <Boxes className="w-5 h-5 text-[#f1cc11]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Master Asset Register
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f1cc11] text-[#003279]">
                    {assets.length} Total
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  WANG official central asset database, custody tracking, and physical inventory registry.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-[#003279] hover:bg-[#002254] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-[#f1cc11]" />
                <span>Add New Asset</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
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
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Restore DB</span>
              </button>
            )}
          </div>
        </div>

        {/* Backup message banner */}
        {backupMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupMessage}</span>
          </div>
        )}

        {/* Quick Filter Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`p-3 rounded-lg border text-left transition-all ${
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
            className={`p-3 rounded-lg border text-left transition-all ${
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
            className={`p-3 rounded-lg border text-left transition-all ${
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
            className={`p-3 rounded-lg border text-left transition-all ${
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
            className={`p-3 rounded-lg border text-left transition-all col-span-2 sm:col-span-1 ${
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
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main search input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID (e.g. WANG-ELE-001), item name, brand, employee..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Condition filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
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
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="all">All Locations</option>
              <option value="Head Office - Islamabad">Islamabad Head Office</option>
              <option value="Field Office - Quetta">Quetta Field Office</option>
            </select>
          </div>
        </div>

        {/* Active filter count & Reset */}
        {(search || selectedCat !== 'all' || selectedStatus !== 'all' || selectedCondition !== 'all' || selectedLocation !== 'all') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{assets.length}</strong> items matching filters
            </span>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCat('all');
                setSelectedStatus('all');
                setSelectedCondition('all');
                setSelectedLocation('all');
              }}
              className="text-[#003279] hover:underline font-semibold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Asset Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003279] text-white font-semibold">
                <th className="py-3 px-4 tracking-wide">Asset ID</th>
                <th className="py-3 px-4 tracking-wide">Item & Specifications</th>
                <th className="py-3 px-4 tracking-wide">Category</th>
                <th className="py-3 px-4 tracking-wide">Location / Room</th>
                <th className="py-3 px-4 tracking-wide">Current Custodian</th>
                <th className="py-3 px-4 tracking-wide">Condition</th>
                <th className="py-3 px-4 tracking-wide">Status</th>
                <th className="py-3 px-4 tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No assets match your search or filter criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the search terms or register a new asset.</p>
                    {canManage && (
                      <button
                        onClick={onOpenCreateModal}
                        className="mt-3 px-4 py-2 bg-[#003279] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4 text-[#f1cc11]" />
                        <span>Register First Asset</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => (
                  <tr 
                    key={asset.assetId} 
                    className="hover:bg-slate-50/90 transition-colors"
                  >
                    {/* Asset ID & Barcode */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-[#003279] tracking-wider text-xs">
                        <span className="px-2 py-0.5 rounded bg-[#003279]/10 text-[#003279] font-mono font-bold">
                          {asset.assetId}
                        </span>
                      </div>
                    </td>

                    {/* Item Name, Brand, Model */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {asset.itemName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {[asset.brand, asset.model].filter(Boolean).join(' · ')}
                        {asset.serialNumber ? (
                          <span className="font-mono text-slate-400"> (S/N: {asset.serialNumber})</span>
                        ) : null}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">{asset.categoryName}</span>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{asset.officeBranch}</div>
                      <div className="text-[11px] text-slate-500">{asset.buildingRoom}</div>
                    </td>

                    {/* Custody */}
                    <td className="py-3 px-4">
                      {asset.assignedTo ? (
                        <div>
                          <span className="font-semibold text-[#003279] block">{asset.assignedTo}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {asset.assignedEmployeeId}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Central Store (Unassigned)</span>
                      )}
                    </td>

                    {/* Condition */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {asset.condition}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(asset.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => onOpenDetailModal(asset)}
                          title="View Full Details & History"
                          className="p-1.5 text-slate-600 hover:text-[#003279] hover:bg-slate-100 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Issue (if available) */}
                        {canManage && asset.status === 'Available' && (
                          <button
                            onClick={() => onOpenIssueModal(asset)}
                            title="Issue to Employee"
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Return (if issued) */}
                        {canManage && asset.status === 'Issued' && (
                          <button
                            onClick={() => onOpenReturnModal(asset)}
                            title="Process Return"
                            className="p-1.5 text-[#003279] hover:text-[#002254] hover:bg-blue-50 rounded transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit */}
                        {canManage && (
                          <button
                            onClick={() => onOpenEditModal(asset)}
                            title="Edit Asset Information"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        {canManage && (
                          <button
                            onClick={() => setAssetToDelete(asset)}
                            title="Delete Asset"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Delete Asset Record?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong>{assetToDelete.itemName}</strong> (<code>{assetToDelete.assetId}</code>)?
                </p>
                {assetToDelete.status === 'Issued' && (
                  <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
                    ⚠️ <strong>Warning:</strong> This asset is currently marked as <strong>Issued</strong> to <strong>{assetToDelete.assignedTo}</strong>. It is recommended to process return first.
                  </div>
                )}
                {deleteError && (
                  <div className="mt-2 text-xs text-rose-600">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
