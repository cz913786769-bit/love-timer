/* 恋爱小站 - 后端 API 服务器（纯 API 模式 v2.1）
 * SQLite + bcrypt + HttpOnly Cookie Session + rate-limit + 安全上传
 * 独立部署：不依赖前端静态文件，仅提供 /api/* 和 /uploads/*
 */
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const xss = require('xss');

/* ================================================================
   配置
   ================================================================ */
const PORT = parseInt(process.env.PORT, 10) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// 安全要求：生产环境必须设置 SESSION_SECRET，不允许默认值
const SESSION_SECRET = IS_PROD ? process.env.SESSION_SECRET : (process.env.SESSION_SECRET || 'dev-secret-change-me');

const DB_PATH = path.resolve(process.env.DB_PATH || 'server-data/love.db');
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || 'server-data/uploads');
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE, 10) || 10 * 1024 * 1024;
const BACKUP_RETENTION = parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30;
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

/* ================================================================
   启动前安全校验
   ================================================================ */
function validateEnv() {
  const errors = [];

  if (IS_PROD && !SESSION_SECRET) {
    errors.push('SESSION_SECRET 未设置（生产环境必须提供）');
  }

  if (!process.env.ADMIN_LEFT_PASSWORD_HASH) {
    errors.push('ADMIN_LEFT_PASSWORD_HASH 未设置');
  }
  if (!process.env.ADMIN_RIGHT_PASSWORD_HASH) {
    errors.push('ADMIN_RIGHT_PASSWORD_HASH 未设置');
  }

  if (errors.length > 0) {
    console.error('');
    console.error('  ⛔ 安全校验失败：缺少必要的环境变量');
    console.error('  ─────────────────────────────');
    errors.forEach(e => console.error('  • ' + e));
    console.error('  ─────────────────────────────');
    console.error('  请参考 .env.example 配置所有必需的环境变量。');
    console.error('  生产环境不允许使用默认密码或默认密钥。');
    console.error('');
    process.exit(1);
  }
}
validateEnv();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const DATA_DIR = path.dirname(DB_PATH);
[UPLOADS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/* ================================================================
   CORS
   ================================================================ */
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!IS_PROD || !origin) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS: Not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

