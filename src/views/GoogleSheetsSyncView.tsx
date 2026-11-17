import React, { useEffect, useState } from 'react';
import {
  Sheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Copy,
  Check,
  Save,
  PlugZap,
  KeyRound,
  Info
} from 'lucide-react';
import { GoogleSheetsSyncConfig } from '../types/inventory.js';
import { api } from '../services/api.js';
import { downloadCsv, toCsv } from '../utils/download.js';

interface GoogleSheetsSyncViewProps {
  onRefresh: () => void;
  canManage: boolean;
}

type Result = { success: boolean; message: string } | null;

const REPO_GUIDE = 'https://github.com/salmanroonjah/WANG-Inventory-Management-/blob/main/apps-script/README.md';

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const ResultBox: React.FC<{ result: Result }> = ({ result }) =>
  result ? (
    <div
      className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
        result.success ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
      }`}
    >
      {result.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
      <span className="leading-relaxed">{result.message}</span>
    </div>
  ) : null;

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({ canManage }) => {
  const [config, setConfig] = useState<GoogleSheetsSyncConfig | null>(null);
  const [sheetLink, setSheetLink] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [autoPush, setAutoPush] = useState(true);
  const [busy, setBusy] = useState<'save' | 'test' | 'sync' | 'secret' | null>(null);
  const [saveResult, setSaveResult] = useState<Result>(null);
  const [actionResult, setActionResult] = useState<Result>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'setup' | 'preview'>('status');
  const [workbookPreview, setWorkbookPreview] = useState<Record<string, string[][]> | null>(null);
  const [selectedPreviewSheet, setSelectedPreviewSheet] = useState('Master Assets');

  const loadConfig = async (fillForm = false) => {
    try {
      const c = await api.getSheetsConfig();
      setConfig(c);
      if (fillForm) {
        setSheetLink(c.spreadsheetUrl || (c.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${c.spreadsheetId}/edit` : ''));
        setWebAppUrl(c.webAppUrl || '');
        setAutoPush(c.autoSyncOnChange !== false);
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err?.message || 'Could not load the saved Google Sheets settings.' });
    }
  };

  useEffect(() => {
    loadConfig(true);
    // Status fields (last sync time, etc.) can be changed by the script's timer.
    const id = setInterval(() => loadConfig(false), 15000);
    return () => clearInterval(id);
  }, []);

  const save = async (newSecret = false) => {
    setBusy(newSecret ? 'secret' : 'save');
    setSaveResult(null);
    try {
      const c = await api.saveSheetsConfig({ sheetLink, webAppUrl, autoSyncOnChange: autoPush, newSecret });
      setConfig(c);
      setSaveResult({
        success: true,
        message: newSecret
          ? 'New secret created. Copy it into the SYNC_SECRET Script Property, otherwise the sheet will refuse the app.'
          : c.webAppUrl
            ? 'Saved. Now press "Test connection".'
            : 'Saved. Copy the secret below into the Apps Script, deploy the Web App, then paste its URL here.'
      });
    } catch (err: any) {
      setSaveResult({ success: false, message: err?.message || 'Could not save.' });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    setActionResult(null);
    try {
      setActionResult(await api.testSheetsConnection());
    } catch (err: any) {
      setActionResult({ success: false, message: err?.message || 'Test failed.' });
    } finally {
      setBusy(null);
      loadConfig(false);
    }
  };

  const syncNow = async () => {
    setBusy('sync');
    setActionResult({ success: true, message: 'Writing every record to the sheet… this can take a minute.' });
    try {
      setActionResult(await api.syncSheetsNow());
    } catch (err: any) {
      setActionResult({ success: false, message: err?.message || 'Sync failed.' });
    } finally {
      setBusy(null);
      loadConfig(false);
    }
  };

  const copySecret = async () => {
    if (!config?.syncSecret) return;
    try {
      await navigator.clipboard.writeText(config.syncSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the secret:', config.syncSecret);
    }
  };

  const handleLoadPreview = async () => {
    try {
      const wb = await api.getWorkbookExport();
      setWorkbookPreview(wb);
      if (!wb[selectedPreviewSheet]) setSelectedPreviewSheet(Object.keys(wb)[0]);
      setActiveTab('preview');
    } catch (err: any) {
      setActionResult({ success: false, message: err?.message || 'Could not build the workbook export.' });
    }
  };

  const handleDownloadSheetCSV = (sheetName: string) => {
    if (!workbookPreview || !workbookPreview[sheetName]) return;
    downloadCsv(toCsv(workbookPreview[sheetName]), `WANG_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const connected = Boolean(config?.webAppUrl && config?.syncSecret);
  const push = api.getSheetsPushStatus();
  const sheetHref = config?.spreadsheetUrl || (config?.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit` : '');
  const statusBadge = !connected
    ? { text: 'Not connected', cls: 'bg-slate-100 text-slate-700' }
    : config?.lastSyncStatus === 'Failed'
      ? { text: 'Last sync failed', cls: 'bg-rose-100 text-rose-800' }
      : config?.lastSyncStatus === 'In Progress'
        ? { text: 'Syncing…', cls: 'bg-amber-100 text-amber-800' }
        : config?.lastSyncStatus === 'Success'
          ? { text: 'Live sync on', cls: 'bg-emerald-100 text-emerald-800' }
          : { text: 'Connected, not synced yet', cls: 'bg-amber-100 text-amber-800' };

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
        activeTab === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Sheet className="w-5 h-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Google Sheets Live Sync</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-way sync of Master Assets, Categories, Employees, Locations, Consumables and (read-only) Asset Transactions.
          </p>
        </div>
        <button
          onClick={handleLoadPreview}
          className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          View / Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200 rounded-lg w-fit">
        {tabBtn('status', 'Connection & Status')}
        {tabBtn('setup', 'How to set up')}
        {workbookPreview && tabBtn('preview', 'Workbook Preview')}
      </div>

      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 text-sm">Current status</h3>
              <span className={`px-2.5 py-1 rounded-full font-semibold ${statusBadge.cls}`}>{statusBadge.text}</span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-700">
              <div>
                <dt className="text-slate-500">Last full sync</dt>
                <dd className="font-semibold">
                  {fmt(config?.lastSyncTimestamp)}
                  {config?.lastSyncSource ? <span className="font-normal text-slate-500"> · by {config.lastSyncSource}</span> : null}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Rows in the sheet</dt>
                <dd className="font-semibold">{config?.totalSyncedRows ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last connection test</dt>
                <dd className="font-semibold">
                  {fmt(config?.lastTestTimestamp)}
                  {config?.lastTestTimestamp ? (config.lastTestOk ? ' · OK' : ' · failed') : ''}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Live updates from this device</dt>
                <dd className="font-semibold">
                  {config?.autoSyncOnChange === false
                    ? 'Switched off'
                    : push.lastPushAt
                      ? `${fmt(push.lastPushAt)} · ${push.lastPushError ? 'failed' : 'OK'}`
                      : 'None sent yet'}
                </dd>
              </div>
            </dl>
            {config?.lastSyncStatus === 'Failed' && config.lastSyncError && (
              <ResultBox result={{ success: false, message: `Last sync error: ${config.lastSyncError}` }} />
            )}
            {push.lastPushError && (
              <ResultBox
                result={{ success: false, message: `Last live update failed: ${push.lastPushError} (the script's 10-minute sync will still catch up).` }}
              />
            )}
            {sheetHref && (
              <a href={sheetHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#003279] font-semibold hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Open {config?.spreadsheetName ? `"${config.spreadsheetName}"` : 'the linked Google Sheet'}
              </a>
            )}
            <p className="text-slate-500 leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              The app is the source of truth. Each save here updates the sheet within seconds, and the sheet fully re-checks itself every 10
              minutes. Edits typed in the sheet are saved back to the app, except Status / custody columns, IDs and the Asset Transactions tab.
              Deleting a row in the sheet never deletes anything.
            </p>
            {canManage && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={test}
                  disabled={!connected || busy !== null}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 font-semibold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <PlugZap className={`w-3.5 h-3.5 ${busy === 'test' ? 'animate-pulse' : ''}`} />
                  {busy === 'test' ? 'Testing…' : 'Test connection'}
                </button>
                <button
                  onClick={syncNow}
                  disabled={!connected || busy !== null}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} />
                  {busy === 'sync' ? 'Syncing…' : 'Sync everything now'}
                </button>
              </div>
            )}
            <ResultBox result={actionResult} />
          </div>

          {/* Settings */}
          {canManage ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">Connection settings</h3>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">1. Google Sheet link</label>
                <input
                  type="text"
                  value={sheetLink}
                  onChange={(e) => {
                    setSheetLink(e.target.value);
                    setSaveResult(null);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/…/edit"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">2. Apps Script Web App URL</label>
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => {
                    setWebAppUrl(e.target.value);
                    setSaveResult(null);
                  }}
                  placeholder="https://script.google.com/macros/s/…/exec"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  In Apps Script: Deploy → Manage deployments → copy the Web app URL (ends with <code>/exec</code>). You can leave it empty the first
                  time, to get the secret.
                </p>
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input type="checkbox" checked={autoPush} onChange={(e) => setAutoPush(e.target.checked)} />
                Send every change to the sheet straight away (recommended)
              </label>
              <button
                onClick={() => save(false)}
                disabled={busy !== null || !sheetLink.trim()}
                className="px-5 py-2 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {busy === 'save' ? 'Saving…' : 'Save settings'}
              </button>
              <ResultBox result={saveResult} />

              {config?.syncSecret && (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 space-y-2">
                  <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> 3. Shared secret (paste into Apps Script → Project Settings → Script Properties → SYNC_SECRET)
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <code className="flex-1 px-2.5 py-1.5 bg-white border border-amber-200 rounded font-mono break-all text-slate-900">{config.syncSecret}</code>
                    <button onClick={copySecret} className="px-3 py-1.5 bg-white border border-amber-300 rounded font-semibold flex items-center justify-center gap-1">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    The secret only lets the app tell the sheet "these records changed"; the script then reads the real records from the database
                    itself. If you think it leaked, make a new one and update the Script Property.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Make a new secret? The sheet will stop accepting updates until you paste the new secret into SYNC_SECRET.')) save(true);
                    }}
                    disabled={busy !== null || !sheetLink.trim()}
                    className="text-[11px] font-semibold text-amber-900 underline disabled:opacity-50"
                  >
                    {busy === 'secret' ? 'Creating…' : 'Make a new secret'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs text-slate-600">
              Only admins can change the Google Sheets connection.
            </div>
          )}
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
          <h3 className="font-bold text-slate-900 text-base">Setting up the live sync (one time)</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Create a <strong>service account</strong> in Google Cloud for project <code>dev-rhythm-nt3g1</code> with the role
              <strong> Cloud Datastore User</strong>, and download its JSON key.
            </li>
            <li>Create a new, empty Google Sheet. Paste its link above and press <strong>Save settings</strong>. A secret appears.</li>
            <li>
              In the sheet: <strong>Extensions → Apps Script</strong>. Paste the files <code>Code.gs</code> and <code>appsscript.json</code> from the
              project's <code>apps-script</code> folder.
            </li>
            <li>
              In Apps Script <strong>Project Settings → Script Properties</strong> add <code>SERVICE_ACCOUNT_JSON</code> (the whole key file) and
              <code> SYNC_SECRET</code> (the secret from this page).
            </li>
            <li>
              Reload the sheet and choose <strong>WANG Sync → Set up this sheet</strong>. Allow the permissions. The tabs are created and filled.
            </li>
            <li>
              In Apps Script: <strong>Deploy → New deployment → Web app</strong>, Execute as <strong>Me</strong>, Who has access <strong>Anyone</strong>.
              Copy the URL ending in <code>/exec</code>, paste it above, Save, then <strong>Test connection</strong>.
            </li>
            <li>Who may edit the sheet is controlled by the sheet's own Google <strong>Share</strong> button.</li>
          </ol>
          <a href={REPO_GUIDE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#003279] font-semibold hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> Full step-by-step guide
          </a>
        </div>
      )}

      {activeTab === 'preview' && workbookPreview && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(workbookPreview).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setSelectedPreviewSheet(tabKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                    selectedPreviewSheet === tabKey ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
