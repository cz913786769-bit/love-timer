import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const safeDataPath = path.join(repoRoot, 'assets', 'data', 'icp-safe-data.json');
const apiClientPath = path.join(repoRoot, 'assets', 'js', 'api-client.js');
const vercelPath = path.join(repoRoot, 'vercel.json');
const publicPages = [
  'pages/index.html',
  'pages/home-20260808h.html',
  'pages/about-us.html',
  'pages/love-album.html',
  'pages/little-things.html',
  'pages/love-list.html'
];

const errors = [];

async function readRelative(relPath) {
  return readFile(path.join(repoRoot, relPath), 'utf8');
}

function fail(message) {
  errors.push(message);
}

async function mustExist(relPath) {
  try {
    await access(path.join(repoRoot, relPath));
  } catch {
    fail(`${relPath} is missing`);
  }
}

await mustExist('assets/data/icp-safe-data.json');

try {
  const safeData = JSON.parse(await readFile(safeDataPath, 'utf8'));
  for (const blockedKey of ['messages', 'password', 'password_hash', 'session', 'token', 'secret']) {
    if (JSON.stringify(safeData).toLowerCase().includes(blockedKey)) {
      fail(`safe data contains blocked key/text: ${blockedKey}`);
    }
  }
  if (!safeData.site || !safeData.cover || !safeData.avatars || !safeData.album || !safeData.timeline || !safeData.wishlist || !safeData.letter) {
    fail('safe data does not contain all required public sections');
  }
} catch (error) {
  fail(`safe data is not readable JSON: ${error.message}`);
}

const apiClient = await readFile(apiClientPath, 'utf8');
if (!apiClient.includes('ICP_SAFE_MODE = true')) {
  fail('api-client.js does not declare ICP_SAFE_MODE = true');
}
for (const forbidden of [
  '/api/data',
  '/api/session',
  '/api/check-updates',
  'https://api.xiaoxingxing.love',
  "requestJson('POST'",
  "requestJson('PUT'",
  "requestJson('DELETE'",
  "setInterval(checkUpdates"
]) {
  if (apiClient.includes(forbidden)) {
    fail(`api-client.js still contains forbidden runtime dependency: ${forbidden}`);
  }
}

const vercel = JSON.parse(await readFile(vercelPath, 'utf8'));
const routeSrcs = (vercel.routes || []).map((route) => route.src || '');
for (const route of ['admin-login', 'admin-dashboard', 'leaving']) {
  if (!routeSrcs.some((src) => src.includes(route))) {
    fail(`vercel.json does not close route: ${route}`);
  }
}
if (!JSON.stringify(vercel).includes('/app.html')) {
  fail('vercel.json does not route public site to app.html');
}

for (const relPath of publicPages) {
  const html = await readRelative(relPath);
  if (html.includes('>留言板<') || html.includes('data-dom-id="nav-leaving"') || html.includes('data-dom-id="cta-leaving"')) {
    fail(`${relPath} still exposes leaving-board navigation`);
  }
  if (html.includes('footer-admin') || html.includes('admin-login.html') || html.includes('admin-dashboard.html')) {
    fail(`${relPath} still exposes public admin entry`);
  }
  if (!html.includes('api-client.js?v=20260813-icp1')) {
    fail(`${relPath} does not use the ICP cache-busted api-client.js`);
  }
}

const leavingHtml = await readRelative('pages/leaving.html');
if (leavingHtml.includes('<form') || leavingHtml.includes('message-form') || leavingHtml.includes('messages-list')) {
  fail('pages/leaving.html still contains public message form/list markup');
}
if (!leavingHtml.includes('页面暂未开放')) {
  fail('pages/leaving.html does not show a simple closed state');
}

if (errors.length) {
  console.error('ICP safe verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ICP safe verification passed.');
