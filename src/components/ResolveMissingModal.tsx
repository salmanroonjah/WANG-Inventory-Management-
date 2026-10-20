import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Asset, AssetCondition, AssetTransaction } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ResolveMissingModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSuccess: (updatedAsset: Asset, transaction: AssetTransaction) => void;
}

export const ResolveMissingModal: React.FC<ResolveMissingModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSuccess
}) => {
  const [newStatus, setNewStatus] = useState<'Available' | 'Under Maintenance'>('Available');
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [location, setLocation] = useState('Central Store - Bay A');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes || notes.trim().length < 5) {
      setError('Please provide explanation notes on how the asset was found/recovered.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.resolveMissingStatus({
        assetId: asset.assetId,
        newStatus,
        condition,
        resolutionNotes: notes.trim(),
        location
      });

      onSuccess(res.asset, res.transaction);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update asset status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-purple-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-700" />
            <div>
              <h3 className="font-semibold text-purple-950 text-base">Recover / Resolve Asset Status</h3>
              <p className="text-xs text-purple-700 font-mono">Current Status: {asset.status} ({asset.assetId})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Restored Status *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-600"
              >
                <option value="Available">Available (Ready for Use)</option>
                <option value="Under Maintenance">Under Maintenance (Needs Servicing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verified Physical Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-600"
              >
                <option value="Good">Good</option>
                <option value="Minor Wear">Minor Wear</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Restored Location / Room
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resolution Remarks & Findings *
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Asset located in secondary field storage box during physical inventory reconciliation..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-600"
            />
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
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Restoring...' : 'Confirm Status Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
