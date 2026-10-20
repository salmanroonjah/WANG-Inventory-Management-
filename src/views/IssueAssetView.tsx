import React, { useState, useMemo } from 'react';
import { 
  Send, 
  Camera, 
  Search, 
  AlertCircle, 
  CheckCircle2,
  Printer,
  Boxes,
  Calendar,
  User,
  MapPin,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { Asset, AssetCondition, Employee, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface IssueAssetViewProps {
  onOpenScanner: () => void;
  employees: Employee[];
  allAssets?: Asset[];
  onIssueSuccess: (asset: Asset, transaction: AssetTransaction) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  canManage: boolean;
}

export const IssueAssetView: React.FC<IssueAssetViewProps> = ({
  onOpenScanner,
  employees,
  allAssets = [],
  onIssueSuccess,
  onPrintVoucher,
  canManage
}) => {
  const [assetIdInput, setAssetIdInput] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [dueDate, setDueDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<{ asset: Asset; transaction: AssetTransaction } | null>(null);

  // Filter available assets
  const availableAssets = useMemo(() => {
    return allAssets.filter(a => a.status === 'Available');
  }, [allAssets]);

  const handleLookup = async (idToLookup: string) => {
    const clean = idToLookup.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setSearchError(null);
    setActionError(null);
    setCompletedTx(null);

    try {
      const res = await api.getAssetById(clean);
      setAsset(res.asset);
      setCondition(res.asset.condition || 'Good');
      setLocation(res.asset.buildingRoom || '');
      if (employees.length > 0 && !selectedEmpId) {
        setSelectedEmpId(employees[0].employeeId);
      }
    } catch (err: any) {
      setAsset(null);
      setSearchError(err?.message || `No asset found with ID ${clean}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPresetAsset = (selected: Asset) => {
    setAsset(selected);
    setAssetIdInput(selected.assetId);
    setCondition(selected.condition || 'Good');
    setLocation(selected.buildingRoom || '');
    setSearchError(null);
    setActionError(null);
    setCompletedTx(null);
    if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].employeeId);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (asset.status !== 'Available') {
      setActionError(`Conflict: Asset is currently "${asset.status}". Only "Available" assets can be issued.`);
      return;
    }

    if (!selectedEmpId) {
      setActionError('Please select a receiving employee from the list.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await api.issueAsset({
        assetId: asset.assetId,
        employeeId: selectedEmpId,
        condition,
        dueDate: dueDate || undefined,
        location: location || undefined,
        notes: notes || undefined
      });

      setCompletedTx({ asset: res.asset, transaction: res.transaction });
      setAsset(res.asset);
      onIssueSuccess(res.asset, res.transaction);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to issue asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmp = employees.find(e => e.employeeId === selectedEmpId);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#003279] text-[#f1cc11] flex items-center justify-center font-bold shadow-xs">
              <Send className="w-5 h-5 text-[#f1cc11]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Issue Asset to Staff
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {availableAssets.length} Available
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Scan barcode label or pick an available asset, select employee, and generate official handover receipt.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenScanner}
            className="px-4 py-2 bg-[#f1cc11] hover:bg-[#ddba09] text-[#003279] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            <span>Scan Asset Barcode</span>
          </button>
        </div>
      </div>

      {!canManage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are logged in with view-only or employee privileges. Switch to <strong>Inventory Manager</strong> or <strong>Super Admin</strong> in the top-right menu to issue assets.
          </span>
        </div>
      )}

      {/* Lookup & Quick Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search input & available assets selector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#003279] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              1. Search Asset By Barcode or ID
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookup(assetIdInput);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={assetIdInput}
                onChange={(e) => setAssetIdInput(e.target.value.toUpperCase())}
                placeholder="e.g. WANG-ELE-002"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={loading || !assetIdInput.trim()}
                className="px-4 py-2 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {loading ? 'Searching...' : 'Lookup'}
              </button>
            </form>

            {searchError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Quick Click Available Assets List */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Ready to Issue Assets ({availableAssets.length})
              </h2>
              <span className="text-[10px] text-slate-400">Click to load</span>
            </div>

            {availableAssets.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No assets currently in Available status.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {availableAssets.map((avail) => (
                  <button
                    key={avail.assetId}
                    type="button"
                    onClick={() => handleSelectPresetAsset(avail)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${
                      asset?.assetId === avail.assetId
                        ? 'bg-[#003279]/5 border-[#003279] ring-1 ring-[#003279]'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold font-mono text-[#003279]">{avail.assetId}</div>
                      <div className="text-slate-900 font-medium truncate max-w-[200px]">{avail.itemName}</div>
                      <div className="text-[10px] text-slate-500">{avail.categoryName} · {avail.officeBranch}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Asset Preview & Handover Form */}
        <div className="lg:col-span-7">
          {asset ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {/* Asset Snapshot Header */}
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Selected Asset</span>
                  <h3 className="font-bold text-slate-900 text-sm">{asset.itemName}</h3>
                  <p className="font-mono text-xs font-bold text-[#003279]">{asset.assetId}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    asset.status === 'Available'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {asset.status}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {asset.officeBranch}
                  </div>
                </div>
              </div>

              {/* Status conflict alert */}
              {asset.status !== 'Available' && (
                <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Cannot issue: This asset is currently <strong>{asset.status}</strong> (Assigned to: {asset.assignedTo || 'N/A'}). It must be returned first.
                  </span>
                </div>
              )}

              {/* Success Card with Print Voucher */}
              {completedTx && (
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-bold">Successfully Issued!</h4>
                        <p className="text-xs text-emerald-800">
                          Transaction ID: <span className="font-mono">{completedTx.transaction.transactionId}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onPrintVoucher(completedTx.asset, completedTx.transaction)}
                      className="px-3 py-1.5 bg-[#003279] hover:bg-[#002254] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#f1cc11]" />
                      <span>Print Handover Voucher</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Issue Form */}
              <form onSubmit={handleIssueSubmit} className="p-5 space-y-4">
                {actionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Receiving Employee */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#003279]" />
                    Assign To Employee *
                  </label>
                  <select
                    required
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.fullName} ({emp.employeeId}) — {emp.designation} · {emp.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Handover Condition & Return Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Condition at Handover *
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as AssetCondition)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                    >
                      <option value="New">New (Factory Sealed)</option>
                      <option value="Good">Good (Operational & Clean)</option>
                      <option value="Fair">Fair (Minor Cosmetic Wear)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#003279]" />
                      Expected Return Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Deployment Location / Room */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#003279]" />
                    Deployment Room / Workstation
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Room 101 - Executive Suite"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                  />
                </div>

                {/* Handover Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#003279]" />
                    Handover Notes & Accessories
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Includes charger, laptop sleeve, wireless mouse, and original bag."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !canManage || asset.status !== 'Available'}
                    className="w-full py-2.5 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Send className="w-4 h-4 text-[#f1cc11]" />
                    <span>
                      {isSubmitting 
                        ? 'Recording Handover...' 
                        : selectedEmp 
                          ? `Confirm Handover to ${selectedEmp.fullName}` 
                          : 'Issue Asset to Employee'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-dashed border-slate-300 p-12 text-center text-slate-400">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Asset Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Lookup an asset using barcode/ID on the left, or click any available item from the list to initiate the issue workflow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
