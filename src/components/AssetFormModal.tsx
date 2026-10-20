import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, PlusCircle, Edit } from 'lucide-react';
import { Asset, AssetCondition, AssetStatus, Category, LocationRecord, RecordCompletion } from '../types/inventory.js';
import { api } from '../services/api.js';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit: Asset | null;
  categories: Category[];
  locations: LocationRecord[];
  onSuccess: (savedAsset: Asset) => void;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
  categories,
  locations,
  onSuccess
}) => {
  const isEditing = !!assetToEdit;

  const [assetId, setAssetId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [officeBranch, setOfficeBranch] = useState('Head Office - Islamabad');
  const [buildingRoom, setBuildingRoom] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [status, setStatus] = useState<AssetStatus>('Available');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [invoiceDocLink, setInvoiceDocLink] = useState('');
  const [remarks, setRemarks] = useState('');
  const [recordCompletion, setRecordCompletion] = useState<RecordCompletion>('Complete');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assetToEdit) {
      setAssetId(assetToEdit.assetId);
      setCategoryId(assetToEdit.categoryId);
      setItemName(assetToEdit.itemName);
      setBrand(assetToEdit.brand || '');
      setModel(assetToEdit.model || '');
      setSerialNumber(assetToEdit.serialNumber || '');
      setPurchaseDate(assetToEdit.purchaseDate || '');
      setPurchaseCost(String(assetToEdit.purchaseCost || 0));
      setSupplier(assetToEdit.supplier || '');
      setOfficeBranch(assetToEdit.officeBranch || 'Head Office - Islamabad');
      setBuildingRoom(assetToEdit.buildingRoom || '');
      setCondition(assetToEdit.condition || 'Good');
      setStatus(assetToEdit.status || 'Available');
      setWarrantyExpiry(assetToEdit.warrantyExpiry || '');
      setInvoiceDocLink(assetToEdit.invoiceDocLink || '');
      setRemarks(assetToEdit.remarks || '');
      setRecordCompletion(assetToEdit.recordCompletion || 'Complete');
      setError(null);
    } else {
      setAssetId('WANG-');
      setCategoryId(categories.length > 0 ? categories[0].categoryId : 'CAT-IT');
      setItemName('');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseCost('0');
      setSupplier('');
      setOfficeBranch('Head Office - Islamabad');
      setBuildingRoom('Central Store - Bay A');
      setCondition('Good');
      setStatus('Available');
      setWarrantyExpiry('');
      setInvoiceDocLink('');
      setRemarks('');
      setRecordCompletion('Partial');
      setError(null);
    }
  }, [assetToEdit, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId.trim()) {
      setError('Asset ID is required.');
      return;
    }
    if (!itemName.trim()) {
      setError('Item Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const selectedCategory = categories.find(c => c.categoryId === categoryId);
    const categoryName = selectedCategory ? selectedCategory.categoryName : 'General Equipment';

    const payload: Partial<Asset> = {
      assetId: assetId.trim().toUpperCase(),
      categoryId,
      categoryName,
      itemName: itemName.trim(),
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      purchaseDate,
      purchaseCost: parseFloat(purchaseCost) || 0,
      supplier: supplier.trim(),
      officeBranch,
      buildingRoom,
      condition,
      status: isEditing ? status : 'Available',
      warrantyExpiry,
      invoiceDocLink: invoiceDocLink.trim(),
      remarks: remarks.trim(),
      recordCompletion
    };

    try {
      if (isEditing && assetToEdit) {
        const res = await api.updateAsset(assetToEdit.assetId, payload);
        onSuccess(res.asset);
      } else {
        const res = await api.createAsset(payload);
        onSuccess(res.asset);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save asset record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            {isEditing ? <Edit className="w-5 h-5 text-slate-800" /> : <PlusCircle className="w-5 h-5 text-emerald-700" />}
            <h3 className="font-semibold text-slate-900 text-base">
              {isEditing ? `Edit Asset: ${assetToEdit?.assetId}` : 'Register New WANG Asset'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Asset ID & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset ID (From Physical Label) *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value.toUpperCase())}
                placeholder="e.g. WANG-ELE-005"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase tracking-wide disabled:bg-slate-100 disabled:text-slate-500 focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-[10px] text-slate-500">
                Preserve existing label ID exactly. Cannot be changed once created.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName} ({c.categoryId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Dell Latitude 5420 Laptop"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Brand, Model, Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Dell, HP, Logitech"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Latitude 5420"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. DL-9941-K"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Location & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Branch</label>
              <select
                value={officeBranch}
                onChange={(e) => setOfficeBranch(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="Head Office - Islamabad">Head Office - Islamabad</option>
                <option value="Field Office - Quetta">Field Office - Quetta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Building / Room</label>
              <input
                type="text"
                value={buildingRoom}
                onChange={(e) => setBuildingRoom(e.target.value)}
                placeholder="e.g. Room 204 - IT & Media Lab"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Condition, Cost, Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Minor Wear">Minor Wear</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Supplier & Warranty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. MegaTech Systems Pvt Ltd"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Expiry</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Record Completion & Invoice Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Record Completion</label>
              <select
                value={recordCompletion}
                onChange={(e) => setRecordCompletion(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Complete">Complete</option>
                <option value="Verified">Verified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / Doc URL</label>
              <input
                type="url"
                value={invoiceDocLink}
                onChange={(e) => setInvoiceDocLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks & Notes</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Configured with dual monitors in IT lab..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
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
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
