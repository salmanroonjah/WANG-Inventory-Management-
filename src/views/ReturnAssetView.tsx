import React, { useState } from 'react';
import { 
  RotateCcw, 
  Camera, 
  Search, 
  AlertCircle, 
  UserCheck, 
  Wrench, 
  CheckCircle2, 
  Printer,
  ShieldAlert
} from 'lucide-react';
import { Asset, AssetCondition, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface ReturnAssetViewProps {
  onOpenScanner: () => void;
  onReturnSuccess: (asset: Asset, transaction: AssetTransaction) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  canManage: boolean;
}

export const ReturnAssetView: React.FC<ReturnAssetViewProps> = ({
  onOpenScanner,
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

  const sampleIssued = ['WANG-ELE-001', 'WANG-IT-001', 'WANG-IT-002'];

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
    } catch (err: any) {
      setAsset(null);
      setSearchError(err?.message || `No asset found with ID ${clean}`);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6 max-w-4xl">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Barcode-Based Asset Returns
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan asset barcode label on return to identify responsible employee, assess condition, and discharge custody.
          </p>
        </div>

        <button
          onClick={onOpenScanner}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Camera className="w-4 h-4" />
          Scan Return Barcode
        </button>
      </div>

      {!canManage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are logged in with view-only or employee privileges. Switch to <strong>Inventory Manager</strong> or <strong>Super Admin</strong> to discharge assets and process returns.
          </span>
        </div>
      )}

      {/* Step 1: Scan / Enter Barcode */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Step 1: Scan Return Barcode or Enter Asset ID
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={assetIdInput}
              onChange={(e) => setAssetIdInput(e.target.value.toUpperCase())}
              placeholder="e.g. WANG-ELE-001 (or scan label directly)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase tracking-wide focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => handleLookup(assetIdInput)}
            disabled={loading || !assetIdInput.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? 'Verifying...' : 'Identify Return Item'}
          </button>
        </div>

        {/* Quick simulator tags for currently issued assets */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
          <span>Test currently issued items:</span>
          {sampleIssued.map((id) => (
            <button
              key={id}
              onClick={() => {
                setAssetIdInput(id);
                handleLookup(id);
              }}
              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-mono text-[11px] rounded border border-blue-200"
            >
              {id}
            </button>
          ))}
        </div>

        {searchError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Success Notification Banner with Voucher Print */}
      {completedTx && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-blue-700" />
              <div>
                <h3 className="font-bold text-blue-950 text-sm">
                  Asset Return Processed & Custody Discharged!
                </h3>
                <p className="text-xs text-blue-800 font-mono">
                  Transaction Ref: {completedTx.transaction.transactionId}
                </p>
              </div>
            </div>
            <button
              onClick={() => onPrintVoucher(completedTx.asset, completedTx.transaction)}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Return Voucher
            </button>
          </div>
          <p className="text-xs text-blue-900">
            <strong>{completedTx.asset.itemName}</strong> ({completedTx.asset.assetId}) has been returned. Status is now <strong>{completedTx.asset.status}</strong>. It has been removed from the employee's active assignment account while preserving complete historical audit logs.
          </p>
        </div>
      )}

      {/* Step 2: Return Verification & Discharge Form */}
      {asset && !completedTx && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-bold text-slate-900 text-base">{asset.assetId}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                  asset.status === 'Issued' ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}>
                  {asset.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-800">{asset.itemName}</h2>
              <p className="text-xs text-slate-500">
                {asset.categoryName} · {asset.brand} {asset.model} (Serial: {asset.serialNumber || 'N/A'})
              </p>
            </div>

            <BarcodeBadge value={asset.assetId} height={36} width={1.5} />
          </div>

          {/* Validation: Check if Asset is actually issued */}
          {asset.status !== 'Issued' ? (
            <div className="p-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Asset Is Not Currently Issued</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Asset <strong>{asset.assetId}</strong> is currently in status: <strong>{asset.status}</strong>.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Only assets with status "Issued" and an active employee custodian can be returned.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReturnSubmit} className="p-6 space-y-5">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Active Custodian Verification Box */}
              <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  Active Custodian Record
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-blue-700 text-[11px] block">Responsible Employee:</span>
                    <span className="font-bold text-slate-900 text-sm">{asset.assignedTo}</span>
                    <span className="text-slate-500 block font-mono text-[11px]">ID: {asset.assignedEmployeeId}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 text-[11px] block">Current Location:</span>
                    <span className="font-medium text-slate-900">{asset.officeBranch}</span>
                    <span className="text-slate-600 block text-[11px]">{asset.buildingRoom}</span>
                  </div>
                </div>
              </div>

              {/* Condition Assessment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return Physical Condition Assessment *
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Good">Good — Normal condition, ready for reissuance</option>
                  <option value="Minor Wear">Minor Wear — Working fine, cosmetic wear only</option>
                  <option value="Needs Repair">Needs Repair — Faulty/malfunctioning, requires servicing</option>
                  <option value="Damaged">Damaged — Physical damage or breakage, requires overhaul</option>
                </select>

                {willBeUnderMaintenance && (
                  <div className="mt-2 p-2.5 bg-amber-50 rounded border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Automated Maintenance Workflow Triggered</strong>
                      <p className="mt-0.5">
                        Because condition is assessed as "{returnCondition}", the asset will automatically transition to <strong>Under Maintenance</strong> instead of Available, and an inspection maintenance ticket will be filed.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return Storage Location / Rack
                </label>
                <input
                  type="text"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  placeholder="e.g. Central Store - Bay A, Shelf 1"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return Inspection Remarks & Observations
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Equipment returned with all cables and accessories. Power tested and verified."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Custody will be discharged from {asset.assignedTo}.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting || !canManage}
                  className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isSubmitting ? 'Processing Return...' : 'Confirm Return & Discharge Custody'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
