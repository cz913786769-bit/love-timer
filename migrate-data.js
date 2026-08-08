#!/usr/bin/env node
/**
 * 正式历史数据迁移脚本
 * 从 love-data-export-20260808.json 迁移到 SQLite
 * 使用事务保护，全部成功或全部回滚
 * 时间：2026-08-08
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'server-data', 'love.db');
const JSON_PATH = path.join(__dirname, 'love-data-export-20260808.json');

console.log('========================================');
console.log('  正式历史数据迁移');
console.log('  时间：', new Date().toISOString());
console.log('========================================');

// 读取导出数据
const exportData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const data = exportData.data;

// 统计
const stats = {
  albumGroups: 0,
  albumPhotos: 0,
  timeline: 0,
  wishlist: 0,
  messages: 0,
  siteFields: 0,
  coverDone: false,
  letterDone: false,
  accountsUpdated: 0,
  errors: []
};

// 路径标准化
function normalizePath(src) {
  if (!src) return '';
  // /uploads/ 保持不变
  if (src.indexOf('/uploads/') === 0) return src;
  // ../assets/... → /assets/...
  if (src.indexOf('../assets/') === 0) return src.replace('../', '/');
  // 已经是 /assets/ 保持不变
  if (src.indexOf('/assets/') === 0) return src;
  // 其他情况保持不变
  return src;
}

// 打开数据库
const db = new Database(DB_PATH);

// ============================================
// 开始事务
// ============================================
console.log('\n开始事务...');

const beginTransaction = db.prepare('BEGIN TRANSACTION');
beginTransaction.run();

try {
  // ============================================
  // 一、迁移 Album Groups
  // ============================================
  console.log('\n--- 迁移 Album Groups ---');

  const insertGroup = db.prepare(`
    INSERT OR IGNORE INTO album_groups (id, date, title, created_by, created_at)
    VALUES (?, ?, ?, NULL, datetime('now'))
  `);

  const albumData = data.album || [];
  for (let i = 0; i < albumData.length; i++) {
    const group = albumData[i];
    const result = insertGroup.run(group.id, group.date, group.title);
    if (result.changes > 0) {
      stats.albumGroups++;
      console.log('  [OK] 迁移分组:', group.id, '-', group.title);
    } else {
      console.log('  [SKIP] 分组已存在:', group.id);
    }
  }

  // ============================================
  // 二、迁移 Album Photos
  // ============================================
  console.log('\n--- 迁移 Album Photos ---');

  const checkPhoto = db.prepare('SELECT COUNT(*) as cnt FROM album_photos WHERE group_id = ? AND src = ?');
  const insertPhoto = db.prepare(`
    INSERT INTO album_photos (group_id, src, caption, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  for (let i = 0; i < albumData.length; i++) {
    const group = albumData[i];
    const photos = group.photos || [];
    for (let j = 0; j < photos.length; j++) {
      const photo = photos[j];
      const normalizedSrc = normalizePath(photo.src);

      // 检查是否已存在（幂等）
      const existing = checkPhoto.get(group.id, normalizedSrc);
      if (existing.cnt > 0) {
        console.log('  [SKIP] 照片已存在:', group.id, normalizedSrc);
        continue;
      }

      insertPhoto.run(group.id, normalizedSrc, photo.caption || '', j);
      stats.albumPhotos++;
      console.log('  [OK] 迁移照片:', group.id, normalizedSrc);
    }
  }

  // ============================================
  // 三、迁移 Timeline
  // ============================================
  console.log('\n--- 迁移 Timeline ---');

  const insertTimeline = db.prepare(`
    INSERT OR IGNORE INTO timeline (id, date, tag, title, cover, text, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, datetime('now'))
  `);

  const timelineData = data.timeline || [];
  for (let i = 0; i < timelineData.length; i++) {
    const item = timelineData[i];
    const normalizedCover = normalizePath(item.cover || '');
    const result = insertTimeline.run(
      item.id,
      item.date,
      item.tag || '',
      item.title,
      normalizedCover,
      item.text || ''
    );
    if (result.changes > 0) {
      stats.timeline++;
      console.log('  [OK] 迁移Timeline:', item.id, '-', item.title);
    } else {
      console.log('  [SKIP] Timeline已存在:', item.id);
    }
  }

  // ============================================
  // 四、迁移 Wishlist
  // ============================================
  console.log('\n--- 迁移 Wishlist ---');

  const checkWish = db.prepare('SELECT COUNT(*) as cnt FROM wishlist WHERE text = ?');
  const insertWish = db.prepare(`
    INSERT INTO wishlist (text, done, sort_order, created_by, created_at)
    VALUES (?, ?, ?, NULL, datetime('now'))
  `);

  const wishlistData = data.wishlist || [];
  for (let i = 0; i < wishlistData.length; i++) {
    const item = wishlistData[i];
    const existing = checkWish.get(item.text);
    if (existing.cnt > 0) {
      console.log('  [SKIP] Wishlist已存在:', item.text);
      continue;
    }
    insertWish.run(item.text, item.done ? 1 : 0, i);
    stats.wishlist++;
    console.log('  [OK] 迁移Wishlist:', item.text);
  }

  // ============================================
  // 五、Messages - 保留服务器现有数据
  // ============================================
  console.log('\n--- Messages ---');
  const messagesData = data.messages || [];
  if (messagesData.length === 0) {
    console.log('  [INFO] 导出数据中 messages 为空数组，保留服务器现有 2 条留言');
    console.log('  [INFO] 不执行任何 DELETE 或覆盖操作');
  } else {
    const insertMsg = db.prepare(`
      INSERT OR IGNORE INTO messages (id, nickname, text, identity, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (let i = 0; i < messagesData.length; i++) {
      const msg = messagesData[i];
      const result = insertMsg.run(
        msg.id,
        msg.nickname,
        msg.text,
        msg.identity || null,
        msg.createdAt || new Date().toISOString()
      );
      if (result.changes > 0) {
        stats.messages++;
        console.log('  [OK] 迁移Message:', msg.id);
      }
    }
  }

  // ============================================
  // 六、迁移 Site Settings
  // ============================================
  console.log('\n--- 迁移 Site Settings ---');

  const upsertSetting = db.prepare(`
    INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const siteData = data.site || {};
  const siteKeys = Object.keys(siteData);
  for (let i = 0; i < siteKeys.length; i++) {
    const key = siteKeys[i];
    upsertSetting.run('site:' + key, String(siteData[key]));
    stats.siteFields++;
    console.log('  [OK] Site:', key, '=', String(siteData[key]).substring(0, 40));
  }

  // ============================================
  // 七、迁移 Cover
  // ============================================
  console.log('\n--- 迁移 Cover ---');

  const coverValue = normalizePath(data.cover || '');
  upsertSetting.run('cover', coverValue);
  stats.coverDone = true;
  console.log('  [OK] Cover 已保存到 site_settings:', coverValue);

  // ============================================
  // 八、迁移 Letter
  // ============================================
  console.log('\n--- 迁移 Letter ---');

  const letterData = data.letter;
  if (letterData) {
    upsertSetting.run('letter', JSON.stringify(letterData));
    stats.letterDone = true;
    console.log('  [OK] Letter 已保存到 site_settings (JSON)');
  } else {
    console.log('  [WARN] 导出数据中无 letter');
  }

  // ============================================
  // 九、Accounts - 仅补充 nickname/avatar
  // ============================================
  console.log('\n--- 迁移 Accounts ---');

  const currentAccounts = db.prepare('SELECT * FROM accounts').all();
  const accountMap = {};
  currentAccounts.forEach(function(a) { accountMap[a.side] = a; });

  console.log('  当前服务器账户:');
  console.log('    left:', accountMap.left ? accountMap.left.nickname : '(不存在)');
  console.log('    right:', accountMap.right ? accountMap.right.nickname : '(不存在)');

  const avatarsData = data.avatars || {};

  for (let side = 0; side < 2; side++) {
    const sideKey = side === 0 ? 'left' : 'right';
    const current = accountMap[sideKey];
    const exported = avatarsData[sideKey];

    if (!current || !exported) {
      console.log('  [SKIP]', sideKey, '- 缺少数据');
      continue;
    }

    let nicknameChanged = false;
    let avatarChanged = false;

    if (exported.name && exported.name !== current.nickname) {
      console.log('  [DIFF]', sideKey, 'nickname: 服务器=' + current.nickname + ', 导出=' + exported.name);
      nicknameChanged = true;
    }

    if (exported.dataUrl && exported.dataUrl !== current.avatar && exported.dataUrl !== '' && current.avatar === '') {
      console.log('  [DIFF]', sideKey, 'avatar: 服务器为空, 导出有值');
      avatarChanged = true;
    }

    if (nicknameChanged || avatarChanged) {
      console.log('  [WARN]', sideKey, '- 存在差异，保留服务器 bcrypt hash，不覆盖 nickname/avatar');
      console.log('  [INFO] 如需更新，请手动在管理后台操作');
    } else {
      console.log('  [OK]', sideKey, '- 账户信息一致，无需更新');
    }
  }

  console.log('  [OK] 所有账户的 password_hash (bcrypt) 保持不变');

  // ============================================
  // 十、验证迁移结果
  // ============================================
  console.log('\n========================================');
  console.log('  迁移后数据库验证');
  console.log('========================================');

  const counts = {
    albumGroups: db.prepare('SELECT COUNT(*) as c FROM album_groups').get().c,
    albumPhotos: db.prepare('SELECT COUNT(*) as c FROM album_photos').get().c,
    timeline: db.prepare('SELECT COUNT(*) as c FROM timeline').get().c,
    wishlist: db.prepare('SELECT COUNT(*) as c FROM wishlist').get().c,
    messages: db.prepare('SELECT COUNT(*) as c FROM messages').get().c,
    accounts: db.prepare('SELECT COUNT(*) as c FROM accounts').get().c,
    siteSettings: db.prepare('SELECT COUNT(*) as c FROM site_settings').get().c
  };

  console.log('  album_groups:', counts.albumGroups, '(预期: 15 = 14历史 + 1测试)');
  console.log('  album_photos:', counts.albumPhotos, '(预期: 59 = 57历史 + 2测试)');
  console.log('  timeline:', counts.timeline, '(预期: 14)');
  console.log('  wishlist:', counts.wishlist, '(预期: 3)');
  console.log('  messages:', counts.messages, '(预期: 2)');
  console.log('  accounts:', counts.accounts, '(预期: 2)');
  console.log('  site_settings:', counts.siteSettings, '(预期: 17 = 15 site + cover + letter)');

  const coverSetting = db.prepare("SELECT value FROM site_settings WHERE key='cover'").get();
  const letterSetting = db.prepare("SELECT value FROM site_settings WHERE key='letter'").get();

  console.log('\n  cover 存在:', !!coverSetting);
  console.log('  letter 存在:', !!letterSetting);

  const photoPaths = db.prepare("SELECT src FROM album_photos WHERE src LIKE '/assets/%'").all();
  console.log('  静态照片路径 (/assets/...):', photoPaths.length, '张');

  const uploadPaths = db.prepare("SELECT src FROM album_photos WHERE src LIKE '/uploads/%'").all();
  console.log('  上传照片路径 (/uploads/...):', uploadPaths.length, '张');

  const badPaths = db.prepare("SELECT src FROM album_photos WHERE src LIKE '../assets/%'").all();
  if (badPaths.length > 0) {
    console.log('  [ERROR] 发现未标准化的路径:', badPaths.length, '条');
    badPaths.forEach(function(p) { console.log('    ', p.src); });
    stats.errors.push('存在未标准化的照片路径');
  }

  let hasErrors = false;

  if (counts.albumGroups !== 15) {
    stats.errors.push('album_groups 数量不匹配: ' + counts.albumGroups + ' != 15');
    hasErrors = true;
  }
  if (counts.albumPhotos !== 59) {
    stats.errors.push('album_photos 数量不匹配: ' + counts.albumPhotos + ' != 59');
    hasErrors = true;
  }
  if (counts.timeline !== 14) {
    stats.errors.push('timeline 数量不匹配: ' + counts.timeline + ' != 14');
    hasErrors = true;
  }
  if (counts.wishlist !== 3) {
    stats.errors.push('wishlist 数量不匹配: ' + counts.wishlist + ' != 3');
    hasErrors = true;
  }
  if (counts.messages !== 2) {
    stats.errors.push('messages 数量不匹配: ' + counts.messages + ' != 2');
    hasErrors = true;
  }
  if (counts.accounts !== 2) {
    stats.errors.push('accounts 数量不匹配: ' + counts.accounts + ' != 2');
    hasErrors = true;
  }
  if (!coverSetting) {
    stats.errors.push('cover 未保存');
    hasErrors = true;
  }
  if (!letterSetting) {
    stats.errors.push('letter 未保存');
    hasErrors = true;
  }

  if (hasErrors) {
    console.log('\n========================================');
    console.log('  [FAIL] 验证失败，执行 ROLLBACK');
    console.log('========================================');
    console.log('  错误列表:');
    stats.errors.forEach(function(e) { console.log('    -', e); });
    db.prepare('ROLLBACK').run();
    db.close();
    process.exit(1);
  }

  // ============================================
  // 全部验证通过，提交事务
  // ============================================
  console.log('\n========================================');
  console.log('  [OK] 全部验证通过，执行 COMMIT');
  console.log('========================================');

  db.prepare('COMMIT').run();
  db.close();

  console.log('\n========================================');
  console.log('  迁移成功完成！');
  console.log('========================================');
  console.log('  迁移统计:');
  console.log('    album_groups:', stats.albumGroups, '(新增)');
  console.log('    album_photos:', stats.albumPhotos, '(新增)');
  console.log('    timeline:', stats.timeline, '(新增)');
  console.log('    wishlist:', stats.wishlist, '(新增)');
  console.log('    messages:', stats.messages, '(新增)');
  console.log('    site_fields:', stats.siteFields, '(新增)');
  console.log('    cover:', stats.coverDone ? '已保存' : '未保存');
  console.log('    letter:', stats.letterDone ? '已保存' : '未保存');
  console.log('    accounts:', '保留原 bcrypt hash');
  console.log('    photo路径标准化:', '已统一为 /assets/...');
  console.log('    messages服务器数据:', '已保留');
  console.log('    测试数据:', '未覆盖');
  console.log('========================================');

} catch (err) {
  console.log('\n========================================');
  console.log('  [FAIL] 迁移过程出错，执行 ROLLBACK');
  console.log('========================================');
  console.log('  错误:', err.message);
  console.log('  堆栈:', err.stack);
  stats.errors.push(err.message);

  try {
    db.prepare('ROLLBACK').run();
    console.log('  ROLLBACK 完成，数据库未修改');
  } catch (e) {
    console.log('  ROLLBACK 失败:', e.message);
  }

  db.close();
  process.exit(1);
}