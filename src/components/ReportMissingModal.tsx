import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { Asset, AssetTransaction } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ReportMissingModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSuccess: (updatedAsset: Asset, transaction: AssetTransaction) => void;
}

export const ReportMissingModal: React.FC<ReportMissingModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSuccess
}) => {
  const [status, setStatus] = useState<'Missing' | 'Lost'>('Missing');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('A specific reason (minimum 5 characters) is required to document missing/lost assets.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.reportMissingOrLost({
        assetId: asset.assetId,
        status,
        reason: reason.trim()
      });

      onSuccess(res.asset, res.transaction);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to report asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-rose-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-700" />
            <div>
              <h3 className="font-semibold text-rose-950 text-base">Report Asset Missing or Lost</h3>
              <p className="text-xs text-rose-700 font-mono">Asset ID: {asset.assetId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="font-bold text-slate-900 block">{asset.itemName}</span>
            <div className="text-slate-600 mt-1">
              Currently assigned to: <strong>{asset.assignedTo || 'Unassigned / In Store'}</strong>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Designated Report Status *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 border rounded-lg cursor-pointer text-xs flex flex-col gap-1 transition-all ${status === 'Missing' ? 'border-amber-500 bg-amber-50/50 text-amber-950' : 'border-slate-200 text-slate-700'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="statusType"
                    checked={status === 'Missing'}
                    onChange={() => setStatus('Missing')}
                  />
                  <span className="font-bold">Missing</span>
                </div>
                <span className="text-[11px] text-slate-500">Unaccounted for during inspection or move</span>
              </label>

              <label className={`p-3 border rounded-lg cursor-pointer text-xs flex flex-col gap-1 transition-all ${status === 'Lost' ? 'border-rose-500 bg-rose-50/50 text-rose-950' : 'border-slate-200 text-slate-700'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="statusType"
                    checked={status === 'Lost'}
                    onChange={() => setStatus('Lost')}
                  />
                  <span className="font-bold">Lost / Stolen</span>
                </div>
                <span className="text-[11px] text-slate-500">Confirmed unrecoverable or lost off-site</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Explanation & Reason *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context on when the asset was last seen, who verified its absence, and any incident reports filed..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
            />
            <span className="text-[11px] text-slate-500">
              This statement is permanently logged to the audit history and Google Sheets sync log.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
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
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isSubmitting ? 'Reporting...' : `Flag Asset as ${status}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
