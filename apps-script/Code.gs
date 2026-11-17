/**
 * WANG Inventory  <->  Google Sheet live sync (bound Apps Script)
 * ================================================================
 *
 * Paste this file (and appsscript.json) into Extensions → Apps Script of the
 * WANG inventory Google Sheet. Full steps: apps-script/README.md.
 *
 * App → Sheet
 *   • After every save, the web app POSTs the IDs of the changed records to
 *     this script's Web App URL (doPost). The script reads those records from
 *     Firestore itself and updates / adds / removes their rows. The call
 *     carries no data, so a leaked secret cannot be used to fake records.
 *   • Every 10 minutes a timer rebuilds every tab from Firestore (repairs
 *     anything missed, restores deleted rows, refreshes the count columns).
 *
 * Sheet → App
 *   • An installable "on edit" trigger writes edited cells of editable
 *     columns back to Firestore and logs them in activityLogs
 *     (recordType "SheetsSync").
 *   • Locked: Asset ID / other ID columns, Status, Assigned Employee ID,
 *     Assigned To, Due Date, counts, and the whole "Asset Transactions" tab.
 *     Edits there are undone. Custody changes must go through the app.
 *   • Deleting a row never deletes data: the row comes back at the next sync.
 *   • A new row with a new Asset ID (plus Item Name and a valid Category ID)
 *     creates an "Available" asset.
 *
 * Database access
 *   • Firestore REST API with a Google service account (Script Property
 *     SERVICE_ACCOUNT_JSON). Server-side access with an OAuth token is
 *     checked by Google Cloud IAM, not by firestore.rules, so the script
 *     keeps working after the security rules are locked down.
 *
 * Script Properties (Project Settings → Script Properties):
 *   SERVICE_ACCOUNT_JSON   the whole JSON key file of the service account
 *   SYNC_SECRET            the secret shown on the app's Google Sheets page
 *   FIREBASE_PROJECT_ID    optional, default below
 *   FIRESTORE_DATABASE_ID  optional, default below
 */

var SCRIPT_VERSION = '1.0.0';

var DEFAULTS = {
  FIREBASE_PROJECT_ID: 'dev-rhythm-nt3g1',
  FIRESTORE_DATABASE_ID: 'ai-studio-wangofficeinvent-1af43160-0e43-468c-8ca7-061a6f0b4e63'
};

var SYNC_USER_ID = 'SHEETS-SYNC';
var PROTECTION_TAG = 'WANG sync: managed by the inventory app';

var CONDITIONS = ['New', 'Good', 'Fair', 'Minor Wear', 'Needs Repair', 'Damaged'];
var COMPLETIONS = ['Pending', 'Partial', 'Complete', 'Verified'];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function str_(v) {
  return v === undefined || v === null ? '' : String(v);
}

function norm_(v) {
  return str_(v).trim().toUpperCase();
}

function nowIso_() {
  return new Date().toISOString();
}

function today_() {
  return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
}

function uniqueId_(prefix) {
  return prefix + '-' + Date.now() + Math.floor(Math.random() * 10000);
}

function yesNo_(v) {
  return v ? 'Yes' : 'No';
}

function prop_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v ? String(v).trim() : DEFAULTS[key] || '';
}

/** Parses a number typed in the sheet ("1,250" → 1250). Returns NaN when invalid. */
function parseNumber_(v) {
  var s = str_(v).replace(/,/g, '').trim();
  if (s === '') return 0;
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}

/** Accepts YYYY-MM-DD (or empty). Returns null when invalid. */
function parseDate_(v) {
  var s = str_(v).trim();
  if (s === '') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (ss) return ss;
  var id = prop_('SPREADSHEET_ID');
  if (!id) throw new Error('Spreadsheet not known yet. Open the sheet and run "WANG Sync → Set up this sheet" once.');
  return SpreadsheetApp.openById(id);
}

// ---------------------------------------------------------------------------
// Tab definitions (headers must match getWorkbookExport() in src/services/api.ts)
//
// Column options:
//   f        Firestore field
//   edit     true  → sheet edits are written to Firestore
//   type     'text' | 'number' | 'date' | 'enum' | 'yesno'
//   derived  value computed from other records (never written back)
//   render   custom doc → cell
// ---------------------------------------------------------------------------

