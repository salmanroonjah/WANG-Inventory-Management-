import React, { useState } from 'react';
import { 
  PackageCheck, 
  Search, 
  AlertTriangle, 
  PlusCircle, 
  MinusCircle, 
  RotateCcw, 
  Building, 
  CheckCircle2,
  X
} from 'lucide-react';
import { ConsumableItem, Employee } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ConsumablesViewProps {
  consumables: ConsumableItem[];
  employees: Employee[];
  onRefresh: () => void;
  canManage: boolean;
}

export const ConsumablesView: React.FC<ConsumablesViewProps> = ({
  consumables,
  employees,
  onRefresh,
  canManage
}) => {
  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] = useState<ConsumableItem | null>(null);
  const [deltaQty, setDeltaQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'RECEIVE' | 'ISSUE'>('ISSUE');
  const [reason, setReason] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filtered = consumables.filter(c =>
    c.itemCode.toLowerCase().includes(search.toLowerCase()) ||
    c.itemName.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    const actualDelta = adjustType === 'RECEIVE' ? Math.abs(deltaQty) : -Math.abs(deltaQty);
    if (adjustType === 'ISSUE' && adjustItem.currentStock < Math.abs(deltaQty)) {
      setError(`Insufficient stock! Cannot issue ${deltaQty} units. Only ${adjustItem.currentStock} in stock.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.adjustConsumable({
        itemCode: adjustItem.itemCode,
        deltaQty: actualDelta,
        reason: reason.trim() || (adjustType === 'RECEIVE' ? 'Stock restock shipment' : 'Departmental supply requisition'),
        employeeId: selectedEmpId || undefined
      });

      setSuccessMsg(`Stock updated for ${adjustItem.itemName}.`);
      setAdjustItem(null);
      setDeltaQty(1);
      setReason('');
      setSelectedEmpId('');
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to adjust stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Consumable Stock & Supplies Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantity-tracked bulk inventory (paper, toner, pens, batteries) managed separately from individual fixed assets.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search consumable items by code or name..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Consumables Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Min. Threshold</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((item) => {
                const isLowStock = item.currentStock <= item.minimumThreshold;
                return (
                  <tr key={item.itemCode} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {item.itemCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{item.itemName}</span>
                      <span className="text-[11px] text-slate-500">Unit: {item.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                          {item.currentStock} {item.unit}(s)
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.minimumThreshold} {item.unit}(s)
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      ${item.unitCost.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {item.location}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustType('ISSUE');
                              setError(null);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded border border-slate-300 flex items-center gap-1"
                          >
                            <MinusCircle className="w-3 h-3 text-rose-600" />
                            Issue
                          </button>

                          <button
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustType('RECEIVE');
                              setError(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded border border-emerald-300 flex items-center gap-1"
                          >
                            <PlusCircle className="w-3 h-3 text-emerald-700" />
                            Restock
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {adjustType === 'RECEIVE' ? 'Restock Consumable Supplies' : 'Issue Consumables to Staff'}
              </h3>
              <button
                onClick={() => setAdjustItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block">{adjustItem.itemName}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Code: {adjustItem.itemCode} · Balance: {adjustItem.currentStock} {adjustItem.unit}(s)
                </span>
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity ({adjustItem.unit}s) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={adjustType === 'ISSUE' ? adjustItem.currentStock : 9999}
                  required
                  value={deltaQty}
                  onChange={(e) => setDeltaQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {adjustType === 'ISSUE' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Receiving Employee
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">-- Select Employee (Optional) --</option>
                    {employees.map(e => (
                      <option key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.department})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={adjustType === 'RECEIVE' ? 'e.g. Shipment delivered from OfficeDepot' : 'e.g. A4 paper for Q3 donor report printing'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Recording...' : 'Commit Stock Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
