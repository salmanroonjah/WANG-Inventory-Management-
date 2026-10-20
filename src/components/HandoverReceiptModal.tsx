import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { Asset, AssetTransaction } from '../types/inventory.js';
import { BarcodeBadge } from './BarcodeBadge.js';

interface HandoverReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  transaction: AssetTransaction;
}

export const HandoverReceiptModal: React.FC<HandoverReceiptModalProps> = ({
  isOpen,
  onClose,
  asset,
  transaction
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const isIssue = transaction.transactionType === 'ISSUE';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Official Handover & Receipt Document
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-8 overflow-y-auto flex-1 bg-white font-sans text-slate-800" ref={printAreaRef}>
          {/* Organization Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-slate-500">
                Welfare Association for New Generation
              </span>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                WANG INVENTORY SYSTEM
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Head Office: Islamabad, Pakistan · Field Hub: Quetta, Balochistan
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-slate-900 font-mono">
                {isIssue ? 'ASSET ISSUANCE VOUCHER' : 'ASSET RETURN VOUCHER'}
              </span>
              <p className="text-xs font-mono text-slate-500 mt-1.5">
                Ref: {transaction.transactionId}
              </p>
            </div>
          </div>

          {/* Barcode & Key Identifiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                Asset Physical Identifier
              </span>
              <div className="mt-1">
                <BarcodeBadge value={asset.assetId} height={42} width={1.8} />
              </div>
            </div>
            <div className="flex flex-col justify-center text-xs space-y-1">
              <div>
                <span className="text-slate-500">Transaction Date: </span>
                <span className="font-semibold text-slate-900">
                  {new Date(transaction.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Issuing Authority: </span>
                <span className="font-semibold text-slate-900">{transaction.performedByName}</span>
              </div>
              {transaction.dueDate && (
                <div>
                  <span className="text-slate-500">Scheduled Due Date: </span>
                  <span className="font-semibold text-amber-700">{transaction.dueDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Asset Specifications Table */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-200 pb-1">
              Asset Specifications
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-slate-500 block">Item Name:</span>
                <span className="font-semibold text-slate-900">{asset.itemName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Category:</span>
                <span className="font-medium text-slate-900">{asset.categoryName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Brand & Model:</span>
                <span className="font-medium text-slate-900">{asset.brand} - {asset.model || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Serial Number:</span>
                <span className="font-mono font-medium text-slate-900">{asset.serialNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Handover Condition:</span>
                <span className="font-semibold text-slate-900">{transaction.condition}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Assigned Location:</span>
                <span className="font-medium text-slate-900">{asset.officeBranch} ({asset.buildingRoom})</span>
              </div>
            </div>
          </div>

          {/* Handover Details */}
          <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              Personnel Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Responsible Employee:</span>
                <span className="font-bold text-slate-900 text-sm">{transaction.employeeName}</span>
                <span className="text-slate-600 block font-mono">ID: {transaction.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Notes & Custody Terms:</span>
                <p className="text-slate-700 italic mt-0.5">{transaction.notes || 'Asset issued in sound working order for official duties.'}</p>
              </div>
            </div>
          </div>

          {/* Custody Undertaking Statement */}
          <div className="mb-8 p-3 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
            <strong>Custody Undertaking:</strong> The employee receiving this equipment agrees to safeguard it, utilize it strictly in accordance with WANG organizational policies, and return it upon request or upon separation from the organization. Any loss, damage, or malfunction must be reported to the IT & Logistics department immediately.
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-6 border-t border-slate-300">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400" />
              <div className="mt-2 text-xs">
                <span className="font-semibold block text-slate-900">{transaction.performedByName}</span>
                <span className="text-slate-500 text-[11px]">Authorized Inventory Custodian / Manager</span>
              </div>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400" />
              <div className="mt-2 text-xs">
                <span className="font-semibold block text-slate-900">{transaction.employeeName}</span>
                <span className="text-slate-500 text-[11px]">Receiving Employee Signature</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            System generated transaction · Stored in immutable audit ledger
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
          >
            Close Voucher
          </button>
        </div>
      </div>
    </div>
  );
};
