import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  PlusCircle, 
  Download, 
  Filter, 
  ExternalLink, 
  Eye, 
  Edit, 
  Send, 
  RotateCcw,
  Tag
} from 'lucide-react';
import { Asset, Category, LocationRecord, UserRole } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';

interface InventoryViewProps {
  assets: Asset[];
  categories: Category[];
  locations: LocationRecord[];
  onOpenDetailModal: (asset: Asset) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (asset: Asset) => void;
  onOpenIssueModal: (asset: Asset) => void;
  onOpenReturnModal: (asset: Asset) => void;
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
  canManage
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCompletion, setSelectedCompletion] = useState('all');

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = 
      a.assetId.toLowerCase().includes(q) ||
      a.itemName.toLowerCase().includes(q) ||
      a.brand.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      a.assignedTo.toLowerCase().includes(q);

    const matchesCat = selectedCat === 'all' || a.categoryId === selectedCat;
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
    const matchesCond = selectedCondition === 'all' || a.condition === selectedCondition;
    const matchesLoc = selectedLocation === 'all' || a.officeBranch === selectedLocation;
    const matchesComp = selectedCompletion === 'all' || a.recordCompletion === selectedCompletion;

    return matchesSearch && matchesCat && matchesStatus && matchesCond && matchesLoc && matchesComp;
  });

  const handleExportCSV = () => {
    const headers = [
      'Asset ID', 'Item Name', 'Category', 'Brand', 'Model', 'Serial Number',
      'Location', 'Building Room', 'Status', 'Condition', 'Assigned To', 'Assigned ID',
      'Purchase Date', 'Cost', 'Supplier', 'Warranty Expiry', 'Completion'
    ];

    const rows = filtered.map(a => [
      `"${a.assetId}"`,
      `"${a.itemName}"`,
      `"${a.categoryName}"`,
      `"${a.brand}"`,
      `"${a.model}"`,
      `"${a.serialNumber}"`,
      `"${a.officeBranch}"`,
      `"${a.buildingRoom}"`,
      `"${a.status}"`,
      `"${a.condition}"`,
      `"${a.assignedTo}"`,
      `"${a.assignedEmployeeId}"`,
      `"${a.purchaseDate}"`,
      a.purchaseCost,
      `"${a.supplier}"`,
      `"${a.warrantyExpiry}"`,
      `"${a.recordCompletion}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WANG_Master_Assets_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Issued': return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'Under Maintenance': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Missing': return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'Lost': return 'bg-purple-50 text-purple-800 border-purple-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Master Assets Register
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete inventory catalog corresponding to Google Sheets "Master Assets" tab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {canManage && (
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Register New Asset
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Asset ID, name, brand, serial, or employee..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Filter */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Issued">Issued</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Missing">Missing</option>
              <option value="Lost">Lost</option>
              <option value="Retired">Retired</option>
            </select>

            {/* Condition Filter */}
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">All Conditions</option>
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Minor Wear">Minor Wear</option>
              <option value="Needs Repair">Needs Repair</option>
              <option value="Damaged">Damaged</option>
            </select>

            {/* Office Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">All Branches</option>
              <option value="Head Office - Islamabad">Head Office - Islamabad</option>
              <option value="Field Office - Quetta">Field Office - Quetta</option>
            </select>

            {/* Record Completion Filter */}
            <select
              value={selectedCompletion}
              onChange={(e) => setSelectedCompletion(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">All Completion</option>
              <option value="Verified">Verified</option>
              <option value="Complete">Complete</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing <strong>{filtered.length}</strong> of {assets.length} registered assets</span>
          {(search || selectedCat !== 'all' || selectedStatus !== 'all' || selectedCondition !== 'all' || selectedLocation !== 'all' || selectedCompletion !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCat('all');
                setSelectedStatus('all');
                setSelectedCondition('all');
                setSelectedLocation('all');
                setSelectedCompletion('all');
              }}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Item Name & Specs</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Branch & Room</th>
                <th className="py-3 px-4">Current Custody</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Completion</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((asset) => (
                <tr key={asset.assetId} className="hover:bg-slate-50/70 transition-colors">
                  {/* Asset ID with quick Barcode badge popup */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <button
                      onClick={() => onOpenDetailModal(asset)}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {asset.assetId}
                    </button>
                  </td>

                  {/* Item Name */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{asset.itemName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {asset.brand} {asset.model} {asset.serialNumber ? `· SN: ${asset.serialNumber}` : ''}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {asset.categoryName}
                  </td>

                  {/* Location */}
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="block text-slate-800 font-medium">{asset.officeBranch}</span>
                    <span className="text-[11px] text-slate-500">{asset.buildingRoom}</span>
                  </td>

                  {/* Custody */}
                  <td className="py-3.5 px-4">
                    {asset.assignedTo ? (
                      <div>
                        <span className="font-semibold text-slate-900 block">{asset.assignedTo}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({asset.assignedEmployeeId})</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Condition */}
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {asset.condition}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusStyle(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>

                  {/* Record Completion */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      asset.recordCompletion === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                      asset.recordCompletion === 'Complete' ? 'bg-slate-100 text-slate-800' :
                      'bg-amber-100 text-amber-900'
                    }`}>
                      {asset.recordCompletion}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenDetailModal(asset)}
                        title="View Full Profile"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canManage && (
                        <>
                          {asset.status === 'Available' && (
                            <button
                              onClick={() => onOpenIssueModal(asset)}
                              title="Issue Asset"
                              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {asset.status === 'Issued' && (
                            <button
                              onClick={() => onOpenReturnModal(asset)}
                              title="Process Return"
                              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onOpenEditModal(asset)}
                            title="Edit Record"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
