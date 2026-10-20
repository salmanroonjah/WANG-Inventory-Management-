import React from 'react';
import { 
  X, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Tag, 
  FileText, 
  ExternalLink,
  Shield,
  Wrench
} from 'lucide-react';
import { Asset, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from './BarcodeBadge.js';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  transactions?: AssetTransaction[];
  onOpenIssue?: (asset: Asset) => void;
  onOpenReturn?: (asset: Asset) => void;
  onOpenReportMissing?: (asset: Asset) => void;
  onOpenResolveStatus?: (asset: Asset) => void;
  onOpenEdit?: (asset: Asset) => void;
  canManage?: boolean;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
  transactions = [],
  onOpenIssue,
  onOpenReturn,
  onOpenReportMissing,
  onOpenResolveStatus,
  onOpenEdit,
  canManage = true
}) => {
  if (!isOpen || !asset) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Issued': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Under Maintenance': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Missing': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Lost': return 'text-purple-700 bg-purple-50 border-purple-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-lg tracking-tight">
                  {asset.assetId}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded font-medium border ${getStatusColor(asset.status)}`}>
                  {asset.status}
                </span>
                <span className="text-xs text-slate-500">
                  {asset.recordCompletion} Record
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-800 mt-0.5">
                {asset.itemName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Action Bar for Quick Workflows */}
        {canManage && (
          <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {asset.status === 'Available' && onOpenIssue && (
                <button
                  onClick={() => { onClose(); onOpenIssue(asset); }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Issue to Employee
                </button>
              )}

              {asset.status === 'Issued' && onOpenReturn && (
                <button
                  onClick={() => { onClose(); onOpenReturn(asset); }}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Process Return
                </button>
              )}

              {(asset.status === 'Missing' || asset.status === 'Lost') && onOpenResolveStatus && (
                <button
                  onClick={() => { onClose(); onOpenResolveStatus(asset); }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Recover / Clear Status
                </button>
              )}

              {asset.status !== 'Missing' && asset.status !== 'Lost' && onOpenReportMissing && (
                <button
                  onClick={() => { onClose(); onOpenReportMissing(asset); }}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report Missing/Lost
                </button>
              )}
            </div>

            {onOpenEdit && (
              <button
                onClick={() => { onClose(); onOpenEdit(asset); }}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors"
              >
                Edit Asset Details
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Barcode and Custody Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-col items-start justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Official Barcode (Scan Target)
              </span>
              <BarcodeBadge value={asset.assetId} height={44} width={1.8} />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Current Assignment:</span>
                  {asset.assignedTo ? (
                    <span className="font-semibold text-slate-900">
                      {asset.assignedTo} ({asset.assignedEmployeeId})
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Unassigned (In Store)</span>
                  )}
                  {asset.dueDate && (
                    <span className="block text-[11px] text-amber-700 font-medium">
                      Return Due: {asset.dueDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Location:</span>
                  <span className="font-medium text-slate-800">
                    {asset.officeBranch} · {asset.buildingRoom}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Specs Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Technical & Procurement Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Category:</span>
                <span className="font-medium text-slate-900">{asset.categoryName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Brand & Model:</span>
                <span className="font-medium text-slate-900">{asset.brand} - {asset.model || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Serial Number:</span>
                <span className="font-mono font-medium text-slate-900">{asset.serialNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Physical Condition:</span>
                <span className="font-semibold text-slate-900">{asset.condition}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Purchase Date:</span>
                <span className="text-slate-900">{asset.purchaseDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Purchase Cost:</span>
                <span className="text-slate-900 font-mono">${asset.purchaseCost}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Supplier:</span>
                <span className="text-slate-900">{asset.supplier || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Warranty Expiry:</span>
                <span className="text-slate-900">{asset.warrantyExpiry || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Last Verification:</span>
                <span className="text-slate-600 text-[11px]">{new Date(asset.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Remarks & Document Link */}
          {(asset.remarks || asset.invoiceDocLink) && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
              {asset.remarks && (
                <div>
                  <span className="font-semibold text-slate-700">Remarks: </span>
                  <span className="text-slate-600">{asset.remarks}</span>
                </div>
              )}
              {asset.invoiceDocLink && (
                <div className="flex items-center gap-1.5 text-blue-700">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <a href={asset.invoiceDocLink} target="_blank" rel="noreferrer" className="underline font-medium">
                    View Purchase Invoice / Warranty Document
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Audit History Log for this Asset */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Complete Chain of Custody & Audit Trail ({transactions.length})
            </h4>

            {transactions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No past transactions recorded for this asset.
              </p>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((tx) => (
                  <div key={tx.transactionId} className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 font-mono">{tx.transactionType}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">By {tx.performedByName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700">{tx.notes}</p>
                      {tx.employeeName && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Personnel: {tx.employeeName} ({tx.employeeId})
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-3">
                      {tx.condition}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            ID: {asset.assetId} · Verified in Master Assets Register
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
