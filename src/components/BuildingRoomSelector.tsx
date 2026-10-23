import React, { useState, useEffect, useMemo } from 'react';
import { Building2, DoorClosed, Plus } from 'lucide-react';
import { LocationRecord } from '../types/inventory.js';

interface BuildingRoomSelectorProps {
  locations: LocationRecord[];
  value: string; // The combined or room value
  onChange: (buildingRoomValue: string, officeBranch?: string) => void;
  required?: boolean;
  buildingLabel?: string;
  roomLabel?: string;
  className?: string;
}

export const BuildingRoomSelector: React.FC<BuildingRoomSelectorProps> = ({
  locations = [],
  value,
  onChange,
  required = false,
  buildingLabel = '1. Select Building *',
  roomLabel = '2. Select Room / Bay *',
  className = ''
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [customInput, setCustomInput] = useState('');

  // Extract unique building groups from registered locations
  const buildingsMap = useMemo(() => {
    const map = new Map<string, { building: string; city: string; rooms: LocationRecord[] }>();
    locations.forEach(loc => {
      const bName = loc.building?.trim();
      if (!bName) return;
      if (!map.has(bName)) {
        map.set(bName, {
          building: bName,
          city: loc.officeBranch || '',
          rooms: []
        });
      }
      map.get(bName)!.rooms.push(loc);
    });
    return map;
  }, [locations]);

  const buildingList = useMemo(() => Array.from(buildingsMap.values()), [buildingsMap]);

  // Sync internal state when value or locations change
  useEffect(() => {
    if (!value) {
      if (buildingList.length > 0 && !selectedBuilding) {
        const firstB = buildingList[0];
        setSelectedBuilding(firstB.building);
        if (firstB.rooms.length > 0) {
          const firstR = firstB.rooms[0];
          setSelectedRoom(`${firstB.building} - ${firstR.room}`);
        }
      }
      return;
    }

    // Try to match value with registered locations
    let matchedBuilding = '';
    let matchedRoomVal = '';

    for (const bg of buildingList) {
      for (const r of bg.rooms) {
        const fullCombo = `${bg.building} - ${r.room}`;
        if (value === fullCombo || value === r.room || (value.includes(bg.building) && value.includes(r.room))) {
          matchedBuilding = bg.building;
          matchedRoomVal = fullCombo;
          break;
        }
      }
      if (matchedBuilding) break;
    }

    if (matchedBuilding && matchedRoomVal) {
      setIsCustomMode(false);
      setSelectedBuilding(matchedBuilding);
      setSelectedRoom(matchedRoomVal);
    } else {
      setCustomInput(value);
      const bMatch = buildingList.find(b => value.toLowerCase().includes(b.building.toLowerCase()));
      if (bMatch) {
        setSelectedBuilding(bMatch.building);
      }
    }
  }, [value, locations, buildingList]);

  // Rooms available for currently selected building
  const currentBuildingRooms = useMemo(() => {
    if (!selectedBuilding) return [];
    const group = buildingsMap.get(selectedBuilding);
    return group ? group.rooms : [];
  }, [selectedBuilding, buildingsMap]);

  const handleBuildingChange = (newBuilding: string) => {
    if (newBuilding === '__CUSTOM__') {
      setIsCustomMode(true);
      return;
    }
    setIsCustomMode(false);
    setSelectedBuilding(newBuilding);
    const rooms = buildingsMap.get(newBuilding)?.rooms || [];
    if (rooms.length > 0) {
      const firstRoomVal = `${newBuilding} - ${rooms[0].room}`;
      setSelectedRoom(firstRoomVal);
      const foundLoc = rooms[0];
      onChange(firstRoomVal, foundLoc.officeBranch);
    } else {
      const fallbackVal = `${newBuilding} - General`;
      setSelectedRoom(fallbackVal);
      onChange(fallbackVal, buildingsMap.get(newBuilding)?.city);
    }
  };

  const handleRoomChange = (newRoomVal: string) => {
    if (newRoomVal === '__CUSTOM__') {
      setIsCustomMode(true);
      return;
    }
    setSelectedRoom(newRoomVal);
    const group = buildingsMap.get(selectedBuilding);
    const foundLoc = group?.rooms.find(r => `${selectedBuilding} - ${r.room}` === newRoomVal || r.room === newRoomVal);
    onChange(newRoomVal, foundLoc?.officeBranch || group?.city);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    onChange(val);
  };

  if (locations.length === 0 || isCustomMode) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-[#003279]" />
            Location / Room Name *
          </label>
          {locations.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="text-[10px] text-[#003279] hover:underline font-bold"
            >
              ← Pick Registered Building
            </button>
          )}
        </div>
        <input
          type="text"
          required={required}
          value={customInput}
          onChange={handleCustomInputChange}
          placeholder="e.g. Head Office Building - Room 101"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
        />
        <span className="text-[10px] text-slate-500 block">
          {locations.length > 0 ? 'Custom location entry mode.' : 'No locations registered in Offices & Rooms yet. Type room name manually.'}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-[#003279]" />
          Location Selection (Registered Facilities)
        </span>
        <button
          type="button"
          onClick={() => setIsCustomMode(true)}
          className="text-[10px] text-[#003279] hover:underline font-bold flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3 text-[#f1cc11]" />
          Custom Location
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Step 1: Select Building */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <span>🏢</span> {buildingLabel}
          </label>
          <select
            required={required}
            value={selectedBuilding}
            onChange={(e) => handleBuildingChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
          >
            <option value="" disabled>-- Select Building --</option>
            {buildingList.map((bg) => (
              <option key={bg.building} value={bg.building}>
                🏢 {bg.building} ({bg.city || 'Station'})
              </option>
            ))}
            <option value="__CUSTOM__">✍️ Enter Unlisted Building...</option>
          </select>
        </div>

        {/* Step 2: Select Room (Filtered by chosen Building) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <span>🚪</span> {roomLabel}
          </label>
          <select
            required={required}
            disabled={!selectedBuilding}
            value={selectedRoom}
            onChange={(e) => handleRoomChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
          >
            <option value="" disabled>-- Select Room in {selectedBuilding || 'Building'} --</option>
            {currentBuildingRooms.map((loc) => {
              const combo = `${selectedBuilding} - ${loc.room}`;
              return (
                <option key={loc.locationId} value={combo}>
                  🚪 {loc.room} {loc.floor ? `(${loc.floor})` : ''}
                </option>
              );
            })}
            <option value="__CUSTOM__">✍️ Enter Custom Room in {selectedBuilding}...</option>
          </select>
        </div>
      </div>
    </div>
  );
};