/* ================================================================
   SQLite 数据库
   ================================================================ */
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    text TEXT NOT NULL,
    identity TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS album_groups (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    created_by TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS album_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL REFERENCES album_groups(id) ON DELETE CASCADE,
    src TEXT NOT NULL,
    caption TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_by TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS timeline (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    tag TEXT DEFAULT '',
    title TEXT NOT NULL,
    cover TEXT DEFAULT '',
    text TEXT NOT NULL,
    created_by TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS accounts (
    side TEXT PRIMARY KEY CHECK(side IN ('left','right')),
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    side TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_album_photos_group ON album_photos(group_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

/* ================================================================
   数据迁移（JSON → SQLite）
   ================================================================ */
const LEGACY_DATA_FILE = path.join(DATA_DIR, 'data.json');

function migrateFromJSON() {
  if (!fs.existsSync(LEGACY_DATA_FILE)) return;
  const count = db.prepare('SELECT COUNT(*) as c FROM accounts').get();
  if (count && count.c > 0) {
    console.log('[迁移] 数据库已有数据，跳过 JSON 迁移');
    return;
  }
  console.log('[迁移] 检测到 data.json，开始迁移到 SQLite...');
  let raw;
  try { raw = JSON.parse(fs.readFileSync(LEGACY_DATA_FILE, 'utf-8')); } catch (e) {
    console.error('[迁移] 读取 JSON 失败:', e.message);
    return;
  }
  const migrate = db.transaction(() => {
    if (raw.accounts) {
      const insertAcc = db.prepare('INSERT OR REPLACE INTO accounts (side, password_hash, nickname, avatar) VALUES (?, ?, ?, ?)');
      for (const side of ['left', 'right']) {
        const a = raw.accounts[side] || {};
        // 安全要求：不使用硬编码默认密码，data.json 中无密码则跳过该账户
        if (!a.password) {
          console.log('[迁移] 跳过 ' + side + ' 账户（无密码）');
          continue;
        }
        const pwd = a.password;
        insertAcc.run(side, bcrypt.hashSync(pwd, BCRYPT_ROUNDS), a.nickname || '', a.avatar || '');
      }
    }
    if (Array.isArray(raw.messages)) {
      const insert = db.prepare('INSERT OR IGNORE INTO messages (id, nickname, text, identity, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const m of raw.messages) {
        insert.run(m.id, m.nickname || '', m.text || '', m.identity || null, m.createdAt || new Date().toISOString());
      }
    }
    if (Array.isArray(raw.album)) {
      const insG = db.prepare('INSERT OR IGNORE INTO album_groups (id, date, title, created_by, created_at) VALUES (?, ?, ?, ?, ?)');
      const insP = db.prepare('INSERT INTO album_photos (group_id, src, caption, sort_order) VALUES (?, ?, ?, ?)');
      for (const g of raw.album) {
        insG.run(g.id, g.date || '', g.title || '', g.createdBy || null, g.createdAt || new Date().toISOString());
        if (Array.isArray(g.photos)) {
          g.photos.forEach((p, i) => insP.run(g.id, p.src || '', p.caption || '', i));
        }
      }
    }
    if (Array.isArray(raw.wishlist)) {
      const insert = db.prepare('INSERT INTO wishlist (text, done, created_by, created_at, sort_order) VALUES (?, ?, ?, ?, ?)');
      raw.wishlist.forEach((w, i) => {
        insert.run(w.text || '', w.done ? 1 : 0, w.createdBy || null, w.createdAt || new Date().toISOString(), i);
      });
    }
    if (Array.isArray(raw.timeline)) {
      const insert = db.prepare('INSERT OR IGNORE INTO timeline (id, date, tag, title, cover, text, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const t of raw.timeline) {
        insert.run(t.id, t.date || '', t.tag || '', t.title || '', t.cover || '', t.text || '', t.createdBy || null, t.createdAt || new Date().toISOString());
      }
    }
    if (raw.site && typeof raw.site === 'object') {
      const insert = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
      for (const [k, v] of Object.entries(raw.site)) {
        if (v != null) insert.run(k, String(v));
      }
    }
    if (raw.cover) {
      db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('cover', raw.cover);
    }
    if (raw.letter && typeof raw.letter === 'object') {
      db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('letter', JSON.stringify(raw.letter));
    }
  });
  try {
    migrate();
    const bak = LEGACY_DATA_FILE.replace('.json', '.json.migrated');
    fs.renameSync(LEGACY_DATA_FILE, bak);
    console.log('[迁移] 数据迁移完成，旧文件已重命名为:', bak);
  } catch (e) {
    console.error('[迁移] 迁移失败:', e.message);
    throw e;
  }
}

function initAccounts() {
  const count = db.prepare('SELECT COUNT(*) as c FROM accounts').get();
  if (count && count.c > 0) return;
  console.log('[初始化] 创建默认管理员账户...');
  // 安全要求：仅使用环境变量中预计算的 bcrypt 哈希，不接收明文密码
  const leftHash = process.env.ADMIN_LEFT_PASSWORD_HASH;
  const rightHash = process.env.ADMIN_RIGHT_PASSWORD_HASH;
  if (!leftHash || !rightHash) {
    console.error('[初始化] 缺少 ADMIN_LEFT_PASSWORD_HASH 或 ADMIN_RIGHT_PASSWORD_HASH，无法创建账户');
    console.error('[初始化] 请生成 bcrypt 哈希并设置环境变量后重启');
    return;
  }
  const insert = db.prepare('INSERT INTO accounts (side, password_hash, nickname, avatar) VALUES (?, ?, ?, ?)');
  insert.run('left', leftHash, '嘉嘉小星星', '');
  insert.run('right', rightHash, '陈卓卓', '');
  console.log('[初始化] 默认账户已创建（使用 bcrypt 哈希）');
}

migrateFromJSON();
initAccounts();

/* ================================================================
   存储服务抽象
   ================================================================ */
const storageService = {
  save(file) { return '/uploads/' + file.filename; },
  getUrl(relativePath) { return relativePath; },
  async delete(relativePath) {
    const filePath = path.join(UPLOADS_DIR, path.basename(relativePath));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

/* ================================================================
   Multer 安全上传
   ================================================================ */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) return cb(new Error('不支持的文件类型'));
      const name = Date.now().toString(36) + '-' + crypto.randomBytes(8).toString('hex') + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) return cb(new Error('只允许上传 jpg、jpeg、png、webp 格式的图片'));
    cb(null, true);
  }
});

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/* ================================================================
   Express 应用（纯 API 模式）
   ================================================================ */
const app = express();
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// 静态文件（仅上传目录，供照片访问；不提供前端 HTML）
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '365d', immutable: true }));