var TABS = [
  {
    key: 'assets',
    sheet: 'Master Assets',
    collection: 'assets',
    idField: 'assetId',
    idLabel: 'Asset ID',
    canCreate: true,
    recordType: 'Asset',
    columns: [
      { h: 'Asset ID', f: 'assetId' },
      { h: 'Item Name', f: 'itemName', edit: true, required: true },
      { h: 'Category ID', f: 'categoryId', edit: true, special: 'category' },
      { h: 'Category Name', f: 'categoryName' },
      { h: 'Brand', f: 'brand', edit: true },
      { h: 'Model', f: 'model', edit: true },
      { h: 'Serial Number', f: 'serialNumber', edit: true },
      { h: 'Quantity', f: 'quantity', edit: true, type: 'number', min: 1 },
      { h: 'Unit', f: 'unit', edit: true },
      { h: 'Purchase Date', f: 'purchaseDate', edit: true, type: 'date' },
      { h: 'Purchase Cost (PKR)', f: 'purchaseCost', edit: true, type: 'number', min: 0 },
      { h: 'Supplier', f: 'supplier', edit: true },
      { h: 'City / Branch', f: 'officeBranch', edit: true },
      { h: 'Building - Room', f: 'buildingRoom', edit: true },
      { h: 'Status', f: 'status', locked: true },
      { h: 'Condition', f: 'condition', edit: true, type: 'enum', options: CONDITIONS },
      { h: 'Assigned Employee ID', f: 'assignedEmployeeId', locked: true, render: function (d) { return d.status === 'Issued' ? str_(d.assignedEmployeeId) : ''; } },
      { h: 'Assigned To', f: 'assignedTo', locked: true, render: function (d) { return d.status === 'Issued' ? str_(d.assignedTo) : ''; } },
      { h: 'Due Date', f: 'dueDate', locked: true },
      { h: 'Warranty Expiry', f: 'warrantyExpiry', edit: true, type: 'date' },
      { h: 'Invoice Link', f: 'invoiceDocLink', edit: true },
      { h: 'Record Completion', f: 'recordCompletion', edit: true, type: 'enum', options: COMPLETIONS },
      { h: 'Remarks', f: 'remarks', edit: true },
      { h: 'Last Updated', f: 'lastUpdated' }
    ]
  },
  {
    key: 'categories',
    sheet: 'Categories',
    collection: 'categories',
    idField: 'categoryId',
    idLabel: 'Category ID',
    canCreate: true,
    recordType: 'Category',
    columns: [
      { h: 'Category ID', f: 'categoryId' },
      { h: 'Category Name', f: 'categoryName', edit: true, required: true, special: 'categoryName' },
      { h: 'Description', f: 'description', edit: true },
      { h: 'Total Assets', derived: 'categoryCount' }
    ]
  },
  {
    key: 'employees',
    sheet: 'Employees',
    collection: 'employees',
    idField: 'employeeId',
    idLabel: 'Employee ID',
    canCreate: false, // new staff (and their sign-in email / role) are added in the app only
    recordType: 'Employee',
    columns: [
      { h: 'Employee ID', f: 'employeeId' },
      { h: 'Full Name', f: 'fullName', edit: true, required: true, special: 'employeeName' },
      { h: 'Department', f: 'department', edit: true },
      { h: 'Designation', f: 'designation', edit: true },
      { h: 'Email', f: 'email', locked: true },
      { h: 'Phone', f: 'phone', edit: true },
      { h: 'Station', f: 'officeBranch', edit: true },
      { h: 'Role', f: 'role', locked: true, render: function (d) { return str_(d.role) || 'Employee'; } },
      { h: 'Active', f: 'activeStatus', locked: true, render: function (d) { return yesNo_(d.activeStatus !== false); } },
      { h: 'Assets Held', derived: 'employeeCount' }
    ]
  },
  {
    key: 'locations',
    sheet: 'Locations',
    collection: 'locations',
    idField: 'locationId',
    idLabel: 'Location ID',
    canCreate: true,
    recordType: 'Location',
    columns: [
      { h: 'Location ID', f: 'locationId' },
      // Renaming a room changes the "Building - Room" text on assets, so it is done in the app.
      { h: 'City / Branch', f: 'officeBranch', locked: true, createOnly: true, required: true },
      { h: 'Building', f: 'building', locked: true, createOnly: true, required: true },
      { h: 'Floor', f: 'floor', edit: true },
      { h: 'Room', f: 'room', locked: true, createOnly: true, required: true },
      { h: 'Store?', f: 'isStore', edit: true, type: 'yesno', render: function (d) { return yesNo_(Boolean(d.isStore)); } },
      { h: 'Assets', derived: 'locationCount' },
      { h: 'Description', f: 'description', edit: true }
    ]
  },
  {
    key: 'transactions',
    sheet: 'Asset Transactions',
    collection: 'transactions',
    idField: 'transactionId',
    idLabel: 'Transaction ID',
    readOnly: true,
    columns: [
      { h: 'Transaction ID', f: 'transactionId' },
      { h: 'Date', f: 'timestamp' },
      { h: 'Type', f: 'transactionType' },
      { h: 'Asset ID', f: 'assetId' },
      { h: 'Asset Name', f: 'assetName' },
      { h: 'Employee ID', f: 'employeeId' },
      { h: 'Employee Name', f: 'employeeName' },
      { h: 'Previous Status', f: 'previousStatus' },
      { h: 'New Status', f: 'newStatus' },
      { h: 'Condition', f: 'condition' },
      { h: 'Quantity', f: 'quantity' },
      { h: 'Location', f: 'location' },
      { h: 'Performed By', f: 'performedByName' },
      { h: 'Notes', f: 'notes' }
    ]
  },
  {
    key: 'consumables',
    sheet: 'Consumables',
    collection: 'consumables',
    idField: 'itemCode',
    idLabel: 'Item Code',
    canCreate: true,
    recordType: 'Consumable',
    columns: [
      { h: 'Item Code', f: 'itemCode' },
      { h: 'Item Name', f: 'itemName', edit: true, required: true },
      { h: 'Category', f: 'category', edit: true },
      { h: 'Unit', f: 'unit', edit: true },
      // Stock moves need a history row, so they are done in the app (Receive / Issue).
      { h: 'Opening Balance', f: 'openingBalance', locked: true, createOnly: true, type: 'number', min: 0 },
      { h: 'Current Stock', f: 'currentStock', locked: true, createOnly: true, type: 'number', min: 0 },
      { h: 'Minimum Threshold', f: 'minimumThreshold', edit: true, type: 'number', min: 0 },
      { h: 'Unit Cost (PKR)', f: 'unitCost', edit: true, type: 'number', min: 0 },
      { h: 'Location', f: 'location', edit: true },
      { h: 'Supplier', f: 'supplier', edit: true },
      { h: 'Last Updated', f: 'lastUpdated' }
    ]
  }
];

function tabByCollection_(collection) {
  for (var i = 0; i < TABS.length; i++) if (TABS[i].collection === collection) return TABS[i];
  return null;
}

