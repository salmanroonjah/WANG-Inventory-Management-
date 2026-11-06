import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Camera, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText,
  User,
  X
} from 'lucide-react';
import { PhysicalAudit, AssetCondition, LocationRecord } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface StockAuditsViewProps {
  audits: PhysicalAudit[];
  locations: LocationRecord[];
  onOpenScanner: (callback: (assetId: string) => void) => void;
  onRefresh: () => void;
  canManage: boolean;
}

export const StockAuditsView: React.FC<StockAuditsViewProps> = ({
  audits,
  locations,
  onOpenScanner,
  onRefresh,
  canManage
}) => {
  // Track the selection by ID so the view always shows the live audit record.
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const selectedAudit = audits.find((a) => a.auditId === selectedAuditId) || audits[0] || null;
  const setSelectedAudit = (a: PhysicalAudit | null) => setSelectedAuditId(a ? a.auditId : null);

  const branches = Array.from(new Set(locations.map((l) => l.officeBranch).filter(Boolean))).sort();
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [newAuditName, setNewAuditName] = useState('');
  const [newAuditBranch, setNewAuditBranch] = useState('All Branches');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Fast scan input in active audit
  const [scanAssetIdInput, setScanAssetIdInput] = useState('');
  const [scanCondition, setScanCondition] = useState<AssetCondition>('Good');
  const [scanNotes, setScanNotes] = useState('');
  const [isRecordingScan, setIsRecordingScan] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditName.trim()) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const created = await api.startAudit(newAuditName.trim(), newAuditBranch, 'All Categories');
      setIsStartingNew(false);
      setNewAuditName('');
      setSelectedAudit(created);
      onRefresh();
    } catch (err: any) {
      setStartError(err?.message || 'Failed to start audit.');
    } finally {
      setIsStarting(false);
    }
  };

  const recordScan = async (rawId: string) => {
    if (!selectedAudit || !rawId.trim()) return;
    const id = rawId.trim().toUpperCase();
    setIsRecordingScan(true);
    setScanResultMsg(null);
    try {
      const updated = await api.scanAuditItem(selectedAudit.auditId, id, scanCondition, scanNotes || undefined);
      const item = updated.items.find((i) => i.assetId.toUpperCase() === id);
      setScanResultMsg({
        ok: !item?.isDiscrepancy,
        text: item?.isDiscrepancy
          ? `${id} recorded with a discrepancy${item.isUnexpected ? ' (not expected in this audit)' : ''}.`
          : `${id} verified.`
      });
      setScanAssetIdInput('');
      setScanNotes('');
      onRefresh();
    } catch (err: any) {
      setScanResultMsg({ ok: false, text: err?.message || 'Error recording scan' });
    } finally {
      setIsRecordingScan(false);
    }
  };

  const handleAuditScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordScan(scanAssetIdInput);
  };

  const handleCloseAudit = async (status: 'Approved' | 'Cancelled') => {
    if (!selectedAudit) return;
    const msg =
      status === 'Approved'
        ? `Finalize "${selectedAudit.auditName}"? ${selectedAudit.totalMissing} asset(s) were not found. No further scans will be accepted.`
        : `Cancel "${selectedAudit.auditName}"? The results will be kept but marked cancelled.`;
    if (!window.confirm(msg)) return;
    setIsClosing(true);
    try {
      await api.finishAudit(selectedAudit.auditId, status);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Failed to close audit.');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Physical Stock Audits & Verification
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Conduct barcode-verified physical asset counts to compare expected vs observed inventory and detect discrepancies.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsStartingNew(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Initiate Physical Audit
          </button>
        )}
      </div>

      {/* Start New Audit Modal */}
      {isStartingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Start New Physical Audit Session</h3>
              <button onClick={() => setIsStartingNew(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartAudit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={newAuditName}
                  onChange={(e) => setNewAuditName(e.target.value)}
                  placeholder="e.g. Q4 2026 Head Office Comprehensive Count"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch / Office Scope *</label>
                <select
                  value={newAuditBranch}
                  onChange={(e) => setNewAuditBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                >
                  <option value="All Branches">All Organizational Branches</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Every active asset in this scope is added to the checklist as "expected".
                </p>
              </div>

              {startError && (
                <p className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">{startError}</p>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsStartingNew(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStarting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isStarting ? 'Starting…' : 'Initialize Audit Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audits Selector & Details */}
      {audits.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500">No audits started yet. Click above to begin an audit.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Audit Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {audits.map((a) => (
              <button
                key={a.auditId}
                onClick={() => setSelectedAudit(a)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                  selectedAudit?.auditId === a.auditId
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{a.auditName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  a.status === 'Approved' ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-800 text-amber-100'
                }`}>
                  {a.status}
                </span>
              </button>
            ))}
          </div>

          {selectedAudit && (
            <div className="space-y-6">
              {/* Audit Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 block">Expected Assets</span>
                  <span className="text-2xl font-bold font-mono text-slate-900">{selectedAudit.totalExpected}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 block">Physically Verified</span>
                  <span className="text-2xl font-bold font-mono text-emerald-700">{selectedAudit.totalScanned}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 block">Unscanned / Missing</span>
                  <span className="text-2xl font-bold font-mono text-rose-700">{selectedAudit.totalMissing}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 block">Discrepancies</span>
                  <span className="text-2xl font-bold font-mono text-amber-700">{selectedAudit.totalDiscrepancies}</span>
                </div>
              </div>

              {/* Fast Barcode Scan Bar for Active Audit */}
              {selectedAudit.status === 'In Progress' && canManage && (
                <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-700" />
                      Live Physical Verification Input
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onOpenScanner((id) => recordScan(id))}
                        className="text-xs text-emerald-800 underline font-semibold flex items-center gap-1"
                      >
                        Use Mobile Camera Scanner
                      </button>
                      <button
                        onClick={() => handleCloseAudit('Approved')}
                        disabled={isClosing}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-semibold rounded"
                      >
                        Finalize Audit
                      </button>
                      <button
                        onClick={() => handleCloseAudit('Cancelled')}
                        disabled={isClosing}
                        className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 text-[11px] font-semibold rounded"
                      >
                        Cancel Audit
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAuditScanSubmit} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      required
                      value={scanAssetIdInput}
                      onChange={(e) => setScanAssetIdInput(e.target.value.toUpperCase())}
                      placeholder="Scan or enter Asset ID (e.g. WANG-ELE-001)..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-600"
                    />

                    <select
                      value={scanCondition}
                      onChange={(e) => setScanCondition(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="New">New</option>
                      <option value="Good">Good Condition</option>
                      <option value="Fair">Fair</option>
                      <option value="Minor Wear">Minor Wear</option>
                      <option value="Needs Repair">Needs Repair</option>
                      <option value="Damaged">Damaged</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isRecordingScan || !scanAssetIdInput.trim()}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verify Asset
                    </button>
                  </form>

                  {scanResultMsg && (
                    <p
                      className={`text-xs font-medium mt-2 bg-white/70 p-2 rounded border ${
                        scanResultMsg.ok ? 'text-emerald-900 border-emerald-200' : 'text-rose-800 border-rose-200'
                      }`}
                    >
                      {scanResultMsg.text}
                    </p>
                  )}
                </div>
              )}

              {/* Items Verification Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Physical Audit Verification Ledger ({selectedAudit.items.length})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    Audit ID: {selectedAudit.auditId}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Asset ID</th>
                        <th className="py-2.5 px-4">Audit Status</th>
                        <th className="py-2.5 px-4">Expected Location</th>
                        <th className="py-2.5 px-4">Expected Custodian</th>
                        <th className="py-2.5 px-4">Scanned At</th>
                        <th className="py-2.5 px-4">Observed Condition</th>
                        <th className="py-2.5 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedAudit.items.map((item) => (
                        <tr key={item.assetId} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {item.assetId}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.isFound && !item.isDiscrepancy
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.isFound
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.isFound
                                ? item.isUnexpected
                                  ? 'Found (Unexpected)'
                                  : item.isDiscrepancy
                                    ? 'Found (Discrepancy)'
                                    : 'Verified Present'
                                : selectedAudit.status === 'In Progress'
                                  ? 'Not Verified Yet'
                                  : 'Not Found'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{item.expectedLocation}</td>
                          <td className="py-3 px-4 text-slate-700">{item.expectedEmployee || 'Store'}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {item.observedCondition || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {item.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