/* ================================================================
   Rate Limiters
   ================================================================ */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: '登录尝试过于频繁，请 15 分钟后再试' },
  standardHeaders: true, legacyHeaders: false
});
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: { error: '留言提交过于频繁，请稍后再试' },
  standardHeaders: true, legacyHeaders: false
});
const adminWriteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true, legacyHeaders: false
});

/* ================================================================
   Session 管理
   ================================================================ */
function generateSessionToken() { return crypto.randomBytes(32).toString('hex'); }
function createSession(side) {
  const token = generateSessionToken();
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token, side, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, side, now, now + SESSION_MAX_AGE);
  return token;
}
function getSession(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now());
  return row || null;
}
function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
setInterval(() => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}, 60 * 60 * 1000);

/* ================================================================
   Auth 中间件
   ================================================================ */
function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.auth_token;
  const session = getSession(token);
  if (!session) return res.status(401).json({ error: '请先登录' });
  req.userIdentity = session.side;
  next();
}

/* ================================================================
   输入校验
   ================================================================ */
const MAX_LENGTHS = {
  nickname: 30, message: 2000, albumTitle: 100, photoCaption: 200,
  wishlistText: 200, timelineTitle: 100, timelineTag: 30, timelineText: 5000,
  timelineCover: 500, siteValue: 200, letterGreeting: 50, letterSign: 50,
  letterParagraph: 500, letterDate: 50, password: 100
};
function sanitize(str) {
  if (!str) return '';
  return xss(String(str).trim(), { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] });
}

/* ================================================================
   API 路由
   ================================================================ */

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), db: 'sqlite' });
});

// 认证
app.post('/api/login', loginLimiter, (req, res) => {
  const { side, password } = req.body;
  if (!side || !password) return res.status(400).json({ error: '缺少身份或密码' });
  if (!['left', 'right'].includes(side)) return res.status(400).json({ error: '无效身份' });
  const acc = db.prepare('SELECT * FROM accounts WHERE side = ?').get(side);
  if (!acc) return res.status(401).json({ error: '账户不存在' });
  const valid = bcrypt.compareSync(password, acc.password_hash);
  if (!valid) return res.status(401).json({ error: '密码不正确' });
  const token = createSession(side);
  // Host-only Cookie + SameSite=Lax：同站（www/api 同属 xiaoxingxing.love）自动携带
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'lax' : 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/'
  });
  res.json({ success: true, side, nickname: acc.nickname, avatar: acc.avatar });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies && req.cookies.auth_token;
  destroySession(token);
  res.clearCookie('auth_token', { path: '/' });
  res.json({ success: true });
});

