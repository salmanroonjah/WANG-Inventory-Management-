import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, Wrench, CheckCircle2, UserCheck } from 'lucide-react';
import { Asset, AssetCondition, AssetTransaction } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ReturnAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSuccess: (updatedAsset: Asset, transaction: AssetTransaction) => void;
}

export const ReturnAssetModal: React.FC<ReturnAssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSuccess
}) => {
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('Good');
  const [targetLocation, setTargetLocation] = useState('Central Store - Bay A');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (asset) {
      setReturnCondition(asset.condition || 'Good');
      setTargetLocation('Central Store - Bay A');
      setError(null);
      setShowConfirm(false);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const isIssued = asset.status === 'Issued';
  const willBeUnderMaintenance = returnCondition === 'Needs Repair' || returnCondition === 'Damaged';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isIssued) {
      setError(`Cannot return asset: Current status is "${asset.status}". Only "Issued" assets can be returned.`);
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.returnAsset({
        assetId: asset.assetId,
        returnCondition,
        notes: notes || undefined,
        targetLocation: targetLocation || undefined
      });

      onSuccess(res.asset, res.transaction);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process return.');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Process Asset Return</h3>
              <p className="text-xs text-slate-500 font-mono">Asset ID: {asset.assetId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isIssued ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Asset Is Not Currently Issued</h4>
                <p className="text-xs text-amber-800 mt-1">
                  Asset <strong>{asset.assetId}</strong> is already in <strong>{asset.status}</strong> status and has no active custodian.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Active Custody Record */}
            <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200 text-xs space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span className="font-bold text-blue-950 text-sm">Active Custodian</span>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded font-mono text-[11px]">
                  Issued
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-blue-900 pt-1 border-t border-blue-200">
                <div>
                  <span className="text-blue-700 block">Responsible Employee:</span>
                  <span className="font-semibold text-slate-900 text-xs">{asset.assignedTo}</span>
                  <span className="font-mono text-slate-500 block">ID: {asset.assignedEmployeeId}</span>
                </div>
                <div>
                  <span className="text-blue-700 block">Item Name:</span>
                  <span className="font-medium text-slate-900">{asset.itemName}</span>
                  <span className="text-slate-500 block">Location: {asset.buildingRoom}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Return Condition Assessment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Condition Assessment *
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="Good">Good — Normal condition, ready for reissuance</option>
                <option value="Minor Wear">Minor Wear — Working fine, cosmetic wear only</option>
                <option value="Needs Repair">Needs Repair — Faulty or impaired, requires service</option>
                <option value="Damaged">Damaged — Physical damage, requires technician overhaul</option>
              </select>

              {/* Maintenance Notification */}
              {willBeUnderMaintenance && (
                <div className="mt-2 p-2.5 bg-amber-50 rounded border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Status Will Transition to "Under Maintenance"</strong>
                    <p className="mt-0.5">
                      Because the return condition is assessed as "{returnCondition}", this asset will not be marked Available. A maintenance ticket will be opened for inspection.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Target Location / Storage Shelf */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Storage Location / Bay
              </label>
              <input
                type="text"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                placeholder="e.g. Central Store - Bay A, Shelf 2"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Inspection Remarks & Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Returned in original box with all cables. Inspected and power tested."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Confirmation Box */}
            {showConfirm && (
              <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  Confirm Return & Custody Discharge
                </div>
                <p>
                  You are returning <strong>{asset.itemName}</strong> from <strong>{asset.assignedTo}</strong>.
                </p>
                <p className="text-[11px] text-blue-800">
                  Target status will become: <strong>{willBeUnderMaintenance ? 'Under Maintenance' : 'Available'}</strong>. The employee will be discharged of responsibility.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isSubmitting ? 'Processing...' : showConfirm ? 'Confirm Discharge & Return' : 'Review & Confirm'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
