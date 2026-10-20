import React from 'react';
import { 
  Boxes, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  PackageCheck, 
  Clock, 
  Wrench, 
  Camera, 
  TrendingUp, 
  CheckCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { DashboardStats, UserRole, ViewTab } from '../types/inventory.js';

interface DashboardViewProps {
  stats: DashboardStats;
  onNavigate: (tab: any) => void;
  onOpenScanner: () => void;
  userRole: UserRole;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigate,
  onOpenScanner,
  userRole
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Operational Master Dashboard
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">Welfare Association for New Generation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            WANG Office Inventory Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Barcode-managed asset tracking, issue and return ledger, consumable stock, and real-time Google Sheets transaction synchronization.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={onOpenScanner}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Launch Barcode Scanner
            </button>

            <button
              onClick={() => onNavigate('issue')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              Issue Asset
            </button>

            <button
              onClick={() => onNavigate('return')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-4 h-4 text-blue-400" />
              Return Asset
            </button>
          </div>
        </div>

        {/* Ambient watermark background */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none select-none text-white text-9xl font-black font-mono">
          WANG
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Assets */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Assets</span>
            <Boxes className="w-4 h-4 text-slate-700" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 block font-mono">
            {stats.totalAssets}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Master Register</span>
        </div>

        {/* Available in Store */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Available</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-700 block font-mono">
            {stats.availableAssets}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Ready for issue</span>
        </div>

        {/* Currently Issued */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Issued</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-extrabold text-blue-700 block font-mono">
            {stats.issuedAssets}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">In staff custody</span>
        </div>

        {/* Under Maintenance */}
        <div 
          onClick={() => onNavigate('maintenance')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-extrabold text-amber-700 block font-mono">
            {stats.underMaintenanceAssets}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Repairs underway</span>
        </div>

        {/* Missing or Lost */}
        <div 
          onClick={() => onNavigate('missing-lost')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Missing / Lost</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-extrabold text-rose-700 block font-mono">
            {stats.missingLostAssets}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Investigation</span>
        </div>

        {/* Overdue Returns */}
        <div 
          onClick={() => onNavigate('missing-lost')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Overdue Loans</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className={`text-2xl font-extrabold block font-mono ${stats.overdueAssetsCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {stats.overdueAssetsCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Past due date</span>
        </div>
      </div>

      {/* Middle Layout: Category Breakdown & Consumables Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Asset Category Distribution
            </h3>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.categoryDistribution.map((cat) => {
              const pct = stats.totalAssets > 0 ? Math.round((cat.count / stats.totalAssets) * 100) : 0;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-800">{cat.category}</span>
                    <span className="text-slate-500 font-mono">{cat.count} items ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-800 rounded-full" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consumable Supplies Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-700" />
                Consumable Stock
              </h3>
              <button
                onClick={() => onNavigate('consumables')}
                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Units in Inventory:</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {stats.totalConsumableStock} Units
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[11px] text-amber-800 block font-semibold">Low-Stock Alert:</span>
                <span className="text-sm font-bold text-amber-950">
                  {stats.lowStockItemsCount} items at or below reorder threshold
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('consumables')}
            className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Review Consumables Ledger
          </button>
        </div>
      </div>

      {/* Bottom: Recent Transaction Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Recent Operational Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Synchronized with the Google Sheets "Asset Transactions" tab
            </p>
          </div>
          <button
            onClick={() => onNavigate('activity')}
            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
          >
            View Full Audit Trail <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Ref ID</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Asset ID & Name</th>
                <th className="py-2.5 px-4">Personnel</th>
                <th className="py-2.5 px-4">Authorized By</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stats.recentTransactions.map((tx) => (
                <tr key={tx.transactionId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{tx.transactionId}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      tx.transactionType === 'ISSUE' ? 'bg-emerald-100 text-emerald-800' :
                      tx.transactionType === 'RETURN' ? 'bg-blue-100 text-blue-800' :
                      tx.transactionType === 'REPORT_MISSING' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{tx.assetName}</span>
                    <span className="font-mono text-slate-500 text-[10px]">{tx.assetId}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-800">
                    {tx.employeeName || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {tx.performedByName}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                    {tx.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