app.get('/api/session', (req, res) => {
  const token = req.cookies && req.cookies.auth_token;
  const session = getSession(token);
  if (!session) return res.json({ loggedIn: false });
  const acc = db.prepare('SELECT nickname, avatar FROM accounts WHERE side = ?').get(session.side);
  res.json({ loggedIn: true, side: session.side, nickname: acc ? acc.nickname : '', avatar: acc ? acc.avatar : '' });
});

// 数据
app.get('/api/data', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  const albumGroups = db.prepare('SELECT * FROM album_groups ORDER BY date').all();
  const album = albumGroups.map(g => ({
    ...g, photos: db.prepare('SELECT src, caption FROM album_photos WHERE group_id = ? ORDER BY sort_order').all(g.id)
  }));
  const wishlist = db.prepare('SELECT * FROM wishlist ORDER BY sort_order').all().map(w => ({
    text: w.text, done: !!w.done, createdBy: w.created_by, createdAt: w.created_at
  }));
  const timeline = db.prepare('SELECT * FROM timeline ORDER BY date').all();
  const settings = {};
  db.prepare('SELECT * FROM site_settings').all().forEach(r => { settings[r.key] = r.value; });
  const cover = settings.cover || '';
  let letter = {};
  if (settings.letter) { try { letter = JSON.parse(settings.letter); } catch (e) { letter = {}; } }
  const accounts = {};
  db.prepare('SELECT side, nickname, avatar FROM accounts').all().forEach(a => {
    accounts[a.side] = { nickname: a.nickname, avatar: a.avatar };
  });
  delete settings.cover; delete settings.letter;
  res.json({ messages, album, wishlist, timeline, site: settings, cover, letter, accounts });
});

// 留言
app.get('/api/messages', (req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all());
});
app.post('/api/messages', authMiddleware, messageLimiter, (req, res) => {
  let { nickname, text } = req.body;
  nickname = sanitize(nickname).slice(0, MAX_LENGTHS.nickname);
  text = sanitize(text).slice(0, MAX_LENGTHS.message);
  if (!nickname || !text) return res.status(400).json({ error: '昵称和留言不能为空' });
  const id = 'msg-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO messages (id, nickname, text, identity, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, nickname, text, req.userIdentity, now);
  res.json({ id, nickname, text, identity: req.userIdentity, createdAt: now });
});
app.delete('/api/messages/:id', authMiddleware, adminWriteLimiter, (req, res) => {
  const result = db.prepare('DELETE FROM messages WHERE id = ?').run(sanitize(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: '留言不存在' });
  res.json({ success: true });
});