function tabBySheet_(name) {
  for (var i = 0; i < TABS.length; i++) if (TABS[i].sheet === name) return TABS[i];
  return null;
}

function headersOf_(tab) {
  return tab.columns.map(function (c) { return c.h; });
}

// ---------------------------------------------------------------------------
// Rendering: Firestore record → sheet row (same text as the app's CSV export)
// ---------------------------------------------------------------------------

function locationLabel_(l) {
  var b = str_(l.building).trim();
  var r = str_(l.room).trim();
  return b ? b + ' - ' + r : r;
}

function assetInLocation_(a, l) {
  var br = norm_(a.buildingRoom);
  if (!br) return false;
  if (br === norm_(locationLabel_(l))) return true;
  return br === norm_(l.room) && (!a.officeBranch || norm_(a.officeBranch) === norm_(l.officeBranch));
}

/** Counts used by the derived columns. Needs every asset. */
function buildCounts_(assets, locations) {
  var cat = {};
  var emp = {};
  var loc = {};
  assets.forEach(function (a) {
    var c = norm_(a.categoryId);
    cat[c] = (cat[c] || 0) + 1;
    if (a.status === 'Issued' && a.assignedEmployeeId) {
      var e = norm_(a.assignedEmployeeId);
      emp[e] = (emp[e] || 0) + 1;
    }
  });
  (locations || []).forEach(function (l) {
    loc[norm_(l.locationId)] = assets.filter(function (a) { return assetInLocation_(a, l); }).length;
  });
  return { categoryCount: cat, employeeCount: emp, locationCount: loc };
}

/**
 * One sheet row for a record. counts may be null (single-row update): derived
 * cells are then returned as undefined, meaning "leave the current value".
 */
function renderRow_(tab, d, counts) {
  return tab.columns.map(function (c) {
    if (c.derived) {
      if (!counts) return undefined;
      return String(counts[c.derived][norm_(d[tab.idField])] || 0);
    }
    if (c.render) return c.render(d);
    var v = d[c.f];
    if (v === undefined || v === null) return '';
    if (c.f === 'quantity' && tab.key === 'transactions') return v === '' ? '' : String(v);
    return String(v);
  });
}

// ---------------------------------------------------------------------------
// Firestore REST (service account)
// ---------------------------------------------------------------------------

function b64url_(bytesOrString) {
  var bytes = typeof bytesOrString === 'string' ? Utilities.newBlob(bytesOrString).getBytes() : bytesOrString;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function serviceAccount_() {
  var raw = prop_('SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('Script Property SERVICE_ACCOUNT_JSON is missing (paste the whole service-account key file).');
  var sa;
  try {
    sa = JSON.parse(raw);
  } catch (e) {
    throw new Error('Script Property SERVICE_ACCOUNT_JSON is not valid JSON. Paste the whole key file, from { to }.');
  }
  if (!sa.client_email || !sa.private_key) throw new Error('SERVICE_ACCOUNT_JSON has no client_email / private_key.');
  return sa;
}

function accessToken_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('wang_fs_token');
  if (cached) return cached;
  var sa = serviceAccount_();
  var now = Math.floor(Date.now() / 1000);
  var tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  var header = { alg: 'RS256', typ: 'JWT' };
  var claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: tokenUri,
    iat: now,
    exp: now + 3600
  };
  var unsigned = b64url_(JSON.stringify(header)) + '.' + b64url_(JSON.stringify(claim));
  var signature = Utilities.computeRsaSha256Signature(unsigned, sa.private_key);
  var jwt = unsigned + '.' + b64url_(signature);
  var res = UrlFetchApp.fetch(tokenUri, {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt },
    muteHttpExceptions: true
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200 || !body.access_token) {
    throw new Error('Google refused the service-account key: ' + (body.error_description || body.error || res.getResponseCode()));
  }
  cache.put('wang_fs_token', body.access_token, 3000);
  return body.access_token;
}

function docRoot_() {
  return 'projects/' + prop_('FIREBASE_PROJECT_ID') + '/databases/' + prop_('FIRESTORE_DATABASE_ID') + '/documents';
}

function docName_(collection, id) {
  return docRoot_() + '/' + collection + '/' + id;
}

function fsFetch_(path, options) {
  var url = 'https://firestore.googleapis.com/v1/' + path;
  var opts = options || {};
  opts.headers = { Authorization: 'Bearer ' + accessToken_() };
  opts.muteHttpExceptions = true;
  if (opts.payload && typeof opts.payload !== 'string') {
    opts.payload = JSON.stringify(opts.payload);
    opts.contentType = 'application/json';
  }
  var res = UrlFetchApp.fetch(url, opts);
  var code = res.getResponseCode();
  var text = res.getContentText();
  var body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (e) {
    body = {};
  }
  // 404 on a read = "no such record". On a write it is a real error (e.g. record deleted meanwhile).
  if (code === 404 && String(opts.method || 'get').toLowerCase() === 'get') return null;
  if (code >= 300) {
    var msg = (body.error && body.error.message) || text || String(code);
    if (code === 403) msg = 'The service account has no access to Firestore (give it the "Cloud Datastore User" role). ' + msg;
    throw new Error('Firestore ' + code + ': ' + msg);
  }
  return body;
}

/** Firestore typed value → plain JS. */
function fromFs_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs_);
  if ('mapValue' in v) return fieldsToObj_(v.mapValue.fields || {});
  return null;
}

function fieldsToObj_(fields) {
  var o = {};
  Object.keys(fields || {}).forEach(function (k) { o[k] = fromFs_(fields[k]); });
  return o;
}

/** Plain JS → Firestore typed value. */
function toFs_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs_) } };
  if (typeof v === 'object') return { mapValue: { fields: objToFields_(v) } };
  return { stringValue: String(v) };
}

