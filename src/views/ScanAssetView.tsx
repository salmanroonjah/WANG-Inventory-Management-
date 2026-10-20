import React, { useState } from 'react';
import { 
  Camera, 
  Search, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  PlusCircle, 
  MapPin, 
  User, 
  FileText, 
  Clock,
  Printer,
  Edit,
  ArrowRight
} from 'lucide-react';
import { Asset, AssetTransaction, Employee } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface ScanAssetViewProps {
  onOpenScannerModal: () => void;
  onOpenIssueModal: (asset: Asset) => void;
  onOpenReturnModal: (asset: Asset) => void;
  onOpenReportMissingModal: (asset: Asset) => void;
  onOpenResolveStatusModal: (asset: Asset) => void;
  onOpenEditModal: (asset: Asset) => void;
  onRegisterUnknown: (assetId: string) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  canManage: boolean;
}

export const ScanAssetView: React.FC<ScanAssetViewProps> = ({
  onOpenScannerModal,
  onOpenIssueModal,
  onOpenReturnModal,
  onOpenReportMissingModal,
  onOpenResolveStatusModal,
  onOpenEditModal,
  onRegisterUnknown,
  onPrintVoucher,
  canManage
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchedAsset, setSearchedAsset] = useState<Asset | null>(null);
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  const sampleBarcodes = [
    { id: 'WANG-ELE-001', name: 'Dell Latitude 5420 Laptop', status: 'Issued (Dr. Salman)' },
    { id: 'WANG-ELE-002', name: 'Logitech MX Master 3S Mouse', status: 'Available' },
    { id: 'WANG-ELE-003', name: 'APC Smart-UPS 1500VA', status: 'Available' },
    { id: 'WANG-IT-001', name: 'HP LaserJet Pro MFP 4103fdw', status: 'Issued (Fatima)' },
    { id: 'WANG-IT-002', name: 'Dell UltraSharp 27" Monitor', status: 'Issued (Ayesha)' },
    { id: 'WANG-FUR-001', name: 'Executive Mesh Chair', status: 'Available' },
    { id: 'WANG-COM-001', name: 'Canon EOS R50 Camera Kit', status: 'Available' }
  ];

  const handleSearch = async (assetIdToSearch: string) => {
    const clean = assetIdToSearch.trim().toUpperCase();
    if (!clean) return;

    setIsLoading(true);
    setSearchAttempted(true);
    setLastSearchedQuery(clean);

    try {
      const res = await api.getAssetById(clean);
      setSearchedAsset(res.asset);
      setTransactions(res.transactions);
    } catch (err) {
      setSearchedAsset(null);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Issued': return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'Under Maintenance': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Missing': return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'Lost': return 'bg-purple-50 text-purple-800 border-purple-300';
      default: return 'bg-slate-50 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Scan & Identify Asset
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan physical WANG barcode labels using mobile camera or enter Asset ID to lookup custody and condition.
          </p>
        </div>

        {/* Large Mobile-First Camera Action */}
        <button
          onClick={onOpenScannerModal}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Camera className="w-5 h-5" />
          <span>Launch Camera Scanner</span>
        </button>
      </div>

      {/* Manual Input Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Enter exact Asset ID (e.g. WANG-ELE-001, WANG-ELE-002)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono uppercase tracking-wide focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {isLoading ? 'Searching...' : 'Lookup Asset'}
          </button>
        </form>

        {/* Quick Simulator Buttons */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Quick Test Labels:</span>
          {sampleBarcodes.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSearchInput(item.id);
                handleSearch(item.id);
              }}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[11px] rounded border border-slate-200 transition-colors"
            >
              {item.id}
            </button>
          ))}
        </div>
      </div>

      {/* Lookup Result Display */}
      {searchedAsset ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          {/* Top Banner */}
          <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="font-mono font-bold text-xl text-slate-900 tracking-tight">
                  {searchedAsset.assetId}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded font-semibold border ${getStatusBadge(searchedAsset.status)}`}>
                  {searchedAsset.status}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {searchedAsset.recordCompletion} Record
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {searchedAsset.itemName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchedAsset.categoryName} · {searchedAsset.brand} {searchedAsset.model}
              </p>
            </div>

            {/* Scannable Barcode Badge */}
            <div className="flex flex-col items-start md:items-end">
              <BarcodeBadge value={searchedAsset.assetId} height={40} width={1.7} />
              <span className="text-[10px] text-slate-400 font-mono mt-1">Verified WANG Asset Barcode</span>
            </div>
          </div>

          {/* Action Bar */}
          {canManage && (
            <div className="px-6 py-3 bg-emerald-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-950">
                Available Immediate Actions:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {searchedAsset.status === 'Available' && (
                  <button
                    onClick={() => onOpenIssueModal(searchedAsset)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Issue This Asset
                  </button>
                )}

                {searchedAsset.status === 'Issued' && (
                  <button
                    onClick={() => onOpenReturnModal(searchedAsset)}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Process Return
                  </button>
                )}

                {(searchedAsset.status === 'Missing' || searchedAsset.status === 'Lost') && (
                  <button
                    onClick={() => onOpenResolveStatusModal(searchedAsset)}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recover / Clear Status
                  </button>
                )}

                {searchedAsset.status !== 'Missing' && searchedAsset.status !== 'Lost' && (
                  <button
                    onClick={() => onOpenReportMissingModal(searchedAsset)}
                    className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Report Missing/Lost
                  </button>
                )}

                <button
                  onClick={() => onOpenEditModal(searchedAsset)}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Record
                </button>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Custody & Physical Location */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Custody & Assignment
              </h3>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Currently In Custody Of:</span>
                    {searchedAsset.assignedTo ? (
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {searchedAsset.assignedTo}
                        </span>
                        <span className="text-slate-500 block font-mono text-[11px]">
                          Employee ID: {searchedAsset.assignedEmployeeId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-emerald-700 font-semibold block mt-0.5">
                        Available in Central Inventory Store
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                  <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Physical Location:</span>
                    <span className="font-semibold text-slate-900">
                      {searchedAsset.officeBranch}
                    </span>
                    <span className="text-slate-600 block text-[11px]">
                      {searchedAsset.buildingRoom}
                    </span>
                  </div>
                </div>

                {searchedAsset.dueDate && (
                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                    <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Scheduled Return Date:</span>
                      <span className="font-bold text-amber-800">
                        {searchedAsset.dueDate}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {searchedAsset.remarks && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs">
                  <span className="font-bold text-amber-950 block mb-0.5">Asset Remarks:</span>
                  <p className="text-amber-900">{searchedAsset.remarks}</p>
                </div>
              )}
            </div>

            {/* Specifications & Financials */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Technical Specifications
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Serial Number:</span>
                  <span className="font-mono font-medium text-slate-900">{searchedAsset.serialNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Condition:</span>
                  <span className="font-semibold text-slate-900">{searchedAsset.condition}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Purchase Cost:</span>
                  <span className="font-mono font-medium text-slate-900">${searchedAsset.purchaseCost}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Purchase Date:</span>
                  <span className="text-slate-900">{searchedAsset.purchaseDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Supplier:</span>
                  <span className="text-slate-900">{searchedAsset.supplier || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Warranty Expiry:</span>
                  <span className="text-slate-900">{searchedAsset.warrantyExpiry || 'N/A'}</span>
                </div>
              </div>

              {/* Transactions Summary */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Transaction Audit History ({transactions.length})
                </span>
                {transactions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No previous events logged.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {transactions.map((tx) => (
                      <div key={tx.transactionId} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-800 font-mono">
                            {tx.transactionType} · {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-slate-600 mt-0.5">{tx.notes}</div>
                          {tx.employeeName && (
                            <div className="text-slate-500 text-[10px]">Employee: {tx.employeeName}</div>
                          )}
                        </div>
                        <button
                          onClick={() => onPrintVoucher(searchedAsset, tx)}
                          title="Print Handover Slip"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : searchAttempted && !isLoading ? (
        /* Unknown Barcode Not Found Card */
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            No Inventory Record for "{lastSearchedQuery}"
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            The barcode was detected, but no matching asset exists in the WANG Master Assets register. Existing Asset IDs must not be replaced.
          </p>

          {canManage && (
            <div className="mt-5 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
              <span className="text-xs font-semibold text-slate-800 block mb-1">
                Authorized Intake Workflow:
              </span>
              <p className="text-xs text-slate-600 mb-3">
                You can register this physical barcode as a new verified asset while preserving the scanned ID <strong>{lastSearchedQuery}</strong>.
              </p>
              <button
                onClick={() => onRegisterUnknown(lastSearchedQuery)}
                className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Register New Asset With ID {lastSearchedQuery}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty Prompt State */
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">
            Ready to Scan WANG Asset Barcodes
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click <strong>Launch Camera Scanner</strong> to read physical barcodes with your mobile phone camera, or click any sample label above to simulate a live scan.
          </p>
        </div>
      )}
    </div>
  );
};