// 相册
app.get('/api/album', (req, res) => {
  const groups = db.prepare('SELECT * FROM album_groups ORDER BY date').all();
  res.json(groups.map(g => ({
    ...g, photos: db.prepare('SELECT src, caption FROM album_photos WHERE group_id = ? ORDER BY sort_order').all(g.id)
  })));
});
app.post('/api/album/group', authMiddleware, adminWriteLimiter, (req, res) => {
  let { date, title } = req.body;
  date = sanitize(date).slice(0, 20); title = sanitize(title).slice(0, MAX_LENGTHS.albumTitle);
  if (!date || !title) return res.status(400).json({ error: '日期和标题不能为空' });
  const id = 'album-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO album_groups (id, date, title, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, date, title, req.userIdentity, now);
  res.json({ id, date, title, photos: [], createdBy: req.userIdentity, createdAt: now });
});
app.delete('/api/album/group/:id', authMiddleware, adminWriteLimiter, (req, res) => {
  const id = sanitize(req.params.id);
  const photos = db.prepare('SELECT src FROM album_photos WHERE group_id = ?').all(id);
  photos.forEach(p => storageService.delete(p.src).catch(() => {}));
  const result = db.prepare('DELETE FROM album_groups WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: '分组不存在' });
  res.json({ success: true });
});
app.post('/api/album/photo', authMiddleware, adminWriteLimiter, upload.single('photo'), (req, res) => {
  let { groupId, caption } = req.body;
  groupId = sanitize(groupId); caption = sanitize(caption).slice(0, MAX_LENGTHS.photoCaption);
  if (!groupId || !req.file) return res.status(400).json({ error: '缺少分组ID或照片' });
  const group = db.prepare('SELECT id FROM album_groups WHERE id = ?').get(groupId);
  if (!group) { try { fs.unlinkSync(req.file.path); } catch (e) {} return res.status(404).json({ error: '分组不存在' }); }
  const src = storageService.save(req.file);
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM album_photos WHERE group_id = ?').get(groupId);
  db.prepare('INSERT INTO album_photos (group_id, src, caption, sort_order) VALUES (?, ?, ?, ?)')
    .run(groupId, src, caption, (maxOrder.m || 0) + 1);
  res.json({ src, caption });
});
app.delete('/api/album/photo', authMiddleware, adminWriteLimiter, (req, res) => {
  const { groupId, photoSrc } = req.body;
  storageService.delete(photoSrc).catch(() => {});
  db.prepare('DELETE FROM album_photos WHERE group_id = ? AND src = ?').run(sanitize(groupId), sanitize(photoSrc));
  res.json({ success: true });
});

// 清单
app.get('/api/wishlist', (req, res) => {
  res.json(db.prepare('SELECT * FROM wishlist ORDER BY sort_order').all().map(w => ({
    text: w.text, done: !!w.done, createdBy: w.created_by, createdAt: w.created_at
  })));
});
app.post('/api/wishlist', authMiddleware, adminWriteLimiter, (req, res) => {
  let { text } = req.body;
  text = sanitize(text).slice(0, MAX_LENGTHS.wishlistText);
  if (!text) return res.status(400).json({ error: '内容不能为空' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM wishlist').get();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO wishlist (text, done, created_by, created_at, sort_order) VALUES (?, 0, ?, ?, ?)')
    .run(text, req.userIdentity, now, (maxOrder.m || 0) + 1);
  res.json({ text, done: false, createdBy: req.userIdentity, createdAt: now });
});
app.put('/api/wishlist/:index', authMiddleware, adminWriteLimiter, (req, res) => {
  const idx = parseInt(sanitize(req.params.index), 10);
  const items = db.prepare('SELECT rowid, * FROM wishlist ORDER BY sort_order').all();
  if (isNaN(idx) || idx < 0 || idx >= items.length) return res.status(404).json({ error: '事项不存在' });
  const target = items[idx];
  if (req.body.done !== undefined) { db.prepare('UPDATE wishlist SET done = ? WHERE rowid = ?').run(req.body.done ? 1 : 0, target.rowid); }
  if (req.body.text) { db.prepare('UPDATE wishlist SET text = ? WHERE rowid = ?').run(sanitize(req.body.text).slice(0, MAX_LENGTHS.wishlistText), target.rowid); }
  res.json({ success: true });
});
app.delete('/api/wishlist/:index', authMiddleware, adminWriteLimiter, (req, res) => {
  const idx = parseInt(sanitize(req.params.index), 10);
  const items = db.prepare('SELECT rowid, * FROM wishlist ORDER BY sort_order').all();
  if (isNaN(idx) || idx < 0 || idx >= items.length) return res.status(404).json({ error: '事项不存在' });
  db.prepare('DELETE FROM wishlist WHERE rowid = ?').run(items[idx].rowid);
  res.json({ success: true });
});

// 点滴
app.get('/api/timeline', (req, res) => {
  res.json(db.prepare('SELECT * FROM timeline ORDER BY date').all());
});
app.post('/api/timeline', authMiddleware, adminWriteLimiter, (req, res) => {
  let { date, tag, title, cover, text } = req.body;
  date = sanitize(date).slice(0, 20); tag = sanitize(tag).slice(0, MAX_LENGTHS.timelineTag);
  title = sanitize(title).slice(0, MAX_LENGTHS.timelineTitle); cover = sanitize(cover).slice(0, MAX_LENGTHS.timelineCover);
  text = sanitize(text).slice(0, MAX_LENGTHS.timelineText);
  if (!date || !title || !text) return res.status(400).json({ error: '日期、标题和内容不能为空' });
  const id = 't-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO timeline (id, date, tag, title, cover, text, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, date, tag, title, cover, text, req.userIdentity, now);
  res.json({ id, date, tag, title, cover, text, createdBy: req.userIdentity, createdAt: now });
});
app.delete('/api/timeline/:id', authMiddleware, adminWriteLimiter, (req, res) => {
  const result = db.prepare('DELETE FROM timeline WHERE id = ?').run(sanitize(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: '点滴不存在' });
  res.json({ success: true });
});

// 网站设置
app.get('/api/site', (req, res) => {
  const settings = {};
  db.prepare("SELECT * FROM site_settings WHERE key NOT IN ('cover','letter')").all().forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});
app.post('/api/site', authMiddleware, adminWriteLimiter, (req, res) => {
  const insert = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  const txn = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (k === 'cover' || k === 'letter') continue;
      const val = sanitize(String(v)).slice(0, MAX_LENGTHS.siteValue);
      insert.run(k, val);
    }
  });
  txn(req.body); res.json({ success: true });
});