function objToFields_(o) {
  var f = {};
  Object.keys(o).forEach(function (k) {
    if (o[k] !== undefined) f[k] = toFs_(o[k]);
  });
  return f;
}

function fsGet_(collection, id) {
  if (!id || String(id).indexOf('/') >= 0) return null;
  var doc = fsFetch_(docRoot_() + '/' + collection + '/' + encodeURIComponent(id), { method: 'get' });
  return doc ? fieldsToObj_(doc.fields) : null;
}

function fsList_(collection) {
  var out = [];
  var token = '';
  do {
    var path = docRoot_() + '/' + collection + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    var page = fsFetch_(path, { method: 'get' }) || {};
    (page.documents || []).forEach(function (d) { out.push(fieldsToObj_(d.fields)); });
    token = page.nextPageToken || '';
  } while (token);
  return out;
}

/** Write helpers for fsCommit_. */
function wSet_(collection, id, data, mustNotExist) {
  var w = { update: { name: docName_(collection, id), fields: objToFields_(data) } };
  if (mustNotExist) w.currentDocument = { exists: false };
  return w;
}

function wPatch_(collection, id, patch, mustExist) {
  var w = {
    update: { name: docName_(collection, id), fields: objToFields_(patch) },
    updateMask: { fieldPaths: Object.keys(patch) }
  };
  if (mustExist !== false) w.currentDocument = { exists: true };
  return w;
}

/** Atomic commit (all writes succeed or none). Splits into chunks of 450. */
function fsCommit_(writes) {
  for (var i = 0; i < writes.length; i += 450) {
    fsFetch_(docRoot_() + ':commit', { method: 'post', payload: { writes: writes.slice(i, i + 450) } });
  }
}

// ---------------------------------------------------------------------------
// Web App endpoint (called by the inventory app)
// ---------------------------------------------------------------------------

function doGet() {
  return json_({ ok: true, app: 'WANG inventory sheet sync', version: SCRIPT_VERSION, hint: 'Use POST with the shared secret.' });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = prop_('SYNC_SECRET');
    if (!expected || expected.length < 16) {
      return json_({ ok: false, error: 'The SYNC_SECRET Script Property is not set. Copy the secret from the app (Google Sheets page) into Script Properties.' });
    }
    if (!safeEquals_(str_(body.secret), expected)) {
      return json_({ ok: false, error: 'Wrong secret. The SYNC_SECRET Script Property must equal the secret shown on the app\'s Google Sheets page.' });
    }
    if (body.action === 'ping') return json_(ping_());
    if (body.action === 'changes') return json_(withLock_(function () { return applyChanges_(body.changes || []); }));
    if (body.action === 'fullSync') return json_(withLock_(function () { return fullSync_(str_(body.source) || 'app'); }));
    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function safeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'The sheet is busy with another sync. Try again in a minute.' };
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function ping_() {
  var ss = ss_();
  var tabs = {};
  var missing = [];
  TABS.forEach(function (t) {
    var found = !!ss.getSheetByName(t.sheet);
    tabs[t.sheet] = found;
    if (!found) missing.push(t.sheet);
  });
  var firestore = { ok: true, error: '' };
  try {
    fsGet_('systemSettings', 'sheetsConfig');
  } catch (err) {
    firestore = { ok: false, error: String(err.message || err) };
  }
  var handlers = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  return {
    ok: true,
    version: SCRIPT_VERSION,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    tabs: tabs,
    missingTabs: missing,
    triggersInstalled: handlers.indexOf('handleSheetEdit') >= 0 && handlers.indexOf('scheduledFullSync') >= 0,
    firestore: firestore
  };
}

/** Re-reads the changed records from Firestore and updates their rows. */
function applyChanges_(changes) {
  if (!Array.isArray(changes) || changes.length > 500) return { ok: false, error: 'Too many changes in one call; use fullSync.' };
  var ss = ss_();
  var byTab = {};
  changes.forEach(function (c) {
    var tab = tabByCollection_(str_(c && c.collection));
    var id = str_(c && c.id);
    if (!tab || !id || id.indexOf('/') >= 0) return;
    (byTab[tab.key] = byTab[tab.key] || { tab: tab, ids: {} }).ids[id] = true;
  });
  var updated = 0;
  var removed = 0;
  Object.keys(byTab).forEach(function (k) {
    var tab = byTab[k].tab;
    var sheet = ensureSheet_(ss, tab);
    var index = rowIndex_(sheet);
    Object.keys(byTab[k].ids).forEach(function (id) {
      var doc = fsGet_(tab.collection, id);
      if (doc && str_(doc[tab.idField])) id = str_(doc[tab.idField]);
      var row = index[norm_(id)];
      if (!doc) {
        if (row) {
          sheet.deleteRow(row);
          index = rowIndex_(sheet);
          removed++;
        }
        return;
      }
      writeRow_(sheet, tab, row || sheet.getLastRow() + 1, renderRow_(tab, doc, null));
      if (!row) index = rowIndex_(sheet);
      updated++;
    });
  });
  return { ok: true, updated: updated, removed: removed };
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------

function ensureSheet_(ss, tab) {
  var sheet = ss.getSheetByName(tab.sheet);
  if (!sheet) sheet = ss.insertSheet(tab.sheet);
  var headers = headersOf_(tab);
  var range = sheet.getRange(1, 1, 1, headers.length);
  var current = range.getDisplayValues()[0];
  if (current.join('\u0001') !== headers.join('\u0001')) range.setValues([headers]);
  range.setFontWeight('bold').setBackground(tab.readOnly ? '#e2e8f0' : '#003279').setFontColor(tab.readOnly ? '#0f172a' : '#ffffff');
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

/** { ID (upper-case) → row number } from column A. */
function rowIndex_(sheet) {
  var last = sheet.getLastRow();
  var map = {};
  if (last < 2) return map;
  var ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) {
    var id = norm_(ids[i][0]);
    if (id && !map[id]) map[id] = i + 2;
  }
  return map;
}

/** Writes one row as plain text; undefined cells (derived counts) keep their value. */
function writeRow_(sheet, tab, rowNumber, values) {
  var width = tab.columns.length;
  if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rowNumber - sheet.getMaxRows());
  var range = sheet.getRange(rowNumber, 1, 1, width);
  var existing = range.getDisplayValues()[0];
  var merged = values.map(function (v, i) { return v === undefined ? existing[i] : v; });
  range.setNumberFormat('@').setValues([merged]);
}

