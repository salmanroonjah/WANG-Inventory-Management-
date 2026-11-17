/// <reference types="node" />
/**
 * Security-rules tests. They run ONLY against the local Firestore emulator
 * (never the live database):
 *
 *   npm run test:rules
 *
 * which starts the emulator with a demo project id ("demo-wang"), so nothing
 * can reach the real project. Requires Java 11+ for the emulator.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const PEOPLE = {
  superAdmin: { employeeId: 'EMP-001', email: 'boss@example.com', role: 'Super Admin', activeStatus: true },
  manager: { employeeId: 'EMP-002', email: 'manager@example.com', role: 'Inventory & Finance Admin', activeStatus: true },
  approver: { employeeId: 'EMP-003', email: 'approver@example.com', role: 'Approver', activeStatus: true },
  staff: { employeeId: 'EMP-004', email: 'staff@example.com', role: 'Employee', activeStatus: true },
  inactive: { employeeId: 'EMP-005', email: 'gone@example.com', role: 'Inventory & Finance Admin', activeStatus: false },
  mixedCase: { employeeId: 'EMP-006', email: 'Mixed.Case@Example.com', role: 'Employee', activeStatus: true },
  noIndex: { employeeId: 'EMP-007', email: 'new.person@example.com', role: 'Employee', activeStatus: true }
} as const;

type Person = (typeof PEOPLE)[keyof typeof PEOPLE];

function dbAs(p: Person | { email: string }, verified = true) {
  const email = p.email.toLowerCase();
  return env.authenticatedContext(`uid-${email}`, { email, email_verified: verified }).firestore();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wang',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') }
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const p of Object.values(PEOPLE)) {
      await setDoc(doc(db, 'employees', p.employeeId), { ...p, fullName: p.employeeId, phone: '' });
      if (p !== PEOPLE.noIndex) {
        await setDoc(doc(db, 'userRoles', p.email.toLowerCase()), { employeeId: p.employeeId, email: p.email.toLowerCase() });
      }
    }
    await setDoc(doc(db, 'assets', 'WANG-IT-001'), { assetId: 'WANG-IT-001', itemName: 'Laptop', status: 'Available' });
    await setDoc(doc(db, 'activityLogs', 'LOG-1'), { logId: 'LOG-1', action: 'X' });
    await setDoc(doc(db, 'requests', 'REQ-1'), { requestId: 'REQ-1', status: 'Pending', requestingEmployeeId: 'EMP-004' });
  });
});

describe('sign-in required', () => {
  it('denies everything to signed-out visitors', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'assets', 'WANG-IT-001')));
    await assertFails(setDoc(doc(db, 'assets', 'X'), { a: 1 }));
  });

  it('denies unverified emails', async () => {
    await assertFails(getDoc(doc(dbAs(PEOPLE.staff, false), 'assets', 'WANG-IT-001')));
  });

  it('denies Google accounts that are not employees', async () => {
    const db = dbAs({ email: 'stranger@example.com' });
    await assertFails(getDoc(doc(db, 'assets', 'WANG-IT-001')));
    await assertFails(getDocs(collection(db, 'employees')));
    // ...but the own-email lookup is allowed (and finds nothing).
    await assertSucceeds(getDocs(query(collection(db, 'employees'), where('email', '==', 'stranger@example.com'))));
  });

  it('denies inactive employees', async () => {
    await assertFails(getDoc(doc(dbAs(PEOPLE.inactive), 'assets', 'WANG-IT-001')));
    await assertFails(setDoc(doc(dbAs(PEOPLE.inactive), 'assets', 'X'), { a: 1 }));
  });
});

describe('userRoles index (first sign-in)', () => {
  it('lets a new person find their own employee record and claim the index', async () => {
    const db = dbAs(PEOPLE.noIndex);
    await assertFails(getDoc(doc(db, 'assets', 'WANG-IT-001'))); // not yet indexed
    await assertSucceeds(getDocs(query(collection(db, 'employees'), where('email', '==', PEOPLE.noIndex.email))));
    await assertSucceeds(
      setDoc(doc(db, 'userRoles', PEOPLE.noIndex.email), { employeeId: PEOPLE.noIndex.employeeId, email: PEOPLE.noIndex.email })
    );
    await assertSucceeds(getDoc(doc(db, 'assets', 'WANG-IT-001')));
  });

  it("does not let anyone point their index at someone else's record", async () => {
    const db = dbAs(PEOPLE.noIndex);
    await assertFails(setDoc(doc(db, 'userRoles', PEOPLE.noIndex.email), { employeeId: 'EMP-001', email: PEOPLE.noIndex.email }));
    await assertFails(setDoc(doc(db, 'userRoles', 'boss@example.com'), { employeeId: 'EMP-001', email: 'boss@example.com' }));
  });

  it('matches emails case-insensitively', async () => {
    await assertSucceeds(getDoc(doc(dbAs(PEOPLE.mixedCase), 'assets', 'WANG-IT-001')));
  });

  it('a stale index entry gives no access once the employee email changes', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'employees', 'EMP-004'), { email: 'other@example.com' });
    });
    await assertFails(getDoc(doc(dbAs(PEOPLE.staff), 'assets', 'WANG-IT-001')));
  });
});

describe('roles', () => {
  it('staff can read but not change inventory', async () => {
    const db = dbAs(PEOPLE.staff);
    await assertSucceeds(getDoc(doc(db, 'assets', 'WANG-IT-001')));
    await assertFails(updateDoc(doc(db, 'assets', 'WANG-IT-001'), { status: 'Lost' }));
    await assertFails(setDoc(doc(db, 'categories', 'CAT-X'), { categoryId: 'CAT-X' }));
    await assertFails(setDoc(doc(db, 'systemSettings', 'sheetsConfig'), { webAppUrl: 'x' }));
  });

  it('admins can change inventory', async () => {
    const db = dbAs(PEOPLE.manager);
    await assertSucceeds(updateDoc(doc(db, 'assets', 'WANG-IT-001'), { status: 'Retired' }));
    await assertSucceeds(setDoc(doc(db, 'transactions', 'TX-1'), { transactionId: 'TX-1' }));
    await assertSucceeds(setDoc(doc(db, 'systemSettings', 'sheetsConfig'), { webAppUrl: 'x' }));
  });

  it('only a Super Admin changes roles', async () => {
    await assertFails(updateDoc(doc(dbAs(PEOPLE.manager), 'employees', 'EMP-004'), { role: 'Super Admin' }));
    await assertFails(updateDoc(doc(dbAs(PEOPLE.manager), 'employees', 'EMP-002'), { role: 'Super Admin' }));
    await assertSucceeds(updateDoc(doc(dbAs(PEOPLE.superAdmin), 'employees', 'EMP-004'), { role: 'Approver' }));
  });

  it('admins cannot create Super Admins or take over a Super Admin email', async () => {
    const db = dbAs(PEOPLE.manager);
    await assertFails(setDoc(doc(db, 'employees', 'EMP-099'), { employeeId: 'EMP-099', email: 'x@example.com', role: 'Super Admin' }));
    await assertFails(updateDoc(doc(db, 'employees', 'EMP-001'), { email: 'manager2@example.com' }));
    await assertFails(updateDoc(doc(db, 'employees', 'EMP-001'), { activeStatus: false }));
    await assertFails(deleteDoc(doc(db, 'employees', 'EMP-001')));
    // Harmless Super Admin fields (e.g. station after a room rename) are fine.
    await assertSucceeds(updateDoc(doc(db, 'employees', 'EMP-001'), { officeBranch: 'Head Office - Room 2' }));
    await assertSucceeds(setDoc(doc(db, 'employees', 'EMP-098'), { employeeId: 'EMP-098', email: 'y@example.com', role: 'Employee' }));
  });

  it('staff may edit only their own contact details', async () => {
    const db = dbAs(PEOPLE.staff);
    await assertSucceeds(updateDoc(doc(db, 'employees', 'EMP-004'), { phone: '0300' }));
    await assertFails(updateDoc(doc(db, 'employees', 'EMP-004'), { role: 'Super Admin' }));
    await assertFails(updateDoc(doc(db, 'employees', 'EMP-004'), { email: 'new@example.com' }));
    await assertFails(updateDoc(doc(db, 'employees', 'EMP-003'), { phone: '0300' }));
  });

  it('admins keep the index in step with the employee email', async () => {
    const db = dbAs(PEOPLE.manager);
    await assertFails(setDoc(doc(db, 'userRoles', 'evil@example.com'), { employeeId: 'EMP-001', email: 'evil@example.com' }));
    await assertSucceeds(setDoc(doc(db, 'userRoles', 'staff@example.com'), { employeeId: 'EMP-004', email: 'staff@example.com' }));
  });
});

describe('activity log is append-only', () => {
  it('any active employee may add a row', async () => {
    await assertSucceeds(setDoc(doc(dbAs(PEOPLE.staff), 'activityLogs', 'LOG-2'), { logId: 'LOG-2' }));
  });

  it('only a Super Admin may change or clear rows', async () => {
    await assertFails(updateDoc(doc(dbAs(PEOPLE.manager), 'activityLogs', 'LOG-1'), { action: 'Y' }));
    await assertFails(deleteDoc(doc(dbAs(PEOPLE.manager), 'activityLogs', 'LOG-1')));
    await assertSucceeds(deleteDoc(doc(dbAs(PEOPLE.superAdmin), 'activityLogs', 'LOG-1')));
  });
});

describe('requests', () => {
  it('staff submit requests for themselves only', async () => {
    const db = dbAs(PEOPLE.staff);
    await assertSucceeds(setDoc(doc(db, 'requests', 'REQ-2'), { requestId: 'REQ-2', status: 'Pending', requestingEmployeeId: 'EMP-004' }));
    await assertFails(setDoc(doc(db, 'requests', 'REQ-3'), { requestId: 'REQ-3', status: 'Pending', requestingEmployeeId: 'EMP-003' }));
    await assertFails(setDoc(doc(db, 'requests', 'REQ-4'), { requestId: 'REQ-4', status: 'Approved', requestingEmployeeId: 'EMP-004' }));
    await assertFails(updateDoc(doc(db, 'requests', 'REQ-1'), { status: 'Approved' }));
  });

  it('approvers decide requests', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(PEOPLE.approver), 'requests', 'REQ-1'), { status: 'Approved' }));
  });
});

describe('unknown collections', () => {
  it('are closed', async () => {
    await assertFails(setDoc(doc(dbAs(PEOPLE.superAdmin), 'secrets', 'x'), { a: 1 }));
  });
});
