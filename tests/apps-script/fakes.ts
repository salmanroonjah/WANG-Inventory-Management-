/// <reference types="node" />
/**
 * Minimal in-memory fakes of the Apps Script services used by apps-script/Code.gs,
 * plus a fake Firestore REST API. Enough to run the sync logic in Node.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// ---------------- fake Firestore (REST) ----------------
export class FakeFirestore {
  docs = new Map<string, Record<string, any>>(); // "collection/id" -> fields (typed values)
  root = 'projects/p/databases/d/documents';
  commits: any[] = [];

  put(collection: string, id: string, plain: Record<string, any>) {
    this.docs.set(`${collection}/${id}`, toFields(plain));
  }
  get(collection: string, id: string): Record<string, any> | undefined {
    const f = this.docs.get(`${collection}/${id}`);
    return f ? fromFields(f) : undefined;
  }
  list(collection: string) {
    return [...this.docs.entries()].filter(([k]) => k.startsWith(collection + '/')).map(([, f]) => fromFields(f));
  }

  handle(url: string, opts: any): { code: number; body: any } {
    const path = decodeURIComponent(url.replace('https://firestore.googleapis.com/v1/', ''));
    if (path.endsWith(':commit')) {
      const { writes } = JSON.parse(opts.payload);
      // validate first (atomic)
      for (const w of writes) {
        const key = w.update.name.replace(this.root + '/', '');
        const exists = this.docs.has(key);
        if (w.currentDocument?.exists === false && exists) return { code: 409, body: { error: { message: 'ALREADY_EXISTS ' + key } } };
        if (w.currentDocument?.exists === true && !exists) return { code: 404, body: { error: { message: 'NOT_FOUND ' + key } } };
      }
      for (const w of writes) {
        const key = w.update.name.replace(this.root + '/', '');
        if (w.updateMask) {
          const cur = { ...(this.docs.get(key) || {}) };
          for (const fp of w.updateMask.fieldPaths) {
            if (fp in w.update.fields) cur[fp] = w.update.fields[fp];
            else delete cur[fp];
          }
          this.docs.set(key, cur);
        } else {
          this.docs.set(key, { ...w.update.fields });
        }
      }
      this.commits.push(writes);
      return { code: 200, body: { writeResults: writes.map(() => ({})) } };
    }
    const rel = path.replace(this.root + '/', '').split('?')[0];
    const parts = rel.split('/');
    if (parts.length === 2) {
      const f = this.docs.get(rel);
      return f ? { code: 200, body: { name: this.root + '/' + rel, fields: f } } : { code: 404, body: { error: { message: 'not found' } } };
    }
    const documents = [...this.docs.entries()]
      .filter(([k]) => k.startsWith(parts[0] + '/'))
      .map(([k, f]) => ({ name: this.root + '/' + k, fields: f }));
    return { code: 200, body: { documents } };
  }
}

export function toValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}
export function toFields(o: Record<string, any>) {
  const f: Record<string, any> = {};
  for (const k of Object.keys(o)) f[k] = toValue(o[k]);
  return f;
}
export function fromValue(v: any): any {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}
export function fromFields(f: Record<string, any>) {
  const o: Record<string, any> = {};
  for (const k of Object.keys(f)) o[k] = fromValue(f[k]);
  return o;
}

// ---------------- fake Sheets ----------------
class FakeProtection {
  desc = '';
  constructor(private owner: FakeSheet) {}
  setDescription(d: string) { this.desc = d; return this; }
  getDescription() { return this.desc; }
  addEditor() { return this; }
  removeEditors() { return this; }
  getEditors() { return []; }
  canDomainEdit() { return false; }
  setDomainEdit() { return this; }
  remove() { this.owner.protections = this.owner.protections.filter((p) => p !== this); }
}

class FakeRange {
  constructor(private sheet: FakeSheet, private r: number, private c: number, private nr = 1, private nc = 1) {}
  getSheet() { return this.sheet; }
  getRow() { return this.r; }
  getColumn() { return this.c; }
  getLastRow() { return this.r + this.nr - 1; }
  getLastColumn() { return this.c + this.nc - 1; }
  getDisplayValues() {
    const out: string[][] = [];
    for (let i = 0; i < this.nr; i++) {
      const row: string[] = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sheet.cell(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  }
  getValues() { return this.getDisplayValues(); }
  getDisplayValue() { return this.sheet.cell(this.r, this.c); }
  setValues(v: any[][]) {
    if (v.length !== this.nr || v.some((row) => row.length !== this.nc)) throw new Error('setValues size mismatch');
    v.forEach((row, i) => row.forEach((val, j) => this.sheet.set(this.r + i, this.c + j, val)));
    return this;
  }
  setValue(v: any) { this.sheet.set(this.r, this.c, v); return this; }
  clearContent() {
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sheet.set(this.r + i, this.c + j, '');
    return this;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setDataValidation() { return this; }
  setNote(n: string) { this.sheet.notes.set(`${this.r},${this.c}`, n); return this; }
  clearNote() { this.sheet.notes.delete(`${this.r},${this.c}`); return this; }
  protect() { const p = new FakeProtection(this.sheet); this.sheet.protections.push(p); return p; }
}

export class FakeSheet {
  data: string[][] = [];
  notes = new Map<string, string>();
  protections: FakeProtection[] = [];
  frozen = 0;
  maxRows = 1000;
  constructor(private name: string, private parent: FakeSpreadsheet) {}
  getName() { return this.name; }
  getParent() { return this.parent; }
  cell(r: number, c: number) { return String(this.data[r - 1]?.[c - 1] ?? ''); }
  set(r: number, c: number, v: any) {
    if (r > this.maxRows) throw new Error('row out of range');
    while (this.data.length < r) this.data.push([]);
    this.data[r - 1][c - 1] = v === undefined || v === null ? '' : String(v);
  }
  getRange(r: number, c: number, nr = 1, nc = 1) { return new FakeRange(this, r, c, nr, nc); }
  getLastRow() {
    for (let i = this.data.length; i > 0; i--) if ((this.data[i - 1] || []).some((x) => x !== '' && x !== undefined)) return i;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.data.map((r) => r.length)); }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter(_after: number, n: number) { this.maxRows += n; }
  deleteRow(r: number) { this.data.splice(r - 1, 1); }
  getFrozenRows() { return this.frozen; }
  setFrozenRows(n: number) { this.frozen = n; }
  getProtections() { return [...this.protections]; }
  protect() { const p = new FakeProtection(this); this.protections.push(p); return p; }
  /** Row values (trimmed to width) as objects keyed by header. */
  rows(): Record<string, string>[] {
    const headers = this.data[0] || [];
    return this.data.slice(1, this.getLastRow()).map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '')])));
  }
}

