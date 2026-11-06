import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Search, 
  CheckCircle2, 
  User, 
  MapPin, 
  PlusCircle, 
  RotateCcw, 
  Calendar,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { Asset, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';

interface MissingLostViewProps {
  assets: Asset[];
  onOpenReportMissingModal: (asset: Asset) => void;
  onOpenResolveStatusModal: (asset: Asset) => void;
  onOpenReturnModal: (asset: Asset) => void;
  onOpenScanner?: (callback: (assetId: string) => void) => void;
  initialTab?: 'missing' | 'overdue';
  canManage: boolean;
}

/** Today's date as YYYY-MM-DD in local time. */
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const MissingLostView: React.FC<MissingLostViewProps> = ({
  assets,
  onOpenReportMissingModal,
  onOpenResolveStatusModal,
  onOpenReturnModal,
  onOpenScanner,
  initialTab,
  canManage
}) => {
  const [activeTab, setActiveTab] = useState<'missing-lost' | 'overdue'>(initialTab === 'overdue' ? 'overdue' : 'missing-lost');
  const [search, setSearch] = useState('');
  const [isPicking, setIsPicking] = useState(false);
  const [pickId, setPickId] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab === 'overdue' ? 'overdue' : 'missing-lost');
  }, [initialTab]);

  const handlePick = (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    const found = assets.find((a) => a.assetId.toUpperCase() === id);
    if (!found) {
      setPickError(`${id || 'That ID'} is not a registered asset.`);
      return;
    }
    if (!['Available', 'Issued', 'Under Maintenance', 'Missing'].includes(found.status)) {
      setPickError(`${found.assetId} is already "${found.status}".`);
      return;
    }
    setPickError(null);
    setPickId('');
    setIsPicking(false);
    onOpenReportMissingModal(found);
  };

  // Missing or Lost Assets
  const missingOrLostAssets = assets.filter(a => a.status === 'Missing' || a.status === 'Lost');

  // Overdue = issued and the due date is before today (an item due today is not overdue yet).
  const today = localToday();
  const overdueAssets = assets.filter(a => a.status === 'Issued' && !!a.dueDate && a.dueDate < today);

  const q = search.toLowerCase();
  const has = (v?: string) => (v || '').toLowerCase().includes(q);
  const filteredMissing = missingOrLostAssets.filter(a =>
    has(a.assetId) || has(a.itemName) || has(a.brand) || has(a.remarks) || has(a.assignedTo)
  );

  const filteredOverdue = overdueAssets.filter(a => has(a.assetId) || has(a.itemName) || has(a.assignedTo));

  const getDaysOverdue = (dueDateStr: string) => {
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const due = new Date(y, (m || 1) - 1, d || 1);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((start.getTime() - due.getTime()) / 86400000));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Missing, Lost & Overdue Asset Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit register for unaccounted items, theft investigations, and past-due equipment loans.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setIsPicking((v) => !v);
              setPickError(null);
            }}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Report Asset Missing / Lost
          </button>
        )}
      </div>

      {isPicking && canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePick(pickId);
          }}
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row gap-2 text-xs"
        >
          <input
            autoFocus
            list="report-missing-assets"
            value={pickId}
            onChange={(e) => setPickId(e.target.value.toUpperCase())}
            placeholder="Type or pick the Asset ID that is missing…"
            className="flex-1 px-3 py-2 bg-white border border-rose-300 rounded-lg font-mono uppercase"
          />
          <datalist id="report-missing-assets">
            {assets
              .filter((a) => ['Available', 'Issued', 'Under Maintenance'].includes(a.status))
              .map((a) => (
                <option key={a.assetId} value={a.assetId}>
                  {a.itemName}
                </option>
              ))}
          </datalist>
          {onOpenScanner && (
            <button
              type="button"
              onClick={() => onOpenScanner((id) => handlePick(id))}
              className="px-3 py-2 bg-white border border-rose-300 text-rose-800 font-semibold rounded-lg"
            >
              Scan Barcode
            </button>
          )}
          <button type="submit" className="px-4 py-2 bg-rose-700 text-white font-semibold rounded-lg">
            Continue
          </button>
          {pickError && <span className="text-rose-800 font-medium self-center">{pickError}</span>}
        </form>
      )}

      {/* Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('missing-lost')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'missing-lost'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Missing & Lost Items ({missingOrLostAssets.length})
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'overdue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Overdue Returns ({overdueAssets.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, item, or custodian..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* TAB 1: MISSING & LOST ASSETS */}
      {activeTab === 'missing-lost' && (
        <div className="space-y-4">
          {filteredMissing.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">No Assets Marked Missing or Lost</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All office inventory is accounted for in good order. Any verified loss or theft can be documented using the button above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMissing.map((asset) => (
                <div
                  key={asset.assetId}
                  className="bg-white rounded-xl border-l-4 border-l-rose-600 border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <BarcodeBadge value={asset.assetId} height={38} width={1.5} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{asset.itemName}</span>
                        <span className="font-mono text-xs text-slate-500">({asset.assetId})</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                          asset.status === 'Lost' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {asset.categoryName} · {asset.brand} {asset.model} (Serial: {asset.serialNumber || 'N/A'})
                      </p>
                      <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded text-xs text-rose-950 mt-2">
                        <strong>Incident Notes:</strong> {asset.remarks}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => onOpenResolveStatusModal(asset)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Recover / Resolve Status
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OVERDUE RETURNS */}
      {activeTab === 'overdue' && (
        <div className="space-y-4">
          {filteredOverdue.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Zero Overdue Items</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No issued equipment has exceeded its agreed due date.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredOverdue.map((asset) => {
                const daysOver = getDaysOverdue(asset.dueDate!);
                return (
                  <div
                    key={asset.assetId}
                    className="bg-white rounded-xl border-l-4 border-l-amber-500 border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <BarcodeBadge value={asset.assetId} height={38} width={1.5} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{asset.itemName}</span>
                          <span className="font-mono text-xs text-slate-500">({asset.assetId})</span>
                          <span className="text-[11px] px-2 py-0.5 rounded font-bold font-mono bg-amber-100 text-amber-900 border border-amber-300">
                            {daysOver} Days Overdue
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {asset.categoryName} · {asset.brand} {asset.model}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 mt-1.5 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1 font-semibold text-slate-900">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Custodian: {asset.assignedTo} ({asset.assignedEmployeeId})
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Due Date: <strong className="text-amber-800">{asset.dueDate}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {asset.officeBranch}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => onOpenReturnModal(asset)}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Process Return Now
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
