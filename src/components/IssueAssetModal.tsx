import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Calendar, User, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Asset, AssetCondition, Employee, AssetTransaction } from '../types/inventory.js';
import { api } from '../services/api.js';

interface IssueAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  employees: Employee[];
  onSuccess: (updatedAsset: Asset, transaction: AssetTransaction) => void;
}

export const IssueAssetModal: React.FC<IssueAssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  employees,
  onSuccess
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (asset) {
      setCondition(asset.condition || 'Good');
      setLocation(asset.buildingRoom || '');
      setSelectedEmpId(employees.length > 0 ? employees[0].employeeId : '');
      setError(null);
      setShowConfirm(false);
    }
  }, [asset, employees]);

  if (!isOpen || !asset) return null;

  const isAvailable = asset.status === 'Available';
  const selectedEmp = employees.find(e => e.employeeId === selectedEmpId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable) {
      setError(`Cannot issue asset: Current status is "${asset.status}". It must be "Available" to issue.`);
      return;
    }
    if (!selectedEmpId) {
      setError('Please select a receiving employee.');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.issueAsset({
        assetId: asset.assetId,
        employeeId: selectedEmpId,
        condition,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        location: location || undefined
      });

      onSuccess(res.asset, res.transaction);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to issue asset.');
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
            <Send className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Issue Asset to Employee</h3>
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

        {/* Unavailable Conflict Blocker */}
        {!isAvailable ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Asset Is Not Available For Issuance</h4>
                <p className="text-xs text-rose-700 mt-1">
                  Asset <strong>{asset.assetId}</strong> ({asset.itemName}) is currently in status: <strong>{asset.status}</strong>.
                </p>
                {asset.assignedTo && (
                  <p className="text-xs text-rose-700 mt-1">
                    Currently in custody of: <strong>{asset.assignedTo}</strong> ({asset.assignedEmployeeId}).
                  </p>
                )}
                <p className="text-xs text-rose-800 mt-2 font-medium">
                  To prevent conflicting assignments, the asset must first be processed for Return and returned to Available status before issuing to someone else.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Target Asset Summary Banner */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{asset.itemName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{asset.assetId} · {asset.categoryName}</span>
                </div>
                <span className="px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px]">
                  Available in Store
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                <div>Brand/Model: <span className="text-slate-800 font-medium">{asset.brand} {asset.model}</span></div>
                <div>Serial No: <span className="text-slate-800 font-mono">{asset.serialNumber || 'N/A'}</span></div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Receiving Employee Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receiving Registered Employee *
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="">-- Select Registered Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId}) — {emp.designation}, {emp.department}
                  </option>
                ))}
              </select>

              {selectedEmp && (
                <div className="mt-2 p-2.5 bg-blue-50/60 rounded border border-blue-100 text-[11px] text-blue-900 space-y-0.5">
                  <div className="font-semibold">{selectedEmp.fullName} · {selectedEmp.department}</div>
                  <div className="text-blue-700">{selectedEmp.email} · {selectedEmp.officeBranch}</div>
                  <div className="text-blue-600">Current Assigned Assets: {selectedEmp.assignedAssetCount}</div>
                </div>
              )}
            </div>

            {/* Handover Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Handover Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AssetCondition)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Minor Wear">Minor Wear</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Scheduled Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Specific Location / Desk */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deployment Location / Room
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Room 101 - Executive Suite"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuance Notes / Purpose
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Issued for field project documentation. Includes power adapter and bag."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Confirmation Alert Box */}
            {showConfirm && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  Confirm Handover Transaction
                </div>
                <p>
                  You are about to issue <strong>{asset.itemName} ({asset.assetId})</strong> to <strong>{selectedEmp?.fullName}</strong>.
                </p>
                <p className="text-[11px] text-amber-800">
                  This will create an immutable audit record, immediately assign custody, and produce a printable handover slip.
                </p>
              </div>
            )}

            {/* Footer Buttons */}
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
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Recording...' : showConfirm ? 'Confirm & Issue Asset' : 'Proceed to Issue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
