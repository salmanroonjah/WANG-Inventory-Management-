import React, { useState } from 'react';
import { History, Search, Filter, ShieldCheck, Clock, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ActivityLog, UserRole } from '../types/inventory.js';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
  userRole?: UserRole;
  onClearHistory?: () => Promise<void>;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs, userRole, onClearHistory }) => {
  const [search, setSearch] = useState('');
  const [recordFilter, setRecordFilter] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSuperAdmin = userRole === 'Super Admin';

  const handleConfirmClear = async () => {
    if (!onClearHistory) return;
    setIsClearing(true);
    try {
      await onClearHistory();
      setShowConfirmModal(false);
      setStatusMessage('Audit trail history has been successfully cleared by Super Admin.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear activity logs.');
    } finally {
      setIsClearing(false);
    }
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch = 
      l.action.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.recordId.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q);
    const matchesRecord = recordFilter === 'all' || l.recordType === recordFilter;
    return matchesSearch && matchesRecord;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Activity Logs & Immutable Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only security and operational log capturing all barcode scans, issuances, returns, and status transitions.
          </p>
        </div>

        {/* Super Admin Clear History Button */}
        {isSuperAdmin && onClearHistory && (
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
            title="Super Admin Authority: Clear historical audit records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Audit History</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by user, action, or record ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <select
          value={recordFilter}
          onChange={(e) => setRecordFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
        >
          <option value="all">All Record Types</option>
          <option value="Asset">Assets</option>
          <option value="Employee">Employees</option>
          <option value="Consumable">Consumables</option>
          <option value="Request">Requests</option>
          <option value="SheetsSync">Sheets Synchronization</option>
        </select>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.map((log) => (
            <div key={log.logId} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-slate-500 font-medium">·</span>
                  <span className="font-semibold text-slate-800">{log.userName}</span>
                  <span className="text-slate-400">({log.userRole})</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{log.details}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                  <span className="font-mono">Record: {log.recordId} ({log.recordType})</span>
                  <span>·</span>
                  <span>Ref: {log.logId}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-slate-500 text-[11px] font-mono block">
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
                <span className="text-slate-400 text-[10px] font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Super Admin */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Clear Audit Trail History?</h3>
                <span className="text-[11px] font-semibold text-rose-600">Executive Director / Super Admin Authorization</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to clear the entire historical activity log? This will remove all previous audit log documents from the central cloud database and local cache. A reset audit record will be logged with your administrator signature. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClear}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <span>Clearing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
