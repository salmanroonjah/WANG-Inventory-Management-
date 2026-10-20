import React, { useState } from 'react';
import { Wrench, PlusCircle, CheckCircle2, Clock, DollarSign, X } from 'lucide-react';
import { MaintenanceRecord, Asset } from '../types/inventory.js';
import { api } from '../services/api.js';

interface MaintenanceViewProps {
  maintenance: MaintenanceRecord[];
  assets: Asset[];
  onRefresh: () => void;
  canManage: boolean;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  maintenance,
  assets,
  onRefresh,
  canManage
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.assetId || '');
  const [issueDescription, setIssueDescription] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [repairCost, setRepairCost] = useState('0');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaintenance({
        assetId: selectedAssetId,
        issueDescription,
        serviceProvider,
        repairCost: parseFloat(repairCost) || 0
      });
      setIsCreating(false);
      setIssueDescription('');
      setServiceProvider('');
      setRepairCost('0');
      onRefresh();
    } catch (err) {
      console.error('Failed to create maintenance record', err);
    }
  };

  const handleMarkCompleted = async (recordId: string) => {
    try {
      await api.updateMaintenance(recordId, {
        status: 'Completed',
        completionDate: new Date().toISOString().split('T')[0],
        workPerformed: 'Servicing inspected and certified functional. Returned to store inventory.'
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update maintenance record', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Maintenance, Warranties & Repairs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Service history, repair cost tracking, and warranty validation for damaged or impaired office equipment.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Log Maintenance Ticket
          </button>
        )}
      </div>

      {/* New Maintenance Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-4">
              Open Equipment Repair Ticket
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Asset *</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 font-mono"
                >
                  {assets.map(a => (
                    <option key={a.assetId} value={a.assetId}>
                      {a.assetId} — {a.itemName} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Description & Fault Symptoms *</label>
                <textarea
                  rows={2}
                  required
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe failure, physical defect, or required servicing..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Vendor / Technician</label>
                  <input
                    type="text"
                    value={serviceProvider}
                    onChange={(e) => setServiceProvider(e.target.value)}
                    placeholder="e.g. MegaTech Systems Workshop"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Repair Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create Ticket & Transition Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Ticket ID</th>
                <th className="py-2.5 px-4">Asset ID & Item</th>
                <th className="py-2.5 px-4">Issue Description</th>
                <th className="py-2.5 px-4">Reported Date</th>
                <th className="py-2.5 px-4">Repairer</th>
                <th className="py-2.5 px-4">Cost</th>
                <th className="py-2.5 px-4">Status</th>
                {canManage && <th className="py-2.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {maintenance.map((m) => (
                <tr key={m.maintenanceId} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{m.maintenanceId}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{m.assetName}</span>
                    <span className="font-mono text-slate-500 text-[10px]">{m.assetId}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs">{m.issueDescription}</td>
                  <td className="py-3 px-4 text-slate-500">{m.reportedDate}</td>
                  <td className="py-3 px-4 text-slate-700">{m.serviceProvider}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">${m.repairCost}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      m.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      m.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {m.status !== 'Completed' ? (
                        <button
                          onClick={() => handleMarkCompleted(m.maintenanceId)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] shadow-xs"
                        >
                          Mark Repaired & Returned
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Certified</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
