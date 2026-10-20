import React, { useState } from 'react';
import { History, Search, Filter, ShieldCheck, Clock } from 'lucide-react';
import { ActivityLog } from '../types/inventory.js';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [recordFilter, setRecordFilter] = useState('all');

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
      </div>

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
    </div>
  );
};
