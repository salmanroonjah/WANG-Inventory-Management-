import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  MapPin, 
  Building, 
  AlertCircle, 
  PlusCircle, 
  Edit3, 
  FileText 
} from 'lucide-react';
import { api } from '../services/api.js';

interface BuildingFormModalProps {
  isOpen: boolean;
  cityToEdit?: string | null;
  buildingToEdit?: string | null;
  existingCities?: string[];
  onClose: () => void;
  onSuccess: (city: string, building: string) => void;
}

const PRESET_CITIES = [
  'Bela',
  'Islamabad',
  'Quetta',
  'Karachi',
  'Lasbela'
];

export const BuildingFormModal: React.FC<BuildingFormModalProps> = ({
  isOpen,
  cityToEdit,
  buildingToEdit,
  existingCities = [],
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(buildingToEdit);

  const [city, setCity] = useState('Bela');
  const [customCity, setCustomCity] = useState('');
  const [useCustomCity, setUseCustomCity] = useState(false);

  const [buildingName, setBuildingName] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCities = Array.from(new Set([...PRESET_CITIES, ...existingCities]));

  useEffect(() => {
    if (cityToEdit && buildingToEdit) {
      if (allCities.includes(cityToEdit)) {
        setCity(cityToEdit);
        setUseCustomCity(false);
        setCustomCity('');
      } else {
        setCity('OTHER');
        setUseCustomCity(true);
        setCustomCity(cityToEdit);
      }
      setBuildingName(buildingToEdit);
      setDescription('');
    } else {
      setCity(allCities[0] || 'Bela');
      setUseCustomCity(false);
      setCustomCity('');
      setBuildingName('');
      setDescription('');
    }
    setError(null);
  }, [cityToEdit, buildingToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCity = useCustomCity ? customCity.trim() : city;

    if (!finalCity) {
      setError('City / Location name is required.');
      return;
    }
    if (!buildingName.trim()) {
      setError('Building Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && cityToEdit && buildingToEdit) {
        // Find existing room in this building or create a default entry if updating building title
        const locations = await api.getLocations();
        const matchingLocs = locations.filter(
          l => l.officeBranch.toLowerCase() === cityToEdit.toLowerCase() && l.building.toLowerCase() === buildingToEdit.toLowerCase()
        );

        if (matchingLocs.length > 0) {
          for (const loc of matchingLocs) {
            await api.updateLocation(loc.locationId, {
              officeBranch: finalCity,
              building: buildingName.trim()
            });
          }
        } else {
          await api.createLocation({
            officeBranch: finalCity,
            building: buildingName.trim(),
            floor: 'Ground Floor',
            room: 'Main Office',
            description: description.trim(),
            isStore: false
          });
        }
      } else {
        // Register a new building with an initial default room or main office
        await api.createLocation({
          officeBranch: finalCity,
          building: buildingName.trim(),
          floor: 'Ground Floor',
          room: 'Room No 1: Main Office',
          description: description.trim() || `Primary facility in ${finalCity}`,
          isStore: false
        });
      }

      onSuccess(finalCity, buildingName.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save building details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-[#003279] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              {isEditing ? <Edit3 className="w-5 h-5 text-[#f1cc11]" /> : <PlusCircle className="w-5 h-5 text-[#f1cc11]" />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isEditing ? 'Edit Building' : 'Add New Building'}
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                {isEditing ? 'Update building name and city location' : 'Register a new office building in a city'}
              </p>
            </div>
          </div>
          <button
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

          {/* City / Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              City / Location <span className="text-red-500">*</span>
            </label>
            {!useCustomCity ? (
              <div className="space-y-2">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={city}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM_NEW') {
                        setUseCustomCity(true);
                        setCustomCity('');
                      } else {
                        setCity(e.target.value);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] focus:border-[#003279] text-slate-900 bg-white"
                  >
                    {allCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="CUSTOM_NEW">+ Add New City (e.g. Turbat, Hub)...</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="e.g. Bela, Karachi, Quetta, Turbat"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomCity(false)}
                  className="text-xs text-[#003279] font-bold hover:underline cursor-pointer"
                >
                  ← Select from existing city list
                </button>
              </div>
            )}
          </div>

          {/* Building Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Building Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Head Office Building Bela or West Wing"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Example: <strong className="text-slate-800">Head Office Building, Bela</strong>, <strong className="text-slate-800">WANG Operations Complex</strong>.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Building Description & Facilities
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe floors, offices, studios, or labs in this building..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#003279] hover:bg-[#002357] rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#f1cc11]" />
                  <span>{isEditing ? 'Save Building' : 'Create Building'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
