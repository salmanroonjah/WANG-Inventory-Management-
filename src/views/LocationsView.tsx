import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Building2, 
  Boxes, 
  ArrowRight, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Layers,
  Home,
  Eye,
  Navigation,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { LocationRecord, Asset } from '../types/inventory.js';
import { LocationFormModal } from '../components/LocationFormModal.js';
import { api } from '../services/api.js';

interface LocationsViewProps {
  locations: LocationRecord[];
  allAssets?: Asset[];
  canManage?: boolean;
  onSelectLocation: (locationStr: string) => void;
  onRefreshData?: () => void;
}

export interface LocationRecordWithLiveCount extends LocationRecord {
  liveAssetCount: number;
}

interface BuildingGroup {
  city: string;
  buildingName: string;
  rooms: LocationRecordWithLiveCount[];
  totalAssetCount: number;
  floors: string[];
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  allAssets = [],
  canManage = false,
  onSelectLocation,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('all');

  // Currently selected building for viewing rooms inside it
  const [selectedBuildingGroupKey, setSelectedBuildingGroupKey] = useState<string | null>(null);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<LocationRecord | null>(null);
  const [buildingToEdit, setBuildingToEdit] = useState<{ city: string; buildingName: string } | null>(null);
  const [preselectedCity, setPreselectedCity] = useState<string | null>(null);
  const [preselectedBuilding, setPreselectedBuilding] = useState<string | null>(null);

  // Room Assets Preview Drawer/Modal
  const [previewLocation, setPreviewLocation] = useState<LocationRecord | null>(null);

  // Delete state for Room
  const [deletingLocation, setDeletingLocation] = useState<LocationRecord | null>(null);

  // Delete state for Building
  const [deletingBuildingGroup, setDeletingBuildingGroup] = useState<BuildingGroup | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute live asset counts for each location room
  const locationsWithLiveCount = useMemo(() => {
    return locations.map(loc => {
      const matchCount = allAssets.filter(a => 
        a.officeBranch?.toLowerCase() === loc.officeBranch?.toLowerCase() &&
        (a.buildingRoom?.toLowerCase().includes(loc.room?.toLowerCase()) || loc.room?.toLowerCase().includes(a.buildingRoom?.toLowerCase()))
      ).length;
      return {
        ...loc,
        liveAssetCount: Math.max(matchCount, loc.assetCount || 0)
      };
    });
  }, [locations, allAssets]);