/** Rebuilds every tab from Firestore. */
function fullSync_(source) {
  var ss = ss_();
  var data = {};
  TABS.forEach(function (t) { data[t.key] = fsList_(t.collection); });
  var counts = buildCounts_(data.assets, data.locations);
  var sortKeys = {
    assets: function (a, b) { return str_(b.createdAt).localeCompare(str_(a.createdAt)); },
    transactions: function (a, b) { return str_(b.timestamp).localeCompare(str_(a.timestamp)); }
  };
  var result = { ok: true, counts: {}, totalRows: 0 };
  TABS.forEach(function (t) {
    var list = data[t.key].slice();
    var sorter = sortKeys[t.key] || function (a, b) { return str_(a[t.idField]).localeCompare(str_(b[t.idField]), undefined, { numeric: true }); };
    list.sort(sorter);
    var rows = list.map(function (d) { return renderRow_(t, d, counts); });
    var sheet = ensureSheet_(ss, t);
    var width = t.columns.length;
    var last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, Math.max(width, sheet.getLastColumn())).clearContent();
    if (rows.length) sheet.getRange(2, 1, rows.length, width).setNumberFormat('@').setValues(rows);
    addDropdowns_(sheet, t);
    protectTab_(sheet, t, rows.length);
    result.counts[t.sheet] = rows.length;
    result.totalRows += rows.length;
  });
  SpreadsheetApp.flush();
  saveStatus_({
    lastSyncTimestamp: nowIso_(),
    lastSyncStatus: 'Success',
    lastSyncError: '',
    lastSyncSource: source,
    totalSyncedRows: result.totalRows
  });
  return result;
}

/** Dropdowns for Condition, Record Completion and Yes/No columns. */
function addDropdowns_(sheet, tab) {
  var rows = sheet.getMaxRows() - 1;
  if (rows < 1 || tab.readOnly) return;
  tab.columns.forEach(function (c, i) {
    var options = c.type === 'enum' ? c.options : c.type === 'yesno' ? ['Yes', 'No'] : null;
    if (!options) return;
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(options, true).setAllowInvalid(false).build();
    sheet.getRange(2, i + 1, rows, 1).setDataValidation(rule);
  });
}

/** Records the sync result on systemSettings/sheetsConfig (shown in the app). */
function saveStatus_(fields) {
  try {
    fsCommit_([wPatch_('systemSettings', 'sheetsConfig', fields, false)]);
  } catch (e) {
    console.warn('Could not save sync status: ' + e);
  }
}

/**
 * Protects the header row, ID cells of existing rows and locked columns.
 * Only the sheet owner (who runs this script) can edit protected cells; edits
 * by the owner are still undone by handleSheetEdit.
 */
function protectTab_(sheet, tab, dataRows) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === PROTECTION_TAG) p.remove();
  });
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) {
    if (p.getDescription() === PROTECTION_TAG) p.remove();
  });
  var lock = function (p) {
    p.setDescription(PROTECTION_TAG);
    var me = Session.getEffectiveUser();
    p.addEditor(me);
    p.removeEditors(p.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
    if (p.canDomainEdit()) p.setDomainEdit(false);
  };
  if (tab.readOnly) {
    lock(sheet.protect());
    return;
  }
  var maxRows = sheet.getMaxRows();
  lock(sheet.getRange(1, 1, 1, tab.columns.length).protect());
  if (dataRows > 0) lock(sheet.getRange(2, 1, dataRows, 1).protect());
  tab.columns.forEach(function (c, i) {
    if ((c.locked && !c.createOnly) || c.derived || (!c.edit && i > 0 && !c.createOnly)) {
      if (maxRows > 1) lock(sheet.getRange(2, i + 1, maxRows - 1, 1).protect());
    } else if (c.createOnly && dataRows > 0) {
      // Allowed when adding a new row, locked on existing rows.
      lock(sheet.getRange(2, i + 1, dataRows, 1).protect());
    }
  });
}

// ---------------------------------------------------------------------------
// Sheet → Firestore (installable on-edit trigger)
// ---------------------------------------------------------------------------

function handleSheetEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var tab = tabBySheet_(sheet.getName());
  if (!tab) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    toast_('The sheet is busy syncing. Your edit was not saved; please type it again in a minute.');
    return;
  }
  try {
    var firstRow = e.range.getRow();
    var lastRow = Math.min(e.range.getLastRow(), Math.max(sheet.getLastRow(), firstRow));
    var firstCol = e.range.getColumn();
    var lastCol = e.range.getLastColumn();
    var editor = (e.user && e.user.getEmail && e.user.getEmail()) || '';

    if (firstRow === 1) {
      ensureSheet_(sheet.getParent(), tab); // headers are fixed
      toast_('The header row is fixed and was restored.');
      if (lastRow < 2) return;
      firstRow = 2;
    }

    // A single-cell edit of an ID: put the old ID back (IDs cannot be renamed).
    if (!tab.readOnly && firstCol === 1 && lastCol === 1 && firstRow === lastRow && e.oldValue) {
      var oldId = norm_(e.oldValue);
      if (oldId && fsGet_(tab.collection, oldId)) {
        sheet.getRange(firstRow, 1).setValue(oldId);
        toast_(tab.idLabel + ' cannot be changed. To add a new record, use an empty row at the bottom.');
        return;
      }
    }

    var changed = [];
    var errors = [];
    for (var r = firstRow; r <= lastRow; r++) {
      try {
        var res = tab.readOnly ? restoreRow_(sheet, tab, r) : applyRowEdit_(sheet, tab, r, firstCol, lastCol, editor);
        if (res) changed.push(res);
      } catch (err) {
        errors.push('Row ' + r + ': ' + (err.message || err));
        sheet.getRange(r, 1).setNote('Not saved: ' + (err.message || err) + '\n' + new Date().toLocaleString());
        try {
          restoreRow_(sheet, tab, r);
        } catch (ignore) {}
      }
    }
    if (tab.readOnly) toast_('"' + tab.sheet + '" is read-only. It is filled from the app.');
    else if (errors.length) toast_(errors.slice(0, 3).join('\n'), 'Not saved', 15);
    else if (changed.length) toast_(changed.slice(0, 3).join('\n'), 'Saved to the inventory app', 5);
  } finally {
    lock.releaseLock();
  }
}

/** Puts a row back to what Firestore says (or clears it when the ID is unknown). */
function restoreRow_(sheet, tab, r) {
  var raw = str_(sheet.getRange(r, 1).getDisplayValue()).trim();
  var id = norm_(raw);
  if (!id) return null;
  var doc = fsGet_(tab.collection, id) || (raw !== id ? fsGet_(tab.collection, raw) : null);
  if (doc) writeRow_(sheet, tab, r, renderRow_(tab, doc, null));
  else if (tab.readOnly) sheet.getRange(r, 1, 1, tab.columns.length).clearContent();
  return null;
}

function parseCell_(col, raw) {
  var s = str_(raw).trim();
  if (col.type === 'number') {
    var n = parseNumber_(s);
    if (isNaN(n)) throw new Error(col.h + ' must be a number.');
    if (col.min !== undefined && n < col.min) throw new Error(col.h + ' cannot be less than ' + col.min + '.');
    return n;
  }
  if (col.type === 'date') {
    var d = parseDate_(s);
    if (d === null) throw new Error(col.h + ' must be a date like 2025-01-31.');
    return d;
  }
  if (col.type === 'enum') {
    if (s === '') return col.options[0] === 'New' ? 'Good' : 'Complete';
    for (var i = 0; i < col.options.length; i++) if (col.options[i].toLowerCase() === s.toLowerCase()) return col.options[i];
    throw new Error(col.h + ' must be one of: ' + col.options.join(', ') + '.');
  }
  if (col.type === 'yesno') {
    if (/^(yes|y|true|1)$/i.test(s)) return true;
    if (/^(no|n|false|0|)$/i.test(s)) return false;
    throw new Error(col.h + ' must be Yes or No.');
  }
  return s;
}

