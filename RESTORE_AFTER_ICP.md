# Restore After ICP

Use this after ICP filing is approved and the production site can safely restore interactive features.

## Safety Baseline

- Pre-change tag: `pre-icp-safe-20260813`
- ICP Safe static letter file: `assets/data/icp-safe-data.json`
- Current ICP Safe letter must be preserved before restoring API mode.

## Preserve Latest Letter First

Before restoring the API-backed site:

1. Open `assets/data/icp-safe-data.json`.
2. Copy the current `letter` object.
3. Restore API mode code.
4. Write that latest letter into the backend through the normal authenticated admin path or a SELECT/UPDATE-reviewed maintenance step approved by the owner.

Do not overwrite the latest ICP-period letter with an older backend value.

## Restore Interactive Frontend

The ICP Safe implementation changed these frontend behaviors:

- `assets/js/api-client.js` is static-read-only.
- Public pages no longer include `assets/js/admin-core.js`.
- Public pages no longer show the留言板 nav item or admin footer entry.
- `pages/leaving.html` is a closed page.
- `vercel.json` routes admin/login/upload/leaving paths to closed states.
- `app.html` blocks admin pages from iframe navigation.

To restore the full site, revert or reapply from `pre-icp-safe-20260813` for those files, then reapply the preserved latest letter content.

## Restore Backend/API Features

After ICP approval, restore only through normal deployment review:

- API data source: `https://api.xiaoxingxing.love`
- Runtime data sync and `/api/check-updates` polling
- Full admin login
- Uploads
- Message board
- Cross-device wishlist/timeline/album sync
- Letter editing through authenticated admin

## Do Not Do These During Restore

- Do not run `git reset --hard` unless the owner explicitly approves it.
- Do not force push.
- Do not delete SQLite data.
- Do not delete `server-data/uploads`.
- Do not replace the backend letter with a stale copy.

## Suggested Restore Check

1. Confirm ICP approval date and visible ICP number requirements.
2. Preserve latest `assets/data/icp-safe-data.json.letter`.
3. Restore frontend API client, admin scripts, routes, and public留言 page.
4. Deploy to a preview or branch first.
5. Confirm API requests work only after approval.
6. Confirm the latest letter appears on the production site.