// 封面
app.get('/api/cover', (req, res) => {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'cover'").get();
  res.json({ cover: row ? row.value : '' });
});
app.post('/api/cover', authMiddleware, adminWriteLimiter, upload.single('cover'), (req, res) => {
  let coverUrl;
  if (req.file) { coverUrl = storageService.save(req.file); }
  else if (req.body.url) { coverUrl = sanitize(req.body.url).slice(0, 500); }
  if (coverUrl) { db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('cover', ?)").run(coverUrl); }
  res.json({ cover: coverUrl });
});

// 信件
app.get('/api/letter', (req, res) => {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'letter'").get();
  let letter = {};
  if (row) { try { letter = JSON.parse(row.value); } catch (e) { letter = {}; } }
  res.json(letter);
});
app.post('/api/letter', authMiddleware, adminWriteLimiter, (req, res) => {
  let { greeting, signOff, dateText, paragraphs } = req.body;
  const letter = {
    greeting: sanitize(greeting).slice(0, MAX_LENGTHS.letterGreeting),
    signOff: sanitize(signOff).slice(0, MAX_LENGTHS.letterSign),
    dateText: sanitize(dateText).slice(0, MAX_LENGTHS.letterDate),
    paragraphs: Array.isArray(paragraphs) ? paragraphs.map(p => sanitize(p).slice(0, MAX_LENGTHS.letterParagraph)) : []
  };
  db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('letter', ?)").run(JSON.stringify(letter));
  res.json(letter);
});

// 账户管理
app.get('/api/accounts', (req, res) => {
  const accounts = {};
  db.prepare('SELECT side, nickname, avatar FROM accounts').all().forEach(a => {
    accounts[a.side] = { nickname: a.nickname, avatar: a.avatar };
  });
  res.json(accounts);
});
app.put('/api/accounts/:side', authMiddleware, adminWriteLimiter, (req, res) => {
  const { side } = req.params;
  if (!['left', 'right'].includes(side)) return res.status(400).json({ error: '无效身份' });
  const updates = {};
  if (req.body.nickname) updates.nickname = sanitize(req.body.nickname).slice(0, MAX_LENGTHS.nickname);
  if (req.body.avatar) updates.avatar = sanitize(req.body.avatar).slice(0, 500);
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无更新内容' });
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(updates); vals.push(side);
  db.prepare(`UPDATE accounts SET ${sets} WHERE side = ?`).run(...vals);
  const acc = db.prepare('SELECT nickname, avatar FROM accounts WHERE side = ?').get(side);
  res.json(acc);
});
app.post('/api/accounts/:side/password', authMiddleware, adminWriteLimiter, (req, res) => {
  const { side } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '密码不能为空' });
  if (password.length > MAX_LENGTHS.password) return res.status(400).json({ error: '密码过长' });
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  db.prepare('UPDATE accounts SET password_hash = ? WHERE side = ?').run(hash, side);
  res.json({ success: true });
});

