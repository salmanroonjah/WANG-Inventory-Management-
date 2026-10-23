import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, PlusCircle, Edit, Sparkles, MapPin } from 'lucide-react';
import { Asset, AssetCondition, AssetStatus, Category, LocationRecord, RecordCompletion } from '../types/inventory.js';
import { api } from '../services/api.js';
import { BuildingRoomSelector } from './BuildingRoomSelector.js';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit: Asset | null;
  categories: Category[];
  locations: LocationRecord[];
  existingAssets?: Asset[];
  onSuccess: (savedAsset: Asset) => void;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
  categories,
  locations,
  existingAssets = [],
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
  const [buildingRoom, setBuildingRoom] = useState('Central Store - Bay A');
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [status, setStatus] = useState<AssetStatus>('Available');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [invoiceDocLink, setInvoiceDocLink] = useState('');
  const [remarks, setRemarks] = useState('');
  const [recordCompletion, setRecordCompletion] = useState<RecordCompletion>('Complete');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCustomRoom, setIsCustomRoom] = useState(false);

  const availableBranches = useMemo(() => {
    const list = Array.from(new Set(locations.map(l => l.officeBranch?.trim()).filter(Boolean)));
    return list.length > 0 ? list : ['Bela', 'Head Office - Islamabad', 'Field Office - Quetta'];
  }, [locations]);

  // Group locations by Building and OfficeBranch for instant structured selection
  const groupedBuildings = useMemo(() => {
    const map = new Map<string, { city: string; building: string; rooms: LocationRecord[] }>();
    locations.forEach(loc => {
      const bKey = `${loc.officeBranch || 'General'}:::${loc.building || 'Main'}`;
      if (!map.has(bKey)) {
        map.set(bKey, {
          city: loc.officeBranch || 'General',
          building: loc.building || 'Main',
          rooms: []
        });
      }
      map.get(bKey)!.rooms.push(loc);
    });
    return Array.from(map.values());
  }, [locations]);

  const branchRooms = useMemo(() => {
    return locations.filter(l => !officeBranch || l.officeBranch?.toLowerCase() === officeBranch.toLowerCase());
  }, [locations, officeBranch]);

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
      const targetRoom = assetToEdit.buildingRoom || 'Central Store - Bay A';
      setBuildingRoom(targetRoom);
      // Check if targetRoom exists in locations
      const exists = locations.some(l => `${l.building} - ${l.room}` === targetRoom || l.room === targetRoom);
      setIsCustomRoom(!exists && Boolean(targetRoom));
      setCondition(assetToEdit.condition || 'Good');
      setStatus(assetToEdit.status || 'Available');
      setWarrantyExpiry(assetToEdit.warrantyExpiry || '');
      setInvoiceDocLink(assetToEdit.invoiceDocLink || '');
      setRemarks(assetToEdit.remarks || '');
      setRecordCompletion(assetToEdit.recordCompletion || 'Complete');
      setError(null);
    } else {
      const initialCatId = categories.length > 0 ? categories[0].categoryId : 'CAT-ITC';
      setCategoryId(initialCatId);
      generateAutoId(initialCatId);
      setItemName('');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseCost('0');
      const defaultBranch = availableBranches[0] || 'Bela';
      const defaultRoom = locations.find(l => l.officeBranch === defaultBranch) || locations[0];
      setOfficeBranch(defaultRoom?.officeBranch || defaultBranch);
      setBuildingRoom(defaultRoom ? `${defaultRoom.building} - ${defaultRoom.room}` : 'Central Store - Bay A');
      setIsCustomRoom(false);
      setCondition('Good');
      setStatus('Available');
      setWarrantyExpiry('');
      setInvoiceDocLink('');
      setRemarks('');
      setRecordCompletion('Complete');
      setError(null);
    }
  }, [assetToEdit, categories, isOpen, locations]);

  const generateAutoId = (catId: string) => {
    const selectedCategory = categories.find(c => c.categoryId === catId);
    let codePrefix = catId.replace(/^CAT-/, '').toUpperCase().trim();
    if (selectedCategory && selectedCategory.categoryId) {
      codePrefix = selectedCategory.categoryId.replace(/^CAT-/, '').toUpperCase().trim();
    }
    if (!codePrefix) codePrefix = 'GEN';

    // Pattern to find existing asset sequence numbers matching WANG-{codePrefix}-{number}
    const escapedPrefix = codePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^WANG-${escapedPrefix}-(\\d+)$`, 'i');
    let maxSeq = 0;

    existingAssets.forEach(a => {
      const match = a.assetId.trim().match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    setAssetId(`WANG-${codePrefix}-${nextSeq}`);
  };

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
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#002254] px-6 py-4 bg-[#003279] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#f1cc11] text-[#003279] flex items-center justify-center font-bold">
              {isEditing ? <Edit className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight text-white">
                {isEditing ? `Edit Asset Record: ${assetToEdit?.assetId}` : 'Register New WANG Asset'}
              </h3>
              <p className="text-xs text-white/75">
                Official WANG Asset Register & Custody System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Asset ID (Barcode Label) *
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => generateAutoId(categoryId)}
                    className="text-[10px] font-bold text-[#003279] hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3 text-[#f1cc11]" />
                    Auto-Generate ID
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                disabled={isEditing}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value.toUpperCase())}
                placeholder="e.g. WANG-ITC-005"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase tracking-wide disabled:bg-slate-100 disabled:text-slate-500 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Matches the physical barcode label adhered to the asset.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Asset Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (!isEditing) generateAutoId(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName} ({c.categoryId.replace(/^CAT-/, '')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Dell Latitude 5420 Laptop"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            />
          </div>

          {/* Brand, Model, Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Dell, HP, Canon"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Latitude 5420"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-8849-DELL"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Location & Room - 2-Step Cascading Selection */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <BuildingRoomSelector
              locations={locations}
              value={buildingRoom}
              onChange={(val, branch) => {
                setBuildingRoom(val);
                if (branch) setOfficeBranch(branch);
              }}
              required
              buildingLabel="1. Select Building (Offices & Rooms) *"
              roomLabel="2. Select Room in Selected Building *"
            />
            {officeBranch && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#003279]" />
                <span>Station / City:</span>
                <span className="font-semibold text-slate-800">{officeBranch}</span>
              </div>
            )}
          </div>

          {/* Condition & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            {isEditing && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Asset Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AssetStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
                >
                  <option value="Available">Available (In Store)</option>
                  <option value="Issued">Issued (In Custody)</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Missing">Missing</option>
                  <option value="Lost">Lost</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            )}
          </div>

          {/* Purchase Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Purchase Cost (PKR) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Warranty Expiry</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Supplier & Doc Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Supplier / Vendor</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Dell Authorized Distributor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Invoice / Doc Link</label>
              <input
                type="url"
                value={invoiceDocLink}
                onChange={(e) => setInvoiceDocLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Remarks & Specifications</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Equipped with 16GB RAM, SSD 512GB, USB-C charger."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4 text-[#f1cc11]" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Asset' : 'Register Asset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
