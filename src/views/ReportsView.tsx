import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Filter, 
  Search, 
  DollarSign, 
  Boxes, 
  Send, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Asset, AssetTransaction, ConsumableItem, Employee } from '../types/inventory.js';

interface ReportsViewProps {
  assets: Asset[];
  transactions: AssetTransaction[];
  consumables: ConsumableItem[];
  employees: Employee[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  assets,
  transactions,
  consumables,
  employees
}) => {
  const [selectedReportType, setSelectedReportType] = useState<
    'all' | 'valuation' | 'by-employee' | 'returns' | 'missing' | 'consumables'
  >('all');
  const [filterOffice, setFilterOffice] = useState('all');

  // Valuation calculation
  const totalValuation = assets.reduce((acc, a) => acc + (a.purchaseCost || 0), 0);
  const consumableValuation = consumables.reduce((acc, c) => acc + (c.currentStock * c.unitCost), 0);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `WANG_Report_${selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`;

    if (selectedReportType === 'all' || selectedReportType === 'valuation') {
      headers = ['Asset ID', 'Item Name', 'Category', 'Brand', 'Model', 'Serial', 'Office', 'Status', 'Condition', 'Custodian', 'Cost'];
      rows = assets.map(a => [
        `"${a.assetId}"`, `"${a.itemName}"`, `"${a.categoryName}"`, `"${a.brand}"`, `"${a.model}"`,
        `"${a.serialNumber}"`, `"${a.officeBranch}"`, `"${a.status}"`, `"${a.condition}"`,
        `"${a.assignedTo}"`, a.purchaseCost.toString()
      ]);
    } else if (selectedReportType === 'by-employee') {
      headers = ['Employee ID', 'Full Name', 'Department', 'Designation', 'Assigned Asset Count', 'Email', 'Office'];
      rows = employees.map(e => [
        `"${e.employeeId}"`, `"${e.fullName}"`, `"${e.department}"`, `"${e.designation}"`,
        e.assignedAssetCount.toString(), `"${e.email}"`, `"${e.officeBranch}"`
      ]);
    } else if (selectedReportType === 'returns') {
      const returnTx = transactions.filter(t => t.transactionType === 'RETURN');
      headers = ['Transaction ID', 'Asset ID', 'Item Name', 'Returned By', 'Timestamp', 'Return Condition', 'Audited By', 'Notes'];
      rows = returnTx.map(t => [
        `"${t.transactionId}"`, `"${t.assetId}"`, `"${t.assetName}"`, `"${t.employeeName}"`,
        `"${t.timestamp}"`, `"${t.condition}"`, `"${t.performedByName}"`, `"${t.notes}"`
      ]);
    } else if (selectedReportType === 'missing') {
      const missingAssets = assets.filter(a => a.status === 'Missing' || a.status === 'Lost');
      headers = ['Asset ID', 'Item Name', 'Status', 'Location', 'Last Known Custodian', 'Cost', 'Remarks'];
      rows = missingAssets.map(a => [
        `"${a.assetId}"`, `"${a.itemName}"`, `"${a.status}"`, `"${a.officeBranch}"`,
        `"${a.assignedTo}"`, a.purchaseCost.toString(), `"${a.remarks}"`
      ]);
    } else if (selectedReportType === 'consumables') {
      headers = ['Item Code', 'Item Name', 'Category', 'Unit', 'Stock Qty', 'Threshold', 'Unit Cost', 'Total Valuation'];
      rows = consumables.map(c => [
        `"${c.itemCode}"`, `"${c.itemName}"`, `"${c.category}"`, `"${c.unit}"`,
        c.currentStock.toString(), c.minimumThreshold.toString(), c.unitCost.toString(),
        (c.currentStock * c.unitCost).toFixed(2)
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports & Inventory Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Exportable compliance registers, asset valuations, custody schedules, and return histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top Valuation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Fixed Assets Valuation</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            ${totalValuation.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{assets.length} capitalized assets</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Consumables Valuation</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            ${consumableValuation.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{consumables.length} bulk supply categories</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Combined Inventory Net Worth</span>
          <span className="text-2xl font-bold font-mono text-blue-700 mt-1 block">
            ${(totalValuation + consumableValuation).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Audit book value</span>
        </div>
      </div>

      {/* Report Switcher & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedReportType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedReportType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Complete Asset Register
          </button>
          <button
            onClick={() => setSelectedReportType('valuation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedReportType === 'valuation' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Valuation Register
          </button>
          <button
            onClick={() => setSelectedReportType('by-employee')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedReportType === 'by-employee' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Employee Custody Report
          </button>
          <button
            onClick={() => setSelectedReportType('returns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedReportType === 'returns' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Return History Log
          </button>
          <button
            onClick={() => setSelectedReportType('missing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedReportType === 'missing' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Missing & Lost Assets
          </button>
          <button
            onClick={() => setSelectedReportType('consumables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedReportType === 'consumables' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Consumable Balances
          </button>
        </div>
      </div>

      {/* Report Data Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Identifier</th>
                <th className="py-2.5 px-4">Item / Name</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4">Branch / Location</th>
                <th className="py-2.5 px-4">Status / Qty</th>
                <th className="py-2.5 px-4">Assigned To</th>
                <th className="py-2.5 px-4 text-right">Value ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedReportType === 'consumables' ? (
                consumables.map(c => (
                  <tr key={c.itemCode} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.itemCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.itemName}</td>
                    <td className="py-3 px-4 text-slate-600">{c.category}</td>
                    <td className="py-3 px-4 text-slate-600">{c.location}</td>
                    <td className="py-3 px-4 font-mono font-bold">{c.currentStock} {c.unit}s</td>
                    <td className="py-3 px-4 text-slate-400">Bulk Stock</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">${(c.currentStock * c.unitCost).toFixed(2)}</td>
                  </tr>
                ))
              ) : selectedReportType === 'by-employee' ? (
                employees.map(e => (
                  <tr key={e.employeeId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.employeeId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{e.department}</td>
                    <td className="py-3 px-4 text-slate-600">{e.officeBranch}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">{e.assignedAssetCount} asset(s)</td>
                    <td className="py-3 px-4 text-slate-600">{e.email}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">—</td>
                  </tr>
                ))
              ) : selectedReportType === 'returns' ? (
                transactions.filter(t => t.transactionType === 'RETURN').map(t => (
                  <tr key={t.transactionId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.transactionId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{t.assetName} ({t.assetId})</td>
                    <td className="py-3 px-4 text-slate-600">Return Event</td>
                    <td className="py-3 px-4 text-slate-600">{t.location || 'Store'}</td>
                    <td className="py-3 px-4 text-blue-700 font-semibold">{t.condition}</td>
                    <td className="py-3 px-4 text-slate-800">{t.employeeName}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{new Date(t.timestamp).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                assets.map(a => (
                  <tr key={a.assetId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.assetId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.itemName}</td>
                    <td className="py-3 px-4 text-slate-600">{a.categoryName}</td>
                    <td className="py-3 px-4 text-slate-600">{a.officeBranch}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{a.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{a.assignedTo || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">${a.purchaseCost}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