// 头像上传
app.post('/api/upload/avatar', authMiddleware, adminWriteLimiter, upload.single('avatar'), (req, res) => {
  const { side } = req.body;
  if (!req.file) return res.status(400).json({ error: '缺少头像文件' });
  const url = storageService.save(req.file);
  if (side && ['left', 'right'].includes(side)) { db.prepare('UPDATE accounts SET avatar = ? WHERE side = ?').run(url, side); }
  res.json({ url });
});

// 通用上传
app.post('/api/upload', authMiddleware, adminWriteLimiter, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '缺少文件' });
  res.json({ url: storageService.save(req.file) });
});

// Multer 错误处理
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: '文件过大，最大支持 10MB' });
    return res.status(400).json({ error: '上传失败: ' + err.message });
  }
  if (err) {
    if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    return res.status(400).json({ error: err.message });
  }
  next();
});

// 备份与恢复
app.get('/api/export', authMiddleware, (req, res) => {
  const data = {
    messages: db.prepare('SELECT * FROM messages').all(),
    album: db.prepare('SELECT * FROM album_groups').all().map(g => ({
      ...g, photos: db.prepare('SELECT src, caption FROM album_photos WHERE group_id = ? ORDER BY sort_order').all(g.id)
    })),
    wishlist: db.prepare('SELECT * FROM wishlist ORDER BY sort_order').all(),
    timeline: db.prepare('SELECT * FROM timeline').all(),
    site: {}, letter: {}
  };
  db.prepare('SELECT * FROM site_settings').all().forEach(r => {
    if (r.key === 'cover') data.cover = r.value;
    else if (r.key === 'letter') { try { data.letter = JSON.parse(r.value); } catch (e) {} }
    else { data.site[r.key] = r.value; }
  });
  data.accounts = {};
  db.prepare('SELECT side, nickname, avatar FROM accounts').all().forEach(a => {
    data.accounts[a.side] = { nickname: a.nickname, avatar: a.avatar };
  });
  res.json({ version: 2, exportedAt: new Date().toISOString(), data });
});
app.post('/api/import', authMiddleware, adminWriteLimiter, (req, res) => {
  const { data: imported } = req.body;
  if (!imported) return res.status(400).json({ error: '缺少数据' });
  const txn = db.transaction(() => {
    if (Array.isArray(imported.messages)) {
      db.prepare('DELETE FROM messages').run();
      const ins = db.prepare('INSERT INTO messages (id, nickname, text, identity, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const m of imported.messages) ins.run(m.id, m.nickname, m.text, m.identity || null, m.created_at);
    }
    if (Array.isArray(imported.wishlist)) {
      db.prepare('DELETE FROM wishlist').run();
      const ins = db.prepare('INSERT INTO wishlist (text, done, created_by, created_at, sort_order) VALUES (?, ?, ?, ?, ?)');
      imported.wishlist.forEach((w, i) => ins.run(w.text, w.done ? 1 : 0, w.created_by || null, w.created_at, i));
    }
    if (Array.isArray(imported.timeline)) {
      db.prepare('DELETE FROM timeline').run();
      const ins = db.prepare('INSERT INTO timeline (id, date, tag, title, cover, text, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const t of imported.timeline) ins.run(t.id, t.date, t.tag, t.title, t.cover, t.text, t.created_by || null, t.created_at);
    }
    if (imported.album) {
      db.prepare('DELETE FROM album_photos').run(); db.prepare('DELETE FROM album_groups').run();
      const insG = db.prepare('INSERT INTO album_groups (id, date, title, created_by, created_at) VALUES (?, ?, ?, ?, ?)');
      const insP = db.prepare('INSERT INTO album_photos (group_id, src, caption, sort_order) VALUES (?, ?, ?, ?)');
      for (const g of imported.album) {
        insG.run(g.id, g.date, g.title, g.created_by || null, g.created_at);
        if (Array.isArray(g.photos)) g.photos.forEach((p, i) => insP.run(g.id, p.src, p.caption, i));
      }
    }
    if (imported.site) {
      const ins = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
      for (const [k, v] of Object.entries(imported.site)) { if (k === 'cover' || k === 'letter') continue; ins.run(k, String(v)); }
    }
    if (imported.cover) { db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('cover', ?)").run(imported.cover); }
    if (imported.letter) { db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('letter', ?)").run(JSON.stringify(imported.letter)); }
  });
  try { txn(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: '导入失败: ' + e.message }); }
});
app.post('/api/reset', authMiddleware, adminWriteLimiter, (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM messages').run(); db.prepare('DELETE FROM album_photos').run();
    db.prepare('DELETE FROM album_groups').run(); db.prepare('DELETE FROM wishlist').run();
    db.prepare('DELETE FROM timeline').run();
    db.prepare("DELETE FROM site_settings WHERE key NOT IN ('cover','letter')").run();
  })();
  res.json({ success: true });
});

// 检查更新（轮询用）
app.get('/api/check-updates', (req, res) => {
  const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
  const albumCount = db.prepare('SELECT COUNT(*) as c FROM album_groups').get().c;
  const photoCount = db.prepare('SELECT COUNT(*) as c FROM album_photos').get().c;
  const wishlistCount = db.prepare('SELECT COUNT(*) as c FROM wishlist').get().c;
  const wishlistDone = db.prepare('SELECT COUNT(*) as c FROM wishlist WHERE done = 1').get().c;
  const timelineCount = db.prepare('SELECT COUNT(*) as c FROM timeline').get().c;
  const latestMsg = db.prepare('SELECT created_at FROM messages ORDER BY created_at DESC LIMIT 1').get();
  const latestTimeline = db.prepare('SELECT created_at FROM timeline ORDER BY created_at DESC LIMIT 1').get();
  const cover = db.prepare("SELECT value FROM site_settings WHERE key = 'cover'").get();
  const siteCount = db.prepare("SELECT COUNT(*) as c FROM site_settings WHERE key NOT IN ('cover','letter')").get().c;
  const hash = crypto.createHash('md5')
    .update(JSON.stringify({
      msgCount, albumCount, photoCount, wishlistCount, wishlistDone, timelineCount,
      latestMsg: latestMsg ? latestMsg.created_at : '',
      latestTimeline: latestTimeline ? latestTimeline.created_at : '',
      cover: cover ? cover.value : '',
      siteCount
    }))
    .digest('hex');
  res.json({ hash, messageCount: msgCount, albumCount, serverTime: Date.now() });
});

// 404（纯 API 模式，不提供前端静态文件）
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/* ================================================================
   启动服务器（仅监听 127.0.0.1，由 Nginx 反向代理）
   ================================================================ */
const LISTEN_HOST = IS_PROD ? '127.0.0.1' : '0.0.0.0';

app.listen(PORT, LISTEN_HOST, () => {
  console.log('');
  console.log('  ❤️  恋爱小站 API 服务器 v2.1（纯 API 模式）');
  console.log('  ─────────────────────────────');
  console.log('  环境:       ' + NODE_ENV);
  console.log('  监听地址:   ' + LISTEN_HOST + ':' + PORT);
  console.log('  数据库:     SQLite (' + DB_PATH + ')');
  console.log('  上传目录:   ' + UPLOADS_DIR);
  console.log('  CORS:       ' + (IS_PROD ? CORS_ORIGINS.join(', ') : 'localhost'));
  console.log('  模式:       纯 API（不提供前端静态文件）');
  console.log('  ─────────────────────────────');
  console.log('');

  process.on('SIGINT', () => { db.close(); process.exit(0); });
  process.on('SIGTERM', () => { db.close(); process.exit(0); });
});