export class FakeSpreadsheet {
  sheets = new Map<string, FakeSheet>();
  toasts: string[] = [];
  getId() { return 'SHEET-ID-1234567890123456'; }
  getName() { return 'WANG Inventory (test)'; }
  getSheetByName(n: string) { return this.sheets.get(n) || null; }
  insertSheet(n: string) { const s = new FakeSheet(n, this); this.sheets.set(n, s); return s; }
  toast(msg: string) { this.toasts.push(msg); }
}

// ---------------- load Code.gs ----------------
export function loadScript(opts: { secret?: string } = {}) {
  const fs = new FakeFirestore();
  const ss = new FakeSpreadsheet();
  const props: Record<string, string> = {
    SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'sync@p.iam.gserviceaccount.com', private_key: 'KEY', token_uri: 'https://oauth2.googleapis.com/token' }),
    SYNC_SECRET: opts.secret ?? 'test-secret-1234567890',
    FIREBASE_PROJECT_ID: 'p',
    FIRESTORE_DATABASE_ID: 'd'
  };
  const cache = new Map<string, string>();
  const triggers: any[] = [];
  const fetchLog: string[] = [];

  const sandbox: any = {
    console,
    JSON,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
    isFinite,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props[k] ?? null,
        setProperty: (k: string, v: string) => { props[k] = v; }
      })
    },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    Utilities: {
      newBlob: (s: string) => ({ getBytes: () => Array.from(Buffer.from(s, 'utf8')) }),
      base64EncodeWebSafe: (b: any) => Buffer.from(typeof b === 'string' ? Buffer.from(b) : Uint8Array.from(b.map((x: number) => x & 255))).toString('base64url') + '=',
      computeRsaSha256Signature: () => [1, 2, 3],
      formatDate: () => '2026-11-17'
    },
    UrlFetchApp: {
      fetch: (url: string, o: any) => {
        fetchLog.push(`${(o?.method || 'get').toUpperCase()} ${url}`);
        if (url.startsWith('https://oauth2.googleapis.com/token')) {
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ access_token: 'tok' }) };
        }
        if (o?.headers?.Authorization !== 'Bearer tok') throw new Error('missing auth header');
        const { code, body } = fs.handle(url, o);
        return { getResponseCode: () => code, getContentText: () => JSON.stringify(body) };
      }
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s: string) => ({ content: s, setMimeType() { return this; } })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      flush: () => {},
      ProtectionType: { RANGE: 'RANGE', SHEET: 'SHEET' },
      newDataValidation: () => {
        const b: any = { requireValueInList: () => b, setAllowInvalid: () => b, build: () => ({}) };
        return b;
      },
      getUi: () => ({ alert: () => {}, ButtonSet: { OK: 'OK' }, createMenu: () => ({ addItem() { return this; }, addToUi() {} }) })
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ScriptApp: {
      getProjectTriggers: () => triggers,
      deleteTrigger: () => {},
      newTrigger: (h: string) => {
        const t = { getHandlerFunction: () => h };
        const chain: any = { forSpreadsheet: () => chain, onEdit: () => chain, timeBased: () => chain, everyMinutes: () => chain, create: () => { triggers.push(t); return t; } };
        return chain;
      }
    }
  };
  vm.createContext(sandbox);
  const code = readFileSync(resolve(process.cwd(), 'apps-script/Code.gs'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'Code.gs' });

  const post = (body: any) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(body) } }).content);
  /** Simulates a user typing values into a sheet range (then fires the installable trigger). */
  const edit = (sheetName: string, row: number, col: number, values: string[][], oldValue?: string) => {
    const sheet = ss.getSheetByName(sheetName)!;
    values.forEach((r, i) => r.forEach((v, j) => sheet.set(row + i, col + j, v)));
    sandbox.handleSheetEdit({
      range: sheet.getRange(row, col, values.length, values[0].length),
      oldValue,
      user: { getEmail: () => 'editor@example.com' }
    });
  };
  return { sandbox, fs, ss, props, post, edit, triggers, fetchLog };
}