/** Saves one edited row. Returns a short description, or null when nothing changed. */
function applyRowEdit_(sheet, tab, r, firstCol, lastCol, editor) {
  var width = tab.columns.length;
  var cells = sheet.getRange(r, 1, 1, width).getDisplayValues()[0];
  var id = norm_(cells[0]);
  var nonEmpty = cells.some(function (c) { return str_(c).trim() !== ''; });
  if (!id) {
    if (nonEmpty && lastCol > 1) {
      sheet.getRange(r, 1).setNote('Type a ' + tab.idLabel + ' in column A to save this row.');
    }
    return null; // blank or cleared row: nothing is deleted
  }
  if (!/^[A-Z0-9][A-Z0-9\-_.]{0,60}$/.test(id)) throw new Error(tab.idLabel + ' may only use letters, numbers and - _ .');

  var current = fsGet_(tab.collection, id) || (str_(cells[0]).trim() !== id ? fsGet_(tab.collection, str_(cells[0]).trim()) : null);
  var who = 'Google Sheet' + (editor ? ' (' + editor + ')' : '');
  if (!current) {
    if (!tab.canCreate) throw new Error('New ' + tab.sheet + ' rows must be added in the app.');
    return createFromRow_(sheet, tab, r, id, cells, who);
  }

  var patch = {};
  var notes = [];
  var writes = [];
  var txs = [];
  for (var c = Math.max(firstCol, 2); c <= Math.min(lastCol, width); c++) {
    var col = tab.columns[c - 1];
    if (!col.edit) continue; // locked / derived: the restore below puts the value back
    var value = parseCell_(col, cells[c - 1]);
    if (col.required && value === '') throw new Error(col.h + ' cannot be empty.');
    var before = current[col.f];
    if (str_(before) === str_(value) && typeof before === typeof value) continue;
    if (str_(before) === str_(value) && col.type !== 'number') continue;
    if (col.special === 'category') {
      var catId = norm_(value);
      var cat = fsGet_('categories', catId) || fsGet_('categories', 'CAT-' + catId);
      if (!cat) throw new Error('Category ' + value + ' does not exist. Use a Category ID from the Categories tab.');
      if (norm_(cat.categoryId) === norm_(current.categoryId)) continue;
      patch.categoryId = cat.categoryId;
      patch.categoryName = cat.categoryName;
      notes.push('Category ' + current.categoryId + ' → ' + cat.categoryId);
      continue;
    }
    if (col.special === 'categoryName') {
      var all = fsList_('categories');
      if (all.some(function (x) { return norm_(x.categoryId) !== id && norm_(x.categoryName) === norm_(value); })) {
        throw new Error('Another category is already called "' + value + '".');
      }
      fsList_('assets')
        .filter(function (a) { return norm_(a.categoryId) === id; })
        .forEach(function (a) { writes.push(wPatch_('assets', a.assetId, { categoryName: value })); });
    }
    if (col.special === 'employeeName') {
      fsList_('assets')
        .filter(function (a) { return norm_(a.assignedEmployeeId) === id; })
        .forEach(function (a) { writes.push(wPatch_('assets', a.assetId, { assignedTo: value })); });
    }
    patch[col.f] = value;
    notes.push(col.h + ': "' + str_(before) + '" → "' + str_(value) + '"');
  }
  if (!Object.keys(patch).length) {
    restoreRow_(sheet, tab, r);
    return null;
  }

  var ts = nowIso_();
  if (tab.key === 'assets' || tab.key === 'consumables') patch.lastUpdated = ts;
  if (tab.key === 'assets') {
    var next = {};
    Object.keys(current).forEach(function (k) { next[k] = current[k]; });
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    if ('condition' in patch) {
      txs.push(makeTx_(next, 'CONDITION_CHANGE', current.status, current.status, who, {
        notes: 'Edited in Google Sheet: condition ' + current.condition + ' → ' + next.condition
      }));
    }
    if ('buildingRoom' in patch || 'officeBranch' in patch) {
      txs.push(makeTx_(next, 'TRANSFER', current.status, current.status, who, {
        employeeId: str_(current.assignedEmployeeId),
        employeeName: str_(current.assignedTo),
        location: str_(next.buildingRoom),
        notes: 'Edited in Google Sheet: location ' + (str_(current.buildingRoom) || '—') + ' → ' + (str_(next.buildingRoom) || '—')
      }));
    }
  }

  writes.unshift(wPatch_(tab.collection, current[tab.idField] || id, patch));
  txs.forEach(function (t) { writes.push(wSet_('transactions', t.transactionId, t, true)); });
  writes.push(logWrite_('SHEET_EDIT', tab.recordType, id, who, tab.sheet + ' ' + id + ' edited in Google Sheet: ' + notes.join('; ')));
  fsCommit_(writes);

  var fresh = fsGet_(tab.collection, current[tab.idField] || id);
  if (fresh) writeRow_(sheet, tab, r, renderRow_(tab, fresh, null));
  sheet.getRange(r, 1).clearNote();
  // Rows of other tabs that changed because of this edit (names, history).
  var extra = [];
  writes.forEach(function (w) {
    var parts = w.update.name.split('/');
    extra.push({ collection: parts[parts.length - 2], id: parts[parts.length - 1] });
  });
  applyChanges_(extra.filter(function (x) { return x.collection !== tab.collection || norm_(x.id) !== id; }));
  return id + ': ' + notes.join('; ');
}

/** New row → new record (only with an unused ID). */
function createFromRow_(sheet, tab, r, id, cells, who) {
  var ts = nowIso_();
  var rec = {};
  rec[tab.idField] = id;
  tab.columns.forEach(function (col, i) {
    if (i === 0 || col.derived || !col.f) return;
    if (!col.edit && !col.createOnly) return;
    var value = parseCell_(col, cells[i]);
    if (col.required && value === '') throw new Error(col.h + ' is required for a new ' + tab.recordType.toLowerCase() + '.');
    rec[col.f] = value;
  });
  var writes = [];
  var details = '';
  if (tab.key === 'assets') {
    var catId = norm_(rec.categoryId);
    var cat = catId ? fsGet_('categories', catId) || fsGet_('categories', 'CAT-' + catId) : null;
    if (!cat) throw new Error('Category ID "' + cells[2] + '" not found. Use a Category ID from the Categories tab.');
    rec.categoryId = cat.categoryId;
    rec.categoryName = cat.categoryName;
    rec.quantity = rec.quantity || 1;
    rec.unit = rec.unit || 'Unit';
    rec.condition = rec.condition || 'Good';
    rec.recordCompletion = rec.recordCompletion || 'Complete';
    rec.status = 'Available';
    rec.assignedEmployeeId = '';
    rec.assignedTo = '';
    rec.dueDate = '';
    rec.createdAt = ts;
    rec.lastUpdated = ts;
    writes.push(wSet_('assets', id, rec, true));
    var tx = makeTx_(rec, 'INITIAL_IMPORT', 'Available', 'Available', who, { location: str_(rec.buildingRoom), notes: 'Added in Google Sheet' });
    writes.push(wSet_('transactions', tx.transactionId, tx, true));
    details = 'New asset ' + id + ' (' + rec.itemName + ') added from Google Sheet as Available.';
  } else if (tab.key === 'categories') {
    if (id.indexOf('CAT-') !== 0) throw new Error('Category IDs start with CAT- (for example CAT-FUR).');
    if (fsList_('categories').some(function (x) { return norm_(x.categoryName) === norm_(rec.categoryName); })) {
      throw new Error('A category called "' + rec.categoryName + '" already exists.');
    }
    rec.iconName = 'FolderTree';
    writes.push(wSet_('categories', id, rec, true));
    details = 'Category "' + rec.categoryName + '" (' + id + ') added from Google Sheet.';
  } else if (tab.key === 'locations') {
    var dup = fsList_('locations').some(function (l) {
      return norm_(l.officeBranch) === norm_(rec.officeBranch) && norm_(l.building) === norm_(rec.building) && norm_(l.room) === norm_(rec.room);
    });
    if (dup) throw new Error('"' + rec.room + '" already exists in ' + rec.building + ', ' + rec.officeBranch + '.');
    rec.floor = rec.floor || '';
    rec.description = rec.description || '';
    rec.isStore = Boolean(rec.isStore);
    writes.push(wSet_('locations', id, rec, true));
    details = 'Location ' + locationLabel_(rec) + ' (' + rec.officeBranch + ') added from Google Sheet.';
  } else if (tab.key === 'consumables') {
    var stock = Number(rec.currentStock) || Number(rec.openingBalance) || 0;
    rec.openingBalance = stock;
    rec.currentStock = stock;
    rec.category = rec.category || 'General Supplies';
    rec.unit = rec.unit || 'Unit';
    rec.lastUpdated = ts;
    writes.push(wSet_('consumables', id, rec, true));
    details = 'Consumable "' + rec.itemName + '" (' + id + ') added from Google Sheet with ' + stock + ' ' + rec.unit + '.';
  } else {
    throw new Error('New rows cannot be added on this tab.');
  }
  writes.push(logWrite_('SHEET_CREATE', tab.recordType, id, who, details));
  fsCommit_(writes);
  var fresh = fsGet_(tab.collection, id);
  if (fresh) writeRow_(sheet, tab, r, renderRow_(tab, fresh, null));
  sheet.getRange(r, 1).clearNote();
  if (tab.key === 'assets') applyChanges_(writes.filter(function (w) { return w.update.name.indexOf('/transactions/') > 0; }).map(function (w) {
    return { collection: 'transactions', id: w.update.name.split('/').pop() };
  }));
  return details;
}

