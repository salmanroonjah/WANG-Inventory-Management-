import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Camera, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Printer,
  Boxes,
  UserCheck,
  Wrench,
  MapPin,
  FileText,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Asset, AssetCondition, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface ReturnAssetViewProps {
  onOpenScanner: () => void;
  allAssets?: Asset[];
  onReturnSuccess: (asset: Asset, transaction: AssetTransaction) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  canManage: boolean;
}

export const ReturnAssetView: React.FC<ReturnAssetViewProps> = ({
  onOpenScanner,
  allAssets = [],
  onReturnSuccess,
  onPrintVoucher,
  canManage
}) => {
  const [assetIdInput, setAssetIdInput] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Form State
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('Good');
  const [targetLocation, setTargetLocation] = useState('Central Store - Bay A');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<{ asset: Asset; transaction: AssetTransaction } | null>(null);

  // Filter issued assets currently in field
  const issuedAssets = useMemo(() => {
    return allAssets.filter(a => a.status === 'Issued');
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
      setReturnCondition(res.asset.condition || 'Good');
      setTargetLocation('Central Store - Bay A');
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
    setReturnCondition(selected.condition || 'Good');
    setTargetLocation('Central Store - Bay A');
    setSearchError(null);
    setActionError(null);
    setCompletedTx(null);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (asset.status !== 'Issued') {
      setActionError(`Asset ${asset.assetId} is currently "${asset.status}". Only "Issued" assets can be returned.`);
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await api.returnAsset({
        assetId: asset.assetId,
        returnCondition,
        notes: notes || undefined,
        targetLocation: targetLocation || undefined
      });

      setCompletedTx({ asset: res.asset, transaction: res.transaction });
      setAsset(res.asset);
      onReturnSuccess(res.asset, res.transaction);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to process asset return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const willBeUnderMaintenance = returnCondition === 'Needs Repair' || returnCondition === 'Damaged';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#003279] text-[#f1cc11] flex items-center justify-center font-bold shadow-xs">
              <RotateCcw className="w-5 h-5 text-[#f1cc11]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Process Asset Return & Check-in
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#003279] border border-blue-200">
                  {issuedAssets.length} Currently Checked Out
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Discharge staff custody, assess condition upon return, and put asset back into available inventory or maintenance.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenScanner}
            className="px-4 py-2 bg-[#f1cc11] hover:bg-[#ddba09] text-[#003279] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            <span>Scan Return Barcode</span>
          </button>
        </div>
      </div>

      {!canManage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are logged in with view-only or employee privileges. Switch to <strong>Inventory Manager</strong> or <strong>Super Admin</strong> in the top-right menu to process returns.
          </span>
        </div>
      )}

      {/* Grid: Search & Issued Asset Quick Picker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search input & Currently Issued List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#003279] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              1. Scan or Type Asset ID to Return
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
                placeholder="e.g. WANG-ELE-001"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={loading || !assetIdInput.trim()}
                className="px-4 py-2 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {loading ? 'Finding...' : 'Lookup'}
              </button>
            </form>

            {searchError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Quick Click Currently Issued Assets */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Currently Issued Items ({issuedAssets.length})
              </h2>
              <span className="text-[10px] text-slate-400">Click to return</span>
            </div>

            {issuedAssets.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No assets are currently issued to staff.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {issuedAssets.map((iss) => (
                  <button
                    key={iss.assetId}
                    type="button"
                    onClick={() => handleSelectPresetAsset(iss)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${
                      asset?.assetId === iss.assetId
                        ? 'bg-[#003279]/5 border-[#003279] ring-1 ring-[#003279]'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold font-mono text-[#003279]">{iss.assetId}</div>
                      <div className="text-slate-900 font-medium truncate max-w-[200px]">{iss.itemName}</div>
                      <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        Custodian: {iss.assignedTo} ({iss.assignedEmployeeId})
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#003279]">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Asset Return Form */}
        <div className="lg:col-span-7">
          {asset ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              {/* Asset Snapshot Header */}
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Asset to Return</span>
                  <h3 className="font-bold text-slate-900 text-sm">{asset.itemName}</h3>
                  <p className="font-mono text-xs font-bold text-[#003279]">{asset.assetId}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    asset.status === 'Issued'
                      ? 'bg-blue-100 text-[#003279] border border-blue-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {asset.status}
                  </span>
                  {asset.assignedTo && (
                    <div className="text-[11px] font-semibold text-slate-700 mt-1">
                      Held by: {asset.assignedTo}
                    </div>
                  )}
                </div>
              </div>

              {/* Status check warning */}
              {asset.status !== 'Issued' && (
                <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Notice: This asset is currently in <strong>{asset.status}</strong> status. Only "Issued" assets have an active employee handover to discharge.
                  </span>
                </div>
              )}

              {/* Completed Return Voucher */}
              {completedTx && (
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-bold">Asset Successfully Returned & Discharged!</h4>
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
                      <span>Print Return Voucher</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Return Form */}
              <form onSubmit={handleReturnSubmit} className="p-5 space-y-4">
                {actionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Return Condition */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Inspected Condition Upon Return *
                  </label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as AssetCondition)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                  >
                    <option value="Good">Good — Ready for immediate reissue</option>
                    <option value="New">New / Like-New</option>
                    <option value="Fair">Fair — Usable with minor cosmetic wear</option>
                    <option value="Needs Repair">Needs Repair — Auto-route to Maintenance</option>
                    <option value="Damaged">Damaged — Auto-route to Maintenance</option>
                  </select>

                  {willBeUnderMaintenance && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Asset will be automatically marked as <strong>"Under Maintenance"</strong> and logged in the maintenance register for service.
                      </span>
                    </div>
                  )}
                </div>

                {/* Storage Return Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#003279]" />
                    Storage Location / Bay *
                  </label>
                  <input
                    type="text"
                    required
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    placeholder="e.g. Central Store - Bay A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                  />
                </div>

                {/* Return Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#003279]" />
                    Inspection Remarks & Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Returned with all cables and accessories. Physical condition verified."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                  />
                </div>

                {/* Submit Return */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !canManage || asset.status !== 'Issued'}
                    className="w-full py-2.5 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4 text-[#f1cc11]" />
                    <span>
                      {isSubmitting 
                        ? 'Processing Return...' 
                        : asset.assignedTo
                          ? `Discharge Custody from ${asset.assignedTo} & Check In` 
                          : 'Process Return'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-dashed border-slate-300 p-12 text-center text-slate-400">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Asset Selected for Return</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Scan the return barcode label or click any checked-out asset on the left to review its custodian and process return.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
