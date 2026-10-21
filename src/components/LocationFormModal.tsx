import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  MapPin, 
  Building2, 
  Layers, 
  Home, 
  FileText, 
  AlertCircle, 
  Warehouse,
  Hash
} from 'lucide-react';
import { LocationRecord } from '../types/inventory.js';
import { api } from '../services/api.js';

interface LocationFormModalProps {
  isOpen: boolean;
  locationToEdit?: LocationRecord | null;
  buildingToEdit?: { city: string; buildingName: string } | null;
  preselectedCity?: string | null;
  preselectedBuilding?: string | null;
  existingBranches?: string[];
  existingBuildings?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_FLOORS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  'Basement',
  'Mezzanine'
];

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  locationToEdit,
  buildingToEdit,
  preselectedCity,
  preselectedBuilding,
  existingBranches = [],
  existingBuildings = [],
  onClose,
  onSuccess
}) => {
  const isEditingRoom = Boolean(locationToEdit);
  const isEditingBuilding = Boolean(buildingToEdit);

  // Direct text inputs for city and building name
  const [officeBranch, setOfficeBranch] = useState('');
  const [building, setBuilding] = useState('');

  const [floor, setFloor] = useState('Ground Floor');
  const [roomNumber, setRoomNumber] = useState(''); // e.g., "Room No 1"
  const [roomName, setRoomName] = useState(''); // e.g., "WANG Office"
  const [description, setDescription] = useState('');
  const [isStore, setIsStore] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean unique suggestions for datalist
  const allBranches = Array.from(new Set(existingBranches.filter(Boolean))).sort();
  const allBuildings = Array.from(new Set(existingBuildings.filter(Boolean))).sort();

  useEffect(() => {
    if (buildingToEdit) {
      // Editing building details
      setOfficeBranch(buildingToEdit.city || '');
      setBuilding(buildingToEdit.buildingName || '');
    } else if (locationToEdit) {
      // Editing room details
      setOfficeBranch(locationToEdit.officeBranch || '');
      setBuilding(locationToEdit.building || '');
      setFloor(locationToEdit.floor || 'Ground Floor');

      // Parse room number vs room name if formatted as "Room No 1: WANG Office"
      const rawRoom = locationToEdit.room || '';
      if (rawRoom.includes(':')) {
        const parts = rawRoom.split(':');
        setRoomNumber(parts[0].trim());
        setRoomName(parts.slice(1).join(':').trim());
      } else if (rawRoom.includes(' - ')) {
        const parts = rawRoom.split(' - ');
        setRoomNumber(parts[0].trim());
        setRoomName(parts.slice(1).join(' - ').trim());
      } else {
        setRoomNumber('');
        setRoomName(rawRoom);
      }

      setDescription(locationToEdit.description || '');
      setIsStore(Boolean(locationToEdit.isStore));
    } else {
      // Adding new room or building: leave blank unless preselected context passed
      setOfficeBranch(preselectedCity || '');
      setBuilding(preselectedBuilding || '');
      setFloor('Ground Floor');
      setRoomNumber('');
      setRoomName('');
      setDescription('');
      setIsStore(false);
    }
    setError(null);
  }, [locationToEdit, buildingToEdit, preselectedCity, preselectedBuilding, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBranch = officeBranch.trim();
    const finalBuilding = building.trim();

    if (!finalBranch) {
      setError('City / Location name is required.');
      return;
    }
    if (!finalBuilding) {
      setError('Building name is required.');
      return;
    }

    if (isEditingBuilding && buildingToEdit) {
      // Cascade building name/city update
      setIsSubmitting(true);
      setError(null);
      try {
        await api.updateBuildingInfo(
          buildingToEdit.city,
          buildingToEdit.buildingName,
          finalBranch,
          finalBuilding
        );
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to update building details.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Room Validation
    if (!roomName.trim() && !roomNumber.trim()) {
      setError('Please type a Room Name (e.g. WANG Office) or Room Number (e.g. Room No 1).');
      return;
    }

    // Combine room number and name for clean standard display
    let fullRoomTitle = '';
    if (roomNumber.trim() && roomName.trim()) {
      fullRoomTitle = `${roomNumber.trim()}: ${roomName.trim()}`;
    } else if (roomNumber.trim()) {
      fullRoomTitle = roomNumber.trim();
    } else {
      fullRoomTitle = roomName.trim();
    }

    setIsSubmitting(true);
    setError(null);

    const payload: Partial<LocationRecord> = {
      officeBranch: finalBranch,
      building: finalBuilding,
      floor: floor.trim() || 'Ground Floor',
      room: fullRoomTitle,
      description: description.trim(),
      isStore
    };

    try {
      if (isEditingRoom && locationToEdit) {
        await api.updateLocation(locationToEdit.locationId, payload);
      } else {
        await api.createLocation(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save room location details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="bg-[#003279] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Building2 className="w-5 h-5 text-[#f1cc11]" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isEditingBuilding 
                  ? 'Edit Building Details'
                  : isEditingRoom 
                  ? 'Edit Room / Office' 
                  : 'Add Room / Office to Building'}
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                {isEditingBuilding
                  ? `Update name or city location for ${buildingToEdit?.buildingName}`
                  : isEditingRoom
                  ? 'Update room name, floor level, or facilities'
                  : 'Type city name, building name & room details below'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Datalists for autocomplete */}
          <datalist id="existing-cities-list">
            {allBranches.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <datalist id="existing-buildings-list">
            {allBuildings.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>

          {/* City / Location & Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* City Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City / Location Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  list="existing-cities-list"
                  value={officeBranch}
                  onChange={(e) => setOfficeBranch(e.target.value)}
                  placeholder="e.g. Bela, Karachi, Quetta..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900 font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Type any city or select from past cities.
              </span>
            </div>

            {/* Building Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Building Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  list="existing-buildings-list"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Head Office Building..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900 font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Type any building name.
              </span>
            </div>
          </div>

          {!isEditingBuilding && (
            <>
              {/* Room Number & Room Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Room No / Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. Room No 1, Room 101"
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Room / Office Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g. WANG Office, WALI Lab, Executive Director Office"
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Floor Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Floor Level <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900 bg-white font-medium"
                  >
                    {PRESET_FLOORS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purpose / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Room Purpose / Facilities Description
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Executive room equipped with AC, high-speed Wi-Fi & conference desk"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900 resize-none"
                  />
                </div>
              </div>

              {/* Is Store / Warehouse Checkbox */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Warehouse className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">Mark as Central Storage / Store Room</div>
                    <div className="text-[11px] text-amber-700">Designate this room for spare asset storage & receiving.</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isStore}
                  onChange={(e) => setIsStore(e.target.checked)}
                  className="w-4 h-4 text-[#003279] focus:ring-[#003279] rounded cursor-pointer"
                />
              </div>

              {/* Live Preview Label */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between text-slate-700">
                <span className="font-medium text-slate-500">Preview Full Room Record:</span>
                <span className="font-extrabold text-[#003279] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {officeBranch || 'City'} • {building || 'Building'} • {floor} ({roomNumber ? `${roomNumber}: ` : ''}{roomName || 'Room Name'})
                </span>
              </div>
            </>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#003279] hover:bg-[#002357] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#f1cc11]" />
                  <span>{isEditingBuilding ? 'Save Building Details' : isEditingRoom ? 'Update Room' : 'Save Room'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