  // Unique list of cities/branches
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    locations.forEach(l => {
      if (l.officeBranch) set.add(l.officeBranch);
    });
    return Array.from(set).sort();
  }, [locations]);

  // Unique list of building names
  const uniqueBuildingNames = useMemo(() => {
    const set = new Set<string>();
    locations.forEach(l => {
      if (l.building) set.add(l.building);
    });
    return Array.from(set).sort();
  }, [locations]);

  // Group locations by Building & City
  const buildingGroups = useMemo<BuildingGroup[]>(() => {
    const groupMap = new Map<string, BuildingGroup>();

    locationsWithLiveCount.forEach(loc => {
      const city = loc.officeBranch || 'General Office';
      const buildingName = loc.building || 'Main Building';
      const key = `${city.trim().toLowerCase()}:::${buildingName.trim().toLowerCase()}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          city,
          buildingName,
          rooms: [],
          totalAssetCount: 0,
          floors: []
        });
      }

      const group = groupMap.get(key)!;
      group.rooms.push(loc);
      group.totalAssetCount += loc.liveAssetCount;
      if (loc.floor && !group.floors.includes(loc.floor)) {
        group.floors.push(loc.floor);
      }
    });

    return Array.from(groupMap.values());
  }, [locationsWithLiveCount]);

  // Filter building groups based on search term & selected city filter
  const filteredBuildingGroups = useMemo(() => {
    return buildingGroups.filter(bg => {
      const matchesCity = selectedCityFilter === 'all' || bg.city.toLowerCase() === selectedCityFilter.toLowerCase();

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q ||
        bg.city.toLowerCase().includes(q) ||
        bg.buildingName.toLowerCase().includes(q) ||
        bg.rooms.some(r => r.room.toLowerCase().includes(q) || r.floor.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));

      return matchesCity && matchesSearch;
    });
  }, [buildingGroups, selectedCityFilter, searchTerm]);

  // Active Building Group if a building is selected
  const activeBuildingGroup = useMemo(() => {
    if (!selectedBuildingGroupKey) return null;
    return buildingGroups.find(bg => `${bg.city.toLowerCase()}:::${bg.buildingName.toLowerCase()}` === selectedBuildingGroupKey) || null;
  }, [buildingGroups, selectedBuildingGroupKey]);

  // Rooms inside selected Building, filtered by search & floor
  const activeBuildingRooms = useMemo(() => {
    if (!activeBuildingGroup) return [];
    return activeBuildingGroup.rooms.filter(room => {
      const matchesFloor = selectedFloorFilter === 'all' || room.floor.toLowerCase() === selectedFloorFilter.toLowerCase();
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q ||
        room.room.toLowerCase().includes(q) ||
        room.floor.toLowerCase().includes(q) ||
        (room.description && room.description.toLowerCase().includes(q));

      return matchesFloor && matchesSearch;
    });
  }, [activeBuildingGroup, selectedFloorFilter, searchTerm]);

  // Assets belonging to preview Location Room
  const previewRoomAssets = useMemo(() => {
    if (!previewLocation) return [];
    return allAssets.filter(a => 
      a.officeBranch?.toLowerCase() === previewLocation.officeBranch?.toLowerCase() &&
      (a.buildingRoom?.toLowerCase().includes(previewLocation.room?.toLowerCase()) || previewLocation.room?.toLowerCase().includes(a.buildingRoom?.toLowerCase()))
    );
  }, [allAssets, previewLocation]);

  // Handlers
  const handleOpenAddRoomModal = (city?: string, bName?: string) => {
    setLocationToEdit(null);
    setBuildingToEdit(null);
    setPreselectedCity(city || (activeBuildingGroup ? activeBuildingGroup.city : null));
    setPreselectedBuilding(bName || (activeBuildingGroup ? activeBuildingGroup.buildingName : null));
    setIsFormModalOpen(true);
  };

  const handleOpenEditBuildingModal = (bg: BuildingGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationToEdit(null);
    setBuildingToEdit({ city: bg.city, buildingName: bg.buildingName });
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteBuildingConfirm = (bg: BuildingGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingBuildingGroup(bg);
    setDeleteError(null);
  };

  const handleDeleteBuildingConfirm = async () => {
    if (!deletingBuildingGroup) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteBuilding(deletingBuildingGroup.city, deletingBuildingGroup.buildingName);
      setSuccessMsg(`Building "${deletingBuildingGroup.buildingName}" and its rooms deleted successfully.`);
      setDeletingBuildingGroup(null);
      setSelectedBuildingGroupKey(null);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete building.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditRoomModal = (loc: LocationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setBuildingToEdit(null);
    setLocationToEdit(loc);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteConfirm = (loc: LocationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingLocation(loc);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLocation) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteLocation(deletingLocation.locationId);
      setSuccessMsg(`Room "${deletingLocation.room}" deleted successfully.`);
      setDeletingLocation(null);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete room.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setSuccessMsg('Saved successfully.');
    if (buildingToEdit) {
      setSelectedBuildingGroupKey(null);
    }
    if (onRefreshData) onRefreshData();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const totalBuildingsCount = buildingGroups.length;
  const totalRoomsCount = locations.length;
  const totalAssetsCount = useMemo(() => {
    return locationsWithLiveCount.reduce((sum, l) => sum + l.liveAssetCount, 0);
  }, [locationsWithLiveCount]);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#003279]/10 rounded-xl">
              <Building2 className="w-6 h-6 text-[#003279]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Offices, Buildings & Facility Rooms</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                City 📍 → Building 🏢 → Floor 🥞 → Room / Office 🚪 Structure for WANG
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => handleOpenAddRoomModal()}
              className="px-4 py-2.5 bg-[#003279] hover:bg-[#002357] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#f1cc11]" />
              <span>Register New Building / Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <MapPin className="w-5 h-5 text-[#f1cc11]" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">{uniqueCities.length || 0}</div>
            <div className="text-[11px] font-medium text-slate-500">Cities / Locations</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">{totalBuildingsCount}</div>
            <div className="text-[11px] font-medium text-slate-500">Registered Buildings</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">{totalRoomsCount}</div>
            <div className="text-[11px] font-medium text-slate-500">Total Offices & Rooms</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">{totalAssetsCount}</div>
            <div className="text-[11px] font-medium text-slate-500">Assigned Assets</div>
          </div>
        </div>
      </div>

      {/* VIEW LEVEL 1: BUILDINGS GRID (Default View) */}
      {!selectedBuildingGroupKey ? (
        <div className="space-y-5">
          {/* Search & City Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search buildings, cities, rooms..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] text-slate-900"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-[#003279]"
              >
                <option value="all">All Cities & Locations</option>
                {uniqueCities.map(c => (
                  <option key={c} value={c}>📍 {c}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium shrink-0">
              Showing <span className="font-bold text-slate-800">{filteredBuildingGroups.length}</span> buildings
            </div>
          </div>

          {/* Buildings Cards Grid */}
          {filteredBuildingGroups.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Buildings Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm ? `No building matched "${searchTerm}". Try resetting your filter.` : 'No building offices registered yet.'}
              </p>
              {canManage && (
                <button
                  onClick={() => handleOpenAddRoomModal()}
                  className="mt-4 px-4 py-2 bg-[#003279] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#f1cc11]" /> Register First Building & Room
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBuildingGroups.map((bg) => {
                const groupKey = `${bg.city.toLowerCase()}:::${bg.buildingName.toLowerCase()}`;
                return (
                  <div
                    key={groupKey}
                    onClick={() => {
                      setSelectedBuildingGroupKey(groupKey);
                      setSelectedFloorFilter('all');
                    }}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-[#003279] shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group overflow-hidden cursor-pointer"
                  >
                    <div className="p-5">
                      {/* Top City Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-extrabold text-[#003279] bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100 flex items-center gap-1.5 uppercase tracking-wide">
                          <MapPin className="w-3.5 h-3.5 text-[#f1cc11]" />
                          <span>{bg.city}</span>
                        </span>

                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {bg.rooms.length} Room{bg.rooms.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Building Name */}
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-[#003279]/5 group-hover:bg-[#003279] group-hover:text-white rounded-xl transition-colors shrink-0">
                          <Building2 className="w-6 h-6 text-[#003279] group-hover:text-[#f1cc11]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base group-hover:text-[#003279] transition-colors leading-snug">
                            {bg.buildingName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {bg.floors.length > 0 ? bg.floors.join(' • ') : 'Ground Floor'}
                          </p>
                        </div>
                      </div>

                      {/* Rooms Chips Preview */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Offices / Rooms Inside:
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-hidden">
                          {bg.rooms.slice(0, 5).map(r => (
                            <span
                              key={r.locationId}
                              className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200"
                            >
                              {r.room}
                            </span>
                          ))}
                          {bg.rooms.length > 5 && (
                            <span className="text-[11px] font-bold text-[#003279] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                              +{bg.rooms.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Asset Summary */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Boxes className="w-4 h-4 text-[#003279]" />
                          <span>{bg.totalAssetCount} total asset{bg.totalAssetCount === 1 ? '' : 's'}</span>
                        </span>

                        <span className="text-xs font-extrabold text-[#003279] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Select Building <ChevronRight className="w-4 h-4 text-[#f1cc11]" />
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions: Edit & Delete Building */}
                    <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {canManage && (
                          <button
                            onClick={(e) => handleOpenEditBuildingModal(bg, e)}
                            className="text-slate-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={(e) => handleOpenDeleteBuildingConfirm(bg, e)}
                            className="text-slate-600 hover:text-red-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Delete Building</span>
                          </button>
                        )}
                      </div>

                      {canManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddRoomModal(bg.city, bg.buildingName);
                          }}
                          className="text-[#003279] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#f1cc11]" />
                          <span>+ Add Room</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW LEVEL 2: SELECTED BUILDING & ROOMS VIEW */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Breadcrumb Navigation & Selected Building Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between gap-4 mb-4">
              <button
                onClick={() => setSelectedBuildingGroupKey(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Buildings</span>
              </button>

              <div className="flex items-center gap-2">
                {canManage && activeBuildingGroup && (
                  <button
                    onClick={(e) => handleOpenEditBuildingModal(activeBuildingGroup, e)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-blue-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Building</span>
                  </button>
                )}

                {canManage && activeBuildingGroup && (
                  <button
                    onClick={(e) => handleOpenDeleteBuildingConfirm(activeBuildingGroup, e)}
                    className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete Building</span>
                  </button>
                )}

                {canManage && (
                  <button
                    onClick={() => handleOpenAddRoomModal()}
                    className="px-4 py-1.5 bg-[#003279] hover:bg-[#002357] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#f1cc11]" />
                    <span>+ Add Room to this Building</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selected Building Details Card */}
            {activeBuildingGroup && (
              <div className="bg-[#003279]/5 border border-[#003279]/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[#003279] text-white rounded-2xl shadow-xs">
                    <Building2 className="w-7 h-7 text-[#f1cc11]" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#003279] flex items-center gap-1.5 uppercase tracking-wide">
                      <MapPin className="w-3.5 h-3.5 text-[#f1cc11]" />
                      <span>{activeBuildingGroup.city} City</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                      {activeBuildingGroup.buildingName}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Contains {activeBuildingGroup.rooms.length} registered room offices across {activeBuildingGroup.floors.length || 1} floor levels.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                  <div className="text-center px-3 border-r border-slate-200">
                    <div className="text-lg font-black text-[#003279]">{activeBuildingGroup.rooms.length}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Rooms</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-lg font-black text-emerald-700">{activeBuildingGroup.totalAssetCount}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Assets</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floor Selection Filter Bar */}
          {activeBuildingGroup && activeBuildingGroup.floors.length > 0 && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-500 px-2 shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#003279]" /> Floor Filter:
              </span>
              <button
                onClick={() => setSelectedFloorFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  selectedFloorFilter === 'all'
                    ? 'bg-[#003279] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Floors ({activeBuildingGroup.rooms.length})
              </button>
              {activeBuildingGroup.floors.map(fl => {
                const count = activeBuildingGroup.rooms.filter(r => r.floor === fl).length;
                return (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloorFilter(fl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      selectedFloorFilter === fl
                        ? 'bg-[#003279] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🥞 {fl} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Rooms List Grid inside Selected Building */}
          {activeBuildingRooms.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Rooms Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No rooms added for floor "{selectedFloorFilter}" yet.
              </p>
              {canManage && (
                <button
                  onClick={() => handleOpenAddRoomModal()}
                  className="mt-4 px-4 py-2 bg-[#003279] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#f1cc11]" /> Add First Room Here
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeBuildingRooms.map((loc) => (
                <div
                  key={loc.locationId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-[#003279]/40 hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden"
                >
                  <div className="p-5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-[#003279] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> {loc.locationId}
                      </span>

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        loc.isStore
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {loc.isStore ? '🏬 Central Store' : '🏢 Office / Workspace'}
                      </span>
                    </div>

                    {/* Floor Badge */}
                    <div className="text-xs font-extrabold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                      <Layers className="w-3.5 h-3.5 text-[#003279]" />
                      <span>{loc.floor}</span>
                    </div>

                    {/* Room Name Title */}
                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-[#003279] transition-colors mt-1 leading-snug">
                      {loc.room}
                    </h3>

                    {/* Purpose Description */}
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2 min-h-[2rem]">
                      {loc.description || <span className="text-slate-400 italic">No facility description recorded.</span>}
                    </p>

                    {/* Live Assets Count */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-[#003279]" />
                        <span>{loc.liveAssetCount} asset{loc.liveAssetCount === 1 ? '' : 's'} in room</span>
                      </span>

                      <button
                        onClick={() => setPreviewLocation(loc)}
                        className="text-xs text-[#003279] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Assets
                      </button>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {canManage && (
                      <button
                        onClick={(e) => handleOpenEditRoomModal(loc, e)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Edit Room Details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Room</span>
                      </button>
                    )}

                    {canManage && (
                      <button
                        onClick={(e) => handleOpenDeleteConfirm(loc, e)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Location Modal (Add / Edit Room or Building) */}
      <LocationFormModal
        isOpen={isFormModalOpen}
        locationToEdit={locationToEdit}
        buildingToEdit={buildingToEdit}
        preselectedCity={preselectedCity}
        preselectedBuilding={preselectedBuilding}
        existingBranches={uniqueCities}
        existingBuildings={uniqueBuildingNames}
        onClose={() => {
          setIsFormModalOpen(false);
          setLocationToEdit(null);
          setBuildingToEdit(null);
          setPreselectedCity(null);
          setPreselectedBuilding(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Preview Room Assets Modal */}
      {previewLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-[#003279] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Home className="w-5 h-5 text-[#f1cc11]" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{previewLocation.room}</h3>
                  <p className="text-xs text-slate-200">{previewLocation.officeBranch} City • {previewLocation.building} ({previewLocation.floor})</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewLocation(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800">Room Purpose / Description: </span>
                {previewLocation.description || 'No detailed purpose description set for this room.'}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Assets Located in this Room ({previewRoomAssets.length})</span>
                  <button
                    onClick={() => {
                      const branch = previewLocation.officeBranch;
                      setPreviewLocation(null);
                      onSelectLocation(branch);
                    }}
                    className="text-xs text-[#003279] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View in Main Inventory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </h4>

                {previewRoomAssets.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                    No active assets are currently assigned to <span className="font-bold text-slate-800">{previewLocation.room}</span>.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {previewRoomAssets.map((asset) => (
                      <div key={asset.assetId} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{asset.itemName}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>ID: {asset.assetId}</span>
                            <span>•</span>
                            <span>{asset.brand} {asset.model}</span>
                            {asset.assignedTo && <span>• Assigned: {asset.assignedTo}</span>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          asset.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          asset.status === 'Issued' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewLocation(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Room / Location</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete room <strong className="text-slate-900">{deletingLocation.room}</strong> at <strong className="text-slate-900">{deletingLocation.building} ({deletingLocation.officeBranch})</strong>?
            </p>

            {(() => {
              const count = allAssets.filter(a => 
                a.officeBranch?.toLowerCase() === deletingLocation.officeBranch?.toLowerCase() &&
                (a.buildingRoom?.toLowerCase().includes(deletingLocation.room?.toLowerCase()) || deletingLocation.room?.toLowerCase().includes(a.buildingRoom?.toLowerCase()))
              ).length;
              if (count > 0) {
                return (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Active Assets Present ({count}): </span>
                      This room currently holds {count} active asset(s). Reassign them first before deleting.
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingLocation(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting || allAssets.some(a => 
                  a.officeBranch?.toLowerCase() === deletingLocation.officeBranch?.toLowerCase() &&
                  (a.buildingRoom?.toLowerCase().includes(deletingLocation.room?.toLowerCase()) || deletingLocation.room?.toLowerCase().includes(a.buildingRoom?.toLowerCase()))
                )}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete Room</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Building Confirmation Modal */}
      {deletingBuildingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Entire Building</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete <strong className="text-slate-900">{deletingBuildingGroup.buildingName}</strong> in <strong className="text-slate-900">{deletingBuildingGroup.city}</strong>?
            </p>

            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <div>• <strong>Building:</strong> {deletingBuildingGroup.buildingName} ({deletingBuildingGroup.city})</div>
              <div>• <strong>Rooms to remove:</strong> {deletingBuildingGroup.rooms.length} rooms</div>
              <div>• <strong>Total assets in building:</strong> {deletingBuildingGroup.totalAssetCount} assets</div>
            </div>

            {deletingBuildingGroup.totalAssetCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Active Assets in Building ({deletingBuildingGroup.totalAssetCount}): </span>
                  This building holds active assets across its rooms. Please reassign or transfer those assets before deleting this building.
                </div>
              </div>
            )}

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingBuildingGroup(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBuildingConfirm}
                disabled={isDeleting || deletingBuildingGroup.totalAssetCount > 0}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting Building...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete Building</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
