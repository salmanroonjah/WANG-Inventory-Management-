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
import { downloadCsv, toCsv } from '../utils/download.js';

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
      setSpreadsheetIdInput(c.spreadsheetId || '');
    } catch (err) {
      console.error('Failed to load sheets config', err);
      setTestResult({ success: false, message: 'Could not load the saved spreadsheet settings.' });
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
      if (!wb[selectedPreviewSheet]) setSelectedPreviewSheet(Object.keys(wb)[0]);
      setActiveTab('preview');
    } catch (err) {
      console.error('Failed to load workbook preview', err);
      setTestResult({ success: false, message: (err as any)?.message || 'Could not build the workbook export.' });
    }
  };

  const handleDownloadSheetCSV = (sheetName: string) => {
    if (!workbookPreview || !workbookPreview[sheetName]) return;
    downloadCsv(toCsv(workbookPreview[sheetName]), `WANG_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
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
            View / Export Workbook
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
                  onChange={(e) => {
                    setSpreadsheetIdInput(e.target.value);
                    setTestResult(null); // clear the previous result while typing
                  }}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !canManage || !spreadsheetIdInput.trim()}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Saving...' : 'Save Spreadsheet ID'}
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
                      {testResult.rowCount} rows.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Honest connection status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Current Status</h3>
              <span
                className={`px-2.5 py-1 rounded-full font-semibold ${
                  config?.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {config?.isConfigured ? 'Spreadsheet ID saved' : 'Not configured'}
              </span>
            </div>
            {config?.isConfigured && config.spreadsheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#003279] font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open the linked Google Sheet
              </a>
            )}
            <p className="text-slate-600 leading-relaxed">
              <strong>Live two-way sync is not enabled yet.</strong> The inventory database in this app is the source of truth.
              To update the Google Sheet, click <strong>View / Export Workbook</strong>, download each tab as CSV, and in Google
              Sheets use <em>File → Import → Upload → Replace current sheet</em>.
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
                Step 2: Save the ID
              </span>
              <p>
                Paste the ID (or the full sheet URL) above and click <strong>Save Spreadsheet ID</strong>. A link to the sheet appears on the status card.
              </p>
              <p className="mt-1">
                Anyone using this link still needs their own access to the sheet in Google.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900 block text-sm mb-1">
                Step 3: Export and Import
              </span>
              <p>
                Use <strong>View / Export Workbook</strong> to download any tab as CSV from the live database, then import it into the matching tab in Google Sheets.
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
