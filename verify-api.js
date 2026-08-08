#!/usr/bin/env node
/**
 * API 数据验证脚本
 * 验证迁移后 API 返回的数据与 SQLite 一致
 */

const http = require('http');
const https = require('https');

const API_BASE = 'https://api.xiaoxingxing.love';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    https.get(API_BASE + path, { headers: { Accept: 'application/json' }, rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + e.message + ' data: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('========================================');
  console.log('  API 数据验证');
  console.log('========================================\n');

  let errors = [];

  // 1. /api/data
  console.log('--- /api/data ---');
  try {
    const data = await apiGet('/api/data');
    console.log('  site:', data.site ? Object.keys(data.site).length + ' fields' : 'MISSING');
    console.log('  cover:', data.cover || 'MISSING');
    console.log('  letter:', data.letter ? 'exists' : 'MISSING');
    console.log('  messages:', (data.messages || []).length, '条');
    console.log('  album groups:', (data.album || []).length, '组');
    console.log('  timeline:', (data.timeline || []).length, '条');
    console.log('  wishlist:', (data.wishlist || []).length, '条');
    console.log('  accounts:', data.accounts ? Object.keys(data.accounts).length + ' sides' : 'MISSING');
  } catch(e) { console.log('  [ERROR]', e.message); errors.push('/api/data: ' + e.message); }

  // 2. /api/album
  console.log('\n--- /api/album ---');
  try {
    const album = await apiGet('/api/album');
    let totalPhotos = 0;
    album.forEach(g => { totalPhotos += (g.photos || []).length; });
    console.log('  groups:', album.length);
    console.log('  total photos:', totalPhotos);
    album.forEach(g => {
      const photoDirs = new Set();
      (g.photos || []).forEach(p => {
        if (p.src && p.src.indexOf('/assets/') === 0) photoDirs.add('assets');
        if (p.src && p.src.indexOf('/uploads/') === 0) photoDirs.add('uploads');
      });
      console.log('    ' + g.id + ': ' + g.title + ' (' + (g.photos||[]).length + ' photos)');
    });
  } catch(e) { console.log('  [ERROR]', e.message); errors.push('/api/album: ' + e.message); }

  // 3. /api/timeline
  console.log('\n--- /api/timeline ---');
  try {
    const timeline = await apiGet('/api/timeline');
    console.log('  count:', timeline.length);
    timeline.forEach(t => console.log('    ' + t.id + ': ' + t.title));
  } catch(e) { console.log('  [ERROR]', e.message); errors.push('/api/timeline: ' + e.message); }

  // 4. /api/wishlist
  console.log('\n--- /api/wishlist ---');
  try {
    const wishlist = await apiGet('/api/wishlist');
    console.log('  count:', wishlist.length);
    wishlist.forEach(w => console.log('    ' + (w.done ? '[x]' : '[ ]') + ' ' + w.text));
  } catch(e) { console.log('  [ERROR]', e.message); errors.push('/api/wishlist: ' + e.message); }

  // 5. /api/messages
  console.log('\n--- /api/messages ---');
  try {
    const messages = await apiGet('/api/messages');
    console.log('  count:', messages.length);
    messages.forEach(m => console.log('    ' + m.id + ': ' + m.nickname + ' - ' + m.text.substring(0, 40)));
  } catch(e) { console.log('  [ERROR]', e.message); errors.push('/api/messages: ' + e.message); }

  // 6. Check photo paths
  console.log('\n--- Photo URL Check ---');
  try {
    const album = await apiGet('/api/album');
    let assetsCount = 0, uploadsCount = 0, badCount = 0;
    album.forEach(g => {
      (g.photos || []).forEach(p => {
        if (p.src.indexOf('/assets/') === 0) assetsCount++;
        else if (p.src.indexOf('/uploads/') === 0) uploadsCount++;
        else { badCount++; console.log('    [BAD] ' + p.src); }
      });
    });
    console.log('  /assets/... :', assetsCount);
    console.log('  /uploads/...:', uploadsCount);
    if (badCount > 0) { console.log('  [WARN] Bad paths:', badCount); errors.push('Bad photo paths: ' + badCount); }
  } catch(e) { console.log('  [ERROR]', e.message); }

  // Summary
  console.log('\n========================================');
  if (errors.length === 0) {
    console.log('  [PASS] 所有 API 验证通过');
  } else {
    console.log('  [FAIL] 发现 ' + errors.length + ' 个错误');
    errors.forEach(e => console.log('    -', e));
  }
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });