# WANG Inventory ⇄ Google Sheet live sync

This folder is a complete **Google Apps Script** project. It is pasted into a
Google Sheet (Extensions → Apps Script) and keeps that sheet in step with the
inventory app, in both directions. It is free: no paid Firebase plan is needed.

| Direction | How | Speed |
|---|---|---|
| App → Sheet | After every save, the app tells the script *which records changed* (IDs only). The script reads those records from Firestore and updates their rows. | seconds |
| App → Sheet (safety net) | A timer rebuilds every tab from Firestore. Restores deleted rows, refreshes the count columns, catches anything missed. | every 10 minutes |
| Sheet → App | An "on edit" trigger saves edited cells back to Firestore and writes an activity-log row (`recordType: SheetsSync`). | seconds |

## What can be edited in the sheet

| Tab | Editable | Locked (edits are undone) |
|---|---|---|
| Master Assets | Item Name, Category ID, Brand, Model, Serial Number, Quantity, Unit, Purchase Date, Purchase Cost, Supplier, City / Branch, Building - Room, Condition, Warranty Expiry, Invoice Link, Record Completion, Remarks | **Asset ID, Status, Assigned Employee ID, Assigned To, Due Date**, Category Name, Last Updated |
| Categories | Category Name, Description | Category ID, Total Assets |
| Employees | Full Name, Department, Designation, Phone, Station | Employee ID, **Email, Role, Active**, Assets Held |
| Locations | Floor, Store?, Description | Location ID, City / Branch, Building, Room (rename rooms in the app), Assets |
| Consumables | Item Name, Category, Unit, Minimum Threshold, Unit Cost, Location, Supplier | Item Code, Opening Balance, Current Stock (use Receive / Issue in the app), Last Updated |
| Asset Transactions | nothing – read-only history | everything |

* Issue / return / missing / custody changes always go through the app, so history stays correct.
* **Deleting a row in the sheet never deletes data.** The row comes back at the next 10-minute sync.
* **New row** at the bottom with a new ID creates a record:
  * Master Assets: needs Asset ID, Item Name and a Category ID from the Categories tab → created as **Available**.
  * Categories (ID must start with `CAT-`), Locations (City, Building, Room needed), Consumables (stock from Current Stock).
  * Employees are **not** created from the sheet (their sign-in email and role must be set in the app).
* Who may edit the sheet is controlled by the sheet's own **Share** button. The locked
  columns are also protected so that only the sheet owner can type in them (and even
  the owner's edits there are undone).

## How the script reaches the database

The script signs in to Firestore with a **Google Cloud service account** (a robot
account) using the Firestore REST API with an OAuth token
(`https://www.googleapis.com/auth/datastore` scope). Server-side access like this is
checked by Google Cloud **IAM**, not by `firestore.rules` – the security rules only
apply to the website / mobile SDKs. That is why the script keeps working after the
rules are locked down, and why the service account key must be kept private (only in
Script Properties, never in the sheet or in GitHub).

## One-time setup

You need: owner access to the Firebase / Google Cloud project `dev-rhythm-nt3g1`, and
an admin login in the inventory app.

### 1. Create the service account and key

1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts?project=dev-rhythm-nt3g1>.
2. **+ Create service account** → name `wang-sheet-sync` → **Create and continue**.
3. Role: **Cloud Datastore User** → **Continue** → **Done**.
4. Click the new account → **Keys** tab → **Add key → Create new key → JSON → Create**.
   A `.json` file downloads. Keep it private.
   *If Google says key creation is disabled by an organisation policy, the project is
   inside a Google Workspace organisation; an org admin must allow
   `iam.disableServiceAccountKeyCreation` for this project.*

### 2. Make the sheet and get the secret

1. Create a new, empty Google Sheet (for example "WANG Inventory – Live").
2. In the inventory app open **Google Sheets** (sidebar), paste the sheet link in
   **1. Google Sheet link**, leave the Web App URL empty, press **Save settings**.
3. A **secret** appears. Press **Copy**.

### 3. Paste the script

1. In the sheet: **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with the contents of [`Code.gs`](Code.gs).
3. **Project Settings** (gear icon) → tick **Show "appsscript.json" manifest file in editor**.
   Back in the editor, replace `appsscript.json` with [`appsscript.json`](appsscript.json).
4. **Project Settings → Script Properties → Add script property**:
   * `SYNC_SECRET` = the secret copied from the app
   * `SERVICE_ACCOUNT_JSON` = open the downloaded key file in Notepad, copy **all** of it (from `{` to `}`), paste
   * (optional) `FIREBASE_PROJECT_ID` and `FIRESTORE_DATABASE_ID` – only if the database ever moves; the defaults are already correct.
5. Save (Ctrl+S).

### 4. Set up the sheet

1. Reload the Google Sheet tab. A new menu **WANG Sync** appears (wait a few seconds).
2. **WANG Sync → Set up this sheet (run once)**.
3. Google asks for permission. Choose your account → *Google hasn't verified this app* →
   **Advanced → Go to … (unsafe)** → **Allow**. (It is your own script.)
4. Run **Set up this sheet** again if it stopped at the permission screen. It creates the six
   tabs, installs the edit trigger and the 10-minute timer, and fills the sheet.

### 5. Deploy the Web App and connect the app

1. In Apps Script: **Deploy → New deployment** → gear → **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. → **Deploy** → copy the **Web app URL**
   (ends with `/exec`).
3. In the inventory app (Google Sheets page) paste it into **2. Apps Script Web App URL**,
   **Save settings**, then **Test connection**. Fix anything it reports.
4. Press **Sync everything now** once.

> After changing `Code.gs` later, use **Deploy → Manage deployments → Edit (pencil) →
> Version: New version → Deploy**, so the same URL runs the new code.

## Troubleshooting

| Message | Fix |
|---|---|
| Wrong secret / SYNC_SECRET not set | Copy the secret from the app into the `SYNC_SECRET` Script Property again (no spaces). |
| The Web App answered with a web page | Redeploy with **Who has access: Anyone** and use the URL ending in `/exec`. |
| The service account has no access to Firestore | Give it the **Cloud Datastore User** role (IAM page). |
| SERVICE_ACCOUNT_JSON is not valid JSON | Paste the whole key file again, from `{` to `}`. |
| Missing tabs / triggers not installed | Run **WANG Sync → Set up this sheet**. |
| Cell note "Not saved: …" | The value was not accepted (wrong category, not a number, …). Fix the cell; the note explains why. |

## Tests

`npm run test:script` runs `Code.gs` in Node against fake Google Sheets and a fake
Firestore REST API (no network, no real data). It cannot test the real Google
services – the setup steps above must still be checked once by hand.
