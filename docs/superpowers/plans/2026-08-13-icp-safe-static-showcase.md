# ICP Safe Static Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a stable personal memorial showcase site during ICP filing without public write operations or runtime API dependency.

**Architecture:** Keep the existing static HTML/CSS UI and page scripts. Replace the API-backed `LoveData`/`LoveAdmin` runtime with an ICP Safe static JSON client, close public interactive routes through Vercel routing and page markup, and provide letter editing only through local tools.

**Tech Stack:** Static HTML, vanilla JavaScript, Vercel static routing, Node.js local tooling, Git.

---

### Task 1: Audit And Red Test

**Files:**
- Create: `ICP_SAFE_AUDIT.md`
- Create: `tools/verify-icp-safe.mjs`

- [x] **Step 1: Write failing verification**

Create `tools/verify-icp-safe.mjs` to fail when static data is missing, API runtime strings remain, public留言/后台 links remain, or closed pages still expose forms.

- [x] **Step 2: Run test to verify it fails**

Run: `node tools/verify-icp-safe.mjs`

Expected: FAIL with missing `assets/data/icp-safe-data.json` and current API route findings.

- [x] **Step 3: Write audit**

Write `ICP_SAFE_AUDIT.md` from read-only inspection of both repos and local data export.

### Task 2: Static Snapshot

**Files:**
- Create: `assets/data/icp-safe-data.json`

- [ ] **Step 1: Build snapshot from local export**

Read `love-data-export-20260808.json`, copy only public `site`, `cover`, `avatars`, `album`, `timeline`, `wishlist`, and `letter`.

- [ ] **Step 2: Validate blocked keys**

Run: `node -e "const d=require('./assets/data/icp-safe-data.json'); const s=JSON.stringify(d).toLowerCase(); for (const k of ['messages','password','password_hash','session','token','secret']) if (s.includes(k)) throw new Error(k); console.log('safe data ok')"`

Expected: PASS.

### Task 3: ICP Safe Data Client

**Files:**
- Modify: `assets/js/api-client.js`

- [ ] **Step 1: Replace runtime API client**

Implement `ICP_SAFE_MODE = true`, load `/assets/data/icp-safe-data.json`, expose the existing `LoveData` API as read-only, map avatars to the existing account shape, and make write/upload/login methods reject or no-op without network calls.

- [ ] **Step 2: Verify forbidden API strings are absent**

Run: `node tools/verify-icp-safe.mjs`

Expected: Still fails on public page links and route closures, but no longer fails on `api-client.js` forbidden runtime dependencies.

### Task 4: Close Public Interaction Entrypoints

**Files:**
- Modify: `vercel.json`
- Modify: `index.html`
- Modify: `app.html`
- Modify: `pages/index.html`
- Modify: `pages/home-20260808h.html`
- Modify: `pages/about-us.html`
- Modify: `pages/love-album.html`
- Modify: `pages/little-things.html`
- Modify: `pages/love-list.html`
- Replace public body: `pages/leaving.html`

- [ ] **Step 1: Route root and pages to showcase**

Update Vercel routes so `/` and normal static pages resolve to `app.html`, and direct `leaving`, `admin-login`, and `admin-dashboard` routes resolve to closed pages.

- [ ] **Step 2: Remove public留言 and admin entries**

Remove or hide visible留言 board links, CTA card, footer admin links, and edit/upload/admin-only controls from public pages while preserving source files.

- [ ] **Step 3: Replace leaving page with closed state**

Make `pages/leaving.html` show only `页面暂未开放` and no forms, inputs, history, comments, or submit buttons.

- [ ] **Step 4: Bump script cache versions**

Update page references to `api-client.js?v=20260813-icp1`.

### Task 5: Local Letter Management

**Files:**
- Create: `tools/letter-admin/server.mjs`
- Create: `tools/letter-admin/index.html`
- Create: `tools/letter-admin/README.md`
- Create: `tools/publish-letter.ps1`

- [ ] **Step 1: Local-only editor**

Build a localhost Node server that reads and writes only `assets/data/icp-safe-data.json` letter fields and serves a local preview/editor.

- [ ] **Step 2: Safe publish script**

Create a PowerShell script that stops if any file other than `assets/data/icp-safe-data.json` is modified, shows diff, asks for confirmation, then commits and pushes to `origin main`.

### Task 6: Documentation And Verification

**Files:**
- Create: `RESTORE_AFTER_ICP.md`
- Create: `ICP_SAFE_MODE_CHANGE_REPORT.md`

- [ ] **Step 1: Restore instructions**

Document how to restore API data source, backend, upload, login, and cross-device sync without overwriting the latest static letter.

- [ ] **Step 2: Run final checks**

Run:

```bash
node tools/verify-icp-safe.mjs
node --check assets/js/api-client.js
```

Expected: PASS.

- [ ] **Step 3: Browser check**

Serve the site locally, block `api.xiaoxingxing.love` in Playwright, and verify home, album, timeline, letter, and wishlist render without API network requests.
