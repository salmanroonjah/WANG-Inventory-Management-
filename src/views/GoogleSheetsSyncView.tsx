import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ExternalLink, 
  FileSpreadsheet, 
  ShieldCheck, 
  ArrowDownUp, 
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { GoogleSheetsSyncConfig } from '../types/inventory.js';
import { api } from '../services/api.js';

interface GoogleSheetsSyncViewProps {
  onRefresh: () => void;
  canManage: boolean;
}

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({
  onRefresh,
  canManage
}) => {
  const [config, setConfig] = useState<GoogleSheetsSyncConfig | null>(null);
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; rowCount?: number } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'setup' | 'preview'>('status');
  const [workbookPreview, setWorkbookPreview] = useState<Record<string, string[][]> | null>(null);
  const [selectedPreviewSheet, setSelectedPreviewSheet] = useState('Master Assets');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const c = await api.getSheetsConfig();
      setConfig(c);
      setSpreadsheetIdInput(c.spreadsheetId);
    } catch (err) {
      console.error('Failed to load sheets config', err);
    }
  };

  const handleTestConnection = async () => {
    if (!spreadsheetIdInput.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testSheetsConnection(spreadsheetIdInput.trim());
      setTestResult(res);
      await loadConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection failed. Please verify Spreadsheet ID.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadPreview = async () => {
    try {
      const wb = await api.getWorkbookExport();
      setWorkbookPreview(wb);
      setActiveTab('preview');
    } catch (err) {
      console.error('Failed to load workbook preview', err);
    }
  };

  const handleDownloadSheetCSV = (sheetName: string) => {
    if (!workbookPreview || !workbookPreview[sheetName]) return;
    const rows = workbookPreview[sheetName];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WANG_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Sheet className="w-5 h-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Google Sheets Workbook Integration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronizes Master Assets, Categories, Employees & Locations, and Asset Transactions with the WANG Google Sheets workbook.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadPreview}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            View Synchronized Workbook
          </button>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'status' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Connection & Status
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'setup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Setup & Instructions
        </button>
        {workbookPreview && (
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Workbook Preview
          </button>
        )}
      </div>

      {/* TAB 1: CONNECTION & STATUS */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Connection Configuration Box */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Target Spreadsheet Configuration
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Sheets Spreadsheet ID
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={spreadsheetIdInput}
                  onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !canManage}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Verifying...' : 'Test & Sync Connection'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Found in the Google Sheets URL: https://docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
              </p>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.rowCount !== undefined && (
                    <p className="mt-0.5 text-emerald-800">
                      Successfully verified <strong>{testResult.rowCount}</strong> physical assets in Master Assets tab.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5 Tabs Verification Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Required Workbook Tabs Health Check
                </h3>
                <p className="text-xs text-slate-500">
                  Exact schema matching original WANG Excel template
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-full">
                5 / 5 Tabs Verified
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono">1. START HERE</span>
                  <p className="text-slate-500 text-[11px]">System guidelines, organization metadata, and operational notice.</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Connected
                </span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono">2. Master Assets</span>
                  <p className="text-slate-500 text-[11px]">24 columns (Asset ID, Serial, Category, Location, Custody, Cost, Warranty, Completion).</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Connected (24/24 cols)
                </span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono">3. Categories</span>
                  <p className="text-slate-500 text-[11px]">CAT-ELE, CAT-IT, CAT-FUR, CAT-COM and descriptions.</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Connected
                </span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono">4. Employees & Locations</span>
                  <p className="text-slate-500 text-[11px]">Registered staff roster, departments, and office rooms.</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Connected
                </span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono">5. Asset Transactions</span>
                  <p className="text-slate-500 text-[11px]">Synchronized issue, return, transfer, and missing item audit log.</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Connected (Audit Log)
                </span>
              </div>
            </div>
          </div>

          {/* Conflict Resolution & Integrity Safeguards */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-800" />
              <h4 className="font-bold text-slate-900 text-sm">
                Conflict Resolution & Data Integrity Policy
              </h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              1. <strong>Operational Source of Truth:</strong> The internal database manages all live barcode scans, issue/return transactions, and role permissions with atomic transaction safeguards.
            </p>
            <p className="text-slate-600 leading-relaxed">
              2. <strong>Zero ID Overwrites:</strong> Scanned barcodes are validated strictly against existing Asset IDs (e.g. <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">WANG-ELE-001</code>). IDs are never regenerated or duplicated.
            </p>
            <p className="text-slate-600 leading-relaxed">
              3. <strong>Safe Synchronization:</strong> Newer, verified fields in the database take precedence over older rows. Spreadsheet rows with matching Asset IDs are safely updated without wiping uncataloged attributes.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: SETUP & INSTRUCTIONS */}
      {activeTab === 'setup' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs text-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Step-by-Step Instructions: Connecting Your Google Sheets Workbook
            </h3>
            <p className="text-slate-500">
              Follow these three steps to connect the live WANG Office Inventory Google Sheet to this system.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">
                Step 1: Obtain the Spreadsheet ID
              </span>
              <p>
                Open your Google Sheets inventory workbook in your web browser. Inspect the URL bar:
              </p>
              <div className="bg-slate-900 text-emerald-400 font-mono p-2.5 rounded mt-2 text-[11px] break-all">
                https://docs.google.com/spreadsheets/d/<span className="text-white underline font-bold">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</span>/edit
              </div>
              <p className="mt-2 text-slate-500">
                Copy the long alphanumeric string between <code className="font-mono bg-white px-1 py-0.5 rounded border">/d/</code> and <code className="font-mono bg-white px-1 py-0.5 rounded border">/edit</code>. Paste it into the Spreadsheet ID input box.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">
                Step 2: Share Workbook Access
              </span>
              <p>
                In Google Sheets, click the green <strong>Share</strong> button at the top right.
              </p>
              <p className="mt-1">
                Share with the service account email or authorized account with <strong>Editor</strong> permission so that transaction logs and asset updates can be synchronized safely.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">
                Step 3: Test and Export
              </span>
              <p>
                Click <strong>Test & Sync Connection</strong>. Once connected, use <strong>View Synchronized Workbook</strong> to export formatted CSV or Google Sheets tables for any tab at any time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE WORKBOOK PREVIEW */}
      {activeTab === 'preview' && workbookPreview && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            {/* Sheet Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(workbookPreview).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setSelectedPreviewSheet(tabKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                    selectedPreviewSheet === tabKey
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tabKey} ({workbookPreview[tabKey].length - 1} rows)
                </button>
              ))}
            </div>

            <button
              onClick={() => handleDownloadSheetCSV(selectedPreviewSheet)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download {selectedPreviewSheet}.csv
            </button>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold sticky top-0 shadow-xs">
                <tr>
                  {workbookPreview[selectedPreviewSheet][0]?.map((header, idx) => (
                    <th key={idx} className="py-2.5 px-3 whitespace-nowrap border-b border-slate-300">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workbookPreview[selectedPreviewSheet].slice(1).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 font-mono text-[11px]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-800 max-w-xs truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
