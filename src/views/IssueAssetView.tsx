import React, { useState } from 'react';
import { 
  Send, 
  Camera, 
  Search, 
  AlertCircle, 
  ShieldAlert, 
  User, 
  Calendar, 
  CheckCircle2,
  Printer,
  Boxes
} from 'lucide-react';
import { Asset, AssetCondition, Employee, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface IssueAssetViewProps {
  onOpenScanner: () => void;
  employees: Employee[];
  onIssueSuccess: (asset: Asset, transaction: AssetTransaction) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  canManage: boolean;
}

export const IssueAssetView: React.FC<IssueAssetViewProps> = ({
  onOpenScanner,
  employees,
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

  const sampleAvailable = ['WANG-ELE-002', 'WANG-ELE-003', 'WANG-FUR-001', 'WANG-COM-001'];

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
      setSelectedEmpId(employees.length > 0 ? employees[0].employeeId : '');
    } catch (err: any) {
      setAsset(null);
      setSearchError(err?.message || `No asset found with ID ${clean}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (asset.status !== 'Available') {
      setActionError(`Conflict: Asset is currently "${asset.status}". It cannot be issued.`);
      return;
    }

    if (!selectedEmpId) {
      setActionError('Please select a receiving employee.');
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
    <div className="space-y-6 max-w-4xl">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Barcode-Based Asset Issuing
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan physical asset barcode label to verify availability and record formal handover to employee.
          </p>
        </div>

        <button
          onClick={onOpenScanner}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Camera className="w-4 h-4" />
          Scan Barcode With Camera
        </button>
      </div>

      {/* Role Check Warning */}
      {!canManage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are logged in with view-only or employee privileges. Switch to <strong>Inventory Manager</strong> or <strong>Super Admin</strong> to record issuance transactions.
          </span>
        </div>
      )}

      {/* Step 1: Scan / Enter Barcode */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Step 1: Scan or Enter Physical Barcode Asset ID
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={assetIdInput}
              onChange={(e) => setAssetIdInput(e.target.value.toUpperCase())}
              placeholder="e.g. WANG-ELE-002 (or scan with camera)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase tracking-wide focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => handleLookup(assetIdInput)}
            disabled={loading || !assetIdInput.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? 'Checking...' : 'Verify Asset'}
          </button>
        </div>

        {/* Quick simulator tags */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
          <span>Test available items:</span>
          {sampleAvailable.map((id) => (
            <button
              key={id}
              onClick={() => {
                setAssetIdInput(id);
                handleLookup(id);
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 font-mono text-slate-800 rounded border border-slate-200"
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
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              <div>
                <h3 className="font-bold text-emerald-950 text-sm">
                  Asset Successfully Issued!
                </h3>
                <p className="text-xs text-emerald-800 font-mono">
                  Transaction Ref: {completedTx.transaction.transactionId}
                </p>
              </div>
            </div>
            <button
              onClick={() => onPrintVoucher(completedTx.asset, completedTx.transaction)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Handover Voucher
            </button>
          </div>
          <p className="text-xs text-emerald-900">
            Custody of <strong>{completedTx.asset.itemName}</strong> ({completedTx.asset.assetId}) has been assigned to <strong>{completedTx.transaction.employeeName}</strong>. The employee's account and the master transaction log have been updated.
          </p>
        </div>
      )}

      {/* Step 2: Asset Details & Handover Form */}
      {asset && !completedTx && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Asset Verification Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-bold text-slate-900 text-base">{asset.assetId}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                  asset.status === 'Available' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}>
                  {asset.status}
                </span>
                <span className="text-xs text-slate-500 font-medium">Condition: {asset.condition}</span>
              </div>
              <h2 className="text-base font-bold text-slate-800">{asset.itemName}</h2>
              <p className="text-xs text-slate-500">
                {asset.categoryName} · {asset.brand} {asset.model} (Serial: {asset.serialNumber || 'N/A'})
              </p>
            </div>

            <BarcodeBadge value={asset.assetId} height={36} width={1.5} />
          </div>

          {/* Conflict Warning if Asset is Unavailable */}
          {asset.status !== 'Available' ? (
            <div className="p-6">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-950">Issuance Prevented: Asset is {asset.status}</h4>
                  <p className="text-xs text-rose-800 mt-1">
                    This asset cannot be issued because its current status is <strong>{asset.status}</strong>.
                  </p>
                  {asset.assignedTo && (
                    <p className="text-xs text-rose-800 mt-1">
                      Currently assigned to: <strong>{asset.assignedTo}</strong> ({asset.assignedEmployeeId}).
                    </p>
                  )}
                  <p className="text-xs text-rose-700 mt-2">
                    To prevent conflicting active assignments, please scan the barcode in the <strong>Return Asset</strong> section first.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Issuance Form */
            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Receiving Employee *
                </label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Choose Registered WANG Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId}) · {emp.designation} ({emp.department})
                    </option>
                  ))}
                </select>

                {selectedEmp && (
                  <div className="mt-2 p-2.5 bg-blue-50/70 rounded border border-blue-100 text-[11px] text-blue-900">
                    <span className="font-semibold">{selectedEmp.fullName}</span> · {selectedEmp.department} · {selectedEmp.officeBranch} (Currently holding {selectedEmp.assignedAssetCount} asset{selectedEmp.assignedAssetCount === 1 ? '' : 's'})
                  </div>
                )}
              </div>

              {/* Condition & Return Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Handover Condition *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
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

              {/* Deployment Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Desk / Office Room
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Room 204 - IT & Media Lab"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Handover Purpose / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Handover Purpose & Remarks
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Handed over for field GIS mapping project. Fully tested."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Confirmation & Submit Button */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Transaction will be recorded in audit ledger immediately.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting || !canManage}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Recording Handover...' : 'Confirm & Complete Handover'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
