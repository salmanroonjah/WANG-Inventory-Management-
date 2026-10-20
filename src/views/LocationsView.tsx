import React from 'react';
import { MapPin, Building, Boxes, ArrowRight } from 'lucide-react';
import { LocationRecord } from '../types/inventory.js';

interface LocationsViewProps {
  locations: LocationRecord[];
  onSelectLocation: (locationStr: string) => void;
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  onSelectLocation
}) => {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-800" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Offices, Branches & Storage Locations
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Corresponds to the "Employees & Locations" tab in the WANG workbook.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc) => (
          <div
            key={loc.locationId}
            onClick={() => onSelectLocation(loc.officeBranch)}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {loc.locationId}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  loc.isStore
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {loc.isStore ? 'Central Store' : 'Active Office Room'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                {loc.officeBranch}
              </h3>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {loc.building} · {loc.floor} ({loc.room})
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {loc.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Boxes className="w-4 h-4 text-slate-400" />
                {loc.assetCount} asset{loc.assetCount === 1 ? '' : 's'} assigned
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                View Assets <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
