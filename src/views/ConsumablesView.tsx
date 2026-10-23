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
  X,
  Plus,
  Trash2,
  Tag,
  MapPin
} from 'lucide-react';
import { ConsumableItem, Employee, LocationRecord } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ConsumablesViewProps {
  consumables: ConsumableItem[];
  employees: Employee[];
  locations?: LocationRecord[];
  onRefresh: () => void;
  canManage: boolean;
}

export const ConsumablesView: React.FC<ConsumablesViewProps> = ({
  consumables,
  employees,
  locations = [],
  onRefresh,
  canManage
}) => {
  const [search, setSearch] = useState('');
  
  // Stock Adjustment State
  const [adjustItem, setAdjustItem] = useState<ConsumableItem | null>(null);
  const [deltaQty, setDeltaQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'RECEIVE' | 'ISSUE'>('ISSUE');
  const [reason, setReason] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Consumable Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('Stationery & Printing');
  const [newUnit, setNewUnit] = useState('Ream');
  const [newStock, setNewStock] = useState('10');
  const [newThreshold, setNewThreshold] = useState('3');
  const [newUnitCost, setNewUnitCost] = useState('500');
  const [newLocation, setNewLocation] = useState('Central Store - Shelf 1');
  const [newSupplier, setNewSupplier] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<ConsumableItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = consumables.filter(c =>
    c.itemCode.toLowerCase().includes(search.toLowerCase()) ||
    c.itemName.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    const highestNum = consumables.reduce((max, c) => {
      const match = c.itemCode?.match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 0);
    const defaultLoc = locations.length > 0 ? `${locations[0].building} - ${locations[0].room}` : '';
    setNewItemCode(`CON-${String(highestNum + 1).padStart(3, '0')}`);
    setNewItemName('');
    setNewCategory('Stationery & Printing');
    setNewUnit('Piece');
    setNewStock('10');
    setNewThreshold('3');
    setNewUnitCost('500');
    setNewLocation(defaultLoc);
    setNewSupplier('');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setCreateError('Item description/name is required.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      await api.createConsumable({
        itemCode: newItemCode.trim().toUpperCase(),
        itemName: newItemName.trim(),
        category: newCategory.trim(),
        unit: newUnit.trim(),
        currentStock: parseInt(newStock, 10) || 0,
        openingBalance: parseInt(newStock, 10) || 0,
        minimumThreshold: parseInt(newThreshold, 10) || 1,
        unitCost: parseFloat(newUnitCost) || 0,
        location: newLocation.trim(),
        supplier: newSupplier.trim()
      });

      setSuccessMsg(`Consumable item "${newItemName}" added successfully.`);
      setIsCreateModalOpen(false);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create consumable item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteConsumable(itemToDelete.itemCode);
      setSuccessMsg(`Consumable item "${itemToDelete.itemName}" (${itemToDelete.itemCode}) removed.`);
      setItemToDelete(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete consumable item.');
    } finally {
      setIsDeleting(false);
    }
  };

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
            <PackageCheck className="w-5 h-5 text-[#003279]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Consumable Stock & Supplies Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantity-tracked supplies (stationery, toners, batteries, pantry items) with manual item creation, restock, and issuance.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#003279] hover:bg-[#002254] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#f1cc11]" />
            <span>Add Consumable Item</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
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
            placeholder="Search consumable items by code, name, or category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279]"
          />
        </div>
      </div>

      {/* Consumables Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003279] text-white uppercase tracking-wider text-[10px] font-semibold border-b border-[#002254]">
              <tr>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Min. Threshold</th>
                <th className="py-3 px-4">Unit Cost (PKR)</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Stock & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No consumable items found</p>
                    <p className="text-[11px] mt-0.5">Click "Add Consumable Item" to add new inventory records.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isLowStock = item.currentStock <= item.minimumThreshold;
                  return (
                    <tr key={item.itemCode} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#003279]">
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
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        PKR {Number(item.unitCost || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.location}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustType('ISSUE');
                                  setError(null);
                                }}
                                title="Issue Stock to Staff"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded border border-slate-300 flex items-center gap-1 cursor-pointer"
                              >
                                <MinusCircle className="w-3 h-3 text-rose-600" />
                                <span>Issue</span>
                              </button>

                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustType('RECEIVE');
                                  setError(null);
                                }}
                                title="Restock New Supplies"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded border border-emerald-300 flex items-center gap-1 cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3 text-emerald-700" />
                                <span>Restock</span>
                              </button>

                              <button
                                onClick={() => setItemToDelete(item)}
                                title="Delete Consumable Item"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Consumable Item Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-[#002254] px-6 py-4 bg-[#003279] text-white">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#f1cc11]" />
                <h3 className="font-bold text-white text-base">Register New Consumable Item</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CON-005"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-[#003279] focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Stationery, Printer Supplies"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Item Description / Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Double A A4 Copier Paper 80gsm"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#003279]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Unit Type *</label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Ream, Box, Piece"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Min. Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Unit Cost (PKR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(e.target.value)}
                    placeholder="Cost in PKR"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Storage Location</label>
                  <input
                    type="text"
                    list="consumable-location-options"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Select or type facility/room"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#003279]"
                  />
                  {locations.length > 0 && (
                    <datalist id="consumable-location-options">
                      {locations.map((l) => (
                        <option key={l.locationId} value={`${l.building} - ${l.room}`} />
                      ))}
                    </datalist>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Supplier / Vendor (Optional)</label>
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="e.g. OfficeDepot Pakistan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#003279]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#003279] hover:bg-[#002254] text-white font-bold rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Registering...' : 'Save Consumable Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Delete Consumable Item?</h4>
                <span className="text-[11px] text-slate-500 font-mono">{itemToDelete.itemCode}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5">
              Are you sure you want to permanently delete <strong>{itemToDelete.itemName}</strong>? This will remove it from cloud and local ledger.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  max={adjustType === 'ISSUE' ? adjustItem.currentStock : 99999}
                  required
                  value={deltaQty}
                  onChange={(e) => setDeltaQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#003279]"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003279]"
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003279]"
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
                  className="px-4 py-2 bg-[#003279] hover:bg-[#002254] text-white font-semibold rounded-lg shadow-xs"
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