/** Activity-log write (append-only, like the app's own log rows). */
function logWrite_(action, recordType, recordId, who, details) {
  var log = makeLog_(action, recordType, recordId, who, details);
  return wSet_('activityLogs', log.logId, log, true);
}

function makeLog_(action, recordType, recordId, who, details) {
  return {
    logId: uniqueId_('LOG'),
    timestamp: nowIso_(),
    userId: SYNC_USER_ID,
    userName: who,
    userRole: 'Google Sheets',
    action: action,
    recordType: 'SheetsSync',
    recordId: recordId,
    details: details + (recordType ? ' [' + recordType + ']' : '')
  };
}

function makeTx_(asset, type, prevStatus, newStatus, who, extra) {
  var t = {
    transactionId: uniqueId_('TX'),
    assetId: str_(asset.assetId),
    assetName: str_(asset.itemName),
    employeeId: '',
    employeeName: '',
    transactionType: type,
    performedByUserId: SYNC_USER_ID,
    performedByName: who,
    timestamp: nowIso_(),
    previousStatus: prevStatus,
    newStatus: newStatus,
    condition: str_(asset.condition) || 'Good',
    notes: ''
  };
  Object.keys(extra || {}).forEach(function (k) { t[k] = extra[k]; });
  return t;
}

// ---------------------------------------------------------------------------
// Timer + menu
// ---------------------------------------------------------------------------

function scheduledFullSync() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return;
  try {
    fullSync_('10-minute timer');
  } catch (err) {
    saveStatus_({ lastSyncTimestamp: nowIso_(), lastSyncStatus: 'Failed', lastSyncError: String(err.message || err), lastSyncSource: '10-minute timer' });
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('WANG Sync')
    .addItem('Set up this sheet (run once)', 'setupSheet')
    .addItem('Sync everything now', 'menuSyncNow')
    .addItem('Check connection', 'menuCheck')
    .addToUi();
}

/** One-time setup: checks properties, creates tabs, installs triggers, fills the sheet. */
function setupSheet() {
  var ui = SpreadsheetApp.getUi();
  var problems = [];
  try {
    serviceAccount_();
  } catch (e) {
    problems.push(e.message);
  }
  var secret = prop_('SYNC_SECRET');
  if (!secret || secret.length < 16) problems.push('Script Property SYNC_SECRET is missing (copy it from the app\'s Google Sheets page).');
  if (problems.length) {
    ui.alert('Setup needs Script Properties first', problems.join('\n\n') + '\n\nApps Script → Project Settings (gear) → Script Properties.', ui.ButtonSet.OK);
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  TABS.forEach(function (t) { ensureSheet_(ss, t); });

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['handleSheetEdit', 'scheduledFullSync'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('handleSheetEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('scheduledFullSync').timeBased().everyMinutes(10).create();

  try {
    var res = withLock_(function () { return fullSync_('setup'); });
    if (!res.ok) throw new Error(res.error);
    ui.alert('WANG Sync is ready', 'Filled ' + res.totalRows + ' rows from the inventory database.\n\n' +
      'Now deploy the Web App (Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone) and paste its URL into the app.', ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Could not read the database', String(err.message || err), ui.ButtonSet.OK);
  }
}

function menuSyncNow() {
  var res = withLock_(function () { return fullSync_('sheet menu'); });
  toast_(res.ok ? 'Synced ' + res.totalRows + ' rows.' : res.error, 'WANG Sync', 8);
}

function menuCheck() {
  var p = ping_();
  var lines = [
    'Firestore access: ' + (p.firestore.ok ? 'OK' : 'FAILED - ' + p.firestore.error),
    'Missing tabs: ' + (p.missingTabs.length ? p.missingTabs.join(', ') : 'none'),
    'Triggers installed: ' + (p.triggersInstalled ? 'yes' : 'no - run "Set up this sheet"'),
    'SYNC_SECRET set: ' + (prop_('SYNC_SECRET').length >= 16 ? 'yes' : 'no')
  ];
  SpreadsheetApp.getUi().alert('WANG Sync check', lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function toast_(msg, title, seconds) {
  try {
    ss_().toast(String(msg).slice(0, 500), title || 'WANG Sync', seconds || 6);
  } catch (e) {}
}
