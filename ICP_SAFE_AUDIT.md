# ICP Safe Audit

Audit date: 2026-08-13

## Scope

- Frontend repository: `D:/qixiliwu/love-timer`
- API repository inspected read-only: `D:/qixiliwu/love-timer-api`
- Production site: `https://www.xiaoxingxing.love`
- API host that must not be required during filing: `api.xiaoxingxing.love`

## Git State

### Frontend

- Branch: `main`
- Initial HEAD: `6780b153e051b1d2f72adab268409b0afc3226ea`
- Safety tag created: `pre-icp-safe-20260813` -> `6780b153e051b1d2f72adab268409b0afc3226ea`
- Recent history:
  - `6780b15 docs: complete icp filing audit`
  - `f58ee0f fix: route existing files to icp review page`
  - `e8bec8f chore: enable icp review mode`
  - `6a8f4d9 fix: sync wishlist completion across devices`
  - `cb7fcf3 fix: restore backup flow and photo deletion`
  - `13516e8 fix: bypass stale mobile browser cache`
  - `ab520d1 fix: redirect cached mobile homepage entry`
  - `2cd180c fix: force root homepage to latest mobile version`
  - `ca3b6d4 更新`
  - `454adec fix: support older mobile browsers for API data`
- Pre-existing untracked file ignored for this task: `BUILD_LOG.md`

### API

- Branch: `main`
- HEAD: `a90e8c6d883fe7eeb3f9882228236514427111d0`
- Recent history:
  - `a90e8c6 docs: add psb filing placeholders`
  - `5b54f4a chore: add icp review api guard`
  - `ac4be5d 更新`
  - `cd9d6e0 更新`
  - `0f4a4ec 后端`
  - `9ea2296 Initial commit`
- API repository remained read-only during this audit.

## Current Data Sources

- Runtime frontend data source before this change: `assets/js/api-client.js` defaults to `https://api.xiaoxingxing.love` and requests `/api/session`, `/api/data`, and `/api/check-updates`.
- Local fallback/default data source: `assets/js/admin-data.js`.
- Historical export available locally: `love-data-export-20260808.json`.
- Static media source: tracked files under `assets/`.

## Public Snapshot Source

The static ICP Safe snapshot will be generated from local file `love-data-export-20260808.json`, using its `data` payload only.

Snapshot counts from that export:

- Album groups: 14
- Photos: 57
- Timeline items: 14
- Wishlist items: 3
- Messages: 0 in export; messages are intentionally excluded from ICP Safe data
- Letter: complete
- Cover: `../assets/banner.jpg`
- Avatars:
  - Left: `../assets/avatars/jiajia.png`
  - Right: `../assets/avatars/chenzhuozhuo.png`

The export contains no `password`, `password_hash`, `session`, `token`, `secret`, or cookie fields.

## Page Data Mapping

- Home page:
  - Site text from `site`
  - Cover from `cover`
  - Avatars from `avatars`
  - Love timer remains client-side and static
- Album:
  - `album[].photos[].src`
  - All paths currently point to tracked `../assets/...` files
- Timeline:
  - `timeline[].cover`
  - All paths currently point to tracked `../assets/...` files
- Wishlist:
  - `wishlist[]`
  - Must render read-only during ICP Safe mode
- Letter:
  - `letter.greeting`
  - `letter.paragraphs`
  - `letter.signOff`
  - `letter.dateText`

## Media Audit

- `/assets/...` media used by the snapshot:
  - `../assets/banner.jpg`
  - `../assets/avatars/jiajia.png`
  - `../assets/avatars/chenzhuozhuo.png`
  - `../assets/memories/**`
  - `assets/music/there-is-romance.mp3` in `app.html`
- `/uploads/...` media referenced by the local export: 0
- Required `/uploads` copy count for this round: 0
- No server media copy is required.

## API Repository Read-Only Findings

- API server is Express + SQLite + uploaded files under `server-data/uploads`.
- It exposes read/write routes including `/api/data`, `/api/session`, `/api/check-updates`, `/api/messages`, `/api/album`, `/api/wishlist`, `/api/timeline`, `/api/letter`, login, upload, import, and reset.
- The API repository also contains database migration/import/reset code. None of those paths are needed for this ICP Safe static showcase.
- `.env` was not opened or modified.
- SQLite was not opened or modified.
- Server, Nginx, PM2, DNS, and Aliyun were not accessed or modified.

## Risks And Required Controls

- Production `www.xiaoxingxing.love` must not depend on `api.xiaoxingxing.love`.
- `assets/js/api-client.js` must stop runtime requests to:
  - `/api/data`
  - `/api/album`
  - `/api/session`
  - `/api/check-updates`
  - Any POST/PUT/DELETE/upload endpoint
- Public pages must remove the visible留言板 entry.
- Public pages must remove visible admin/login/edit/upload/delete controls.
- Direct access to `pages/leaving.html`, `pages/admin-login.html`, and `pages/admin-dashboard.html` must return a closed state or route away.
- Letter edits must be local-file based only, then published by GitHub -> Vercel.

## Audit Conclusion

Implementation can proceed fully from local tracked files and the local historical export. No database operation, server operation, DNS operation, `.env` change, or server media copy is required for this round.
