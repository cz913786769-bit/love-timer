# 恋爱小站 (Love Timer) — 从 0 到 1 完整构建日志

> 生成日期：2026-08-09
> 用途：供 AI 阅读，用于制作"从 0 开始搭建情侣网站"的教程视频
> 网站地址：https://www.xiaoxingxing.love
> API 地址：https://api.xiaoxingxing.love
> 服务器：139.196.92.218 (阿里云 ECS)

---

## 阶段一：项目初始化与静态网站搭建

### 1.1 项目概述

**项目名称**：恋爱小站（我们的小宇宙）
**项目类型**：情侣恋爱纪念网站
**用户**：陈卓卓（男），为女朋友嘉嘉小星星制作
**纪念日**：2026 年 4 月 12 日（表白日）

### 1.2 技术选型

| 层面 | 技术 | 选型理由 |
|------|------|----------|
| 前端框架 | 纯静态 HTML + CSS + Vanilla JS | 简单、无需构建、部署零成本 |
| CSS 方案 | Tailwind CSS v4.3.1 (CDN) | 快速开发、响应式友好 |
| 图标库 | Lucide Icons (CDN) | 轻量、开源、SVG 图标 |
| 部署平台 | Vercel | 静态站点免费托管、自动 HTTPS |
| 版本控制 | Git + GitHub | 代码管理 |
| 后端 | Node.js + Express + SQLite | 后续阶段添加 |
| 设计工具 | TraeDesign (.design 画布文件) | AI 辅助设计 |

### 1.3 初始目录结构

```
love-timer/
├── app.html                    # 应用壳层 (iframe 容器 + 全局音乐播放器)
├── index.html                  # 根入口重定向
├── qrcode.html                 # 二维码分享页
├── vercel.json                 # Vercel 部署配置
├── colors_and_type.css         # 设计系统 (CSS 变量 + 组件类)
├── pages/
│   ├── index.html              # 首页（核心页面）
│   ├── leaving.html            # 留言板
│   ├── love-album.html         # 恋爱相册
│   ├── love-list.html          # 恋爱清单
│   ├── little-things.html      # 点点滴滴（时间线）
│   ├── about-us.html           # 关于我们（七夕信）
│   ├── admin-login.html        # 管理员登录
│   └── admin-dashboard.html    # 管理后台
├── assets/
│   ├── js/
│   │   ├── admin-core.js       # 管理员核心逻辑
│   │   ├── admin-data.js       # 数据管理 (LoveData + LoveAdmin)
│   │   ├── music.js            # 音乐播放控制
│   │   ├── interactions.js     # 页面入场动画
│   │   └── cover-contrast.js   # 封面文字对比度自动检测
│   ├── avatars/
│   │   ├── chenzhuozhuo.png    # 陈卓卓头像
│   │   └── jiajia.png          # 嘉嘉头像
│   ├── music/
│   │   └── there-is-romance.mp3  # 背景音乐
│   └── memories/               # 回忆照片（16 个文件夹）
└── partials/
    └── project-shell.html      # 共享导航头部和页脚模板
```

### 1.4 设计系统（CSS 变量）

品牌色采用粉色系，定义了完整的 Design Token：

```css
/* 品牌色 */
--brand: #f47298;          /* 粉色主色 */
--brand-100: #ffe4eb;      /* 最浅粉 */
--brand-200: #fec6d6;
--brand-300: #fda1bf;
--brand-400: #f97da7;
--brand-500: #f47298;      /* 主色 */
--brand-600: #d84e7a;      /* hover 深粉 */
--brand-700: #b53761;      /* 最深粉 */

/* 语义色 */
--bg: #fff5f7;             /* 页面背景 */
--surface: #ffffff;        /* 卡片背景 */
--surface-2: #fef0f3;      /* 次级背景 */
--ink: #4a3f41;            /* 正文文字 */
--ink-2: #6d5e62;          /* 次级文字 */
--ink-3: #9e8f94;          /* 弱化文字 */
--line: #f3d8e0;           /* 边框颜色 */

/* 间距系统 */
--s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
--s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 80px; --s-9: 120px;

/* 圆角 */
--r-xs: 2px; --r-sm: 4px; --r-md: 8px; --r-lg: 16px; --r-pill: 9999px;

/* 阴影 */
--shadow-1: 0 1px 2px rgba(74,63,65,0.05);
--shadow-2: 0 8px 24px -8px rgba(74,63,65,0.15);
--shadow-3: 0 24px 60px -20px rgba(74,63,65,0.22);

/* 字体 */
--font-display: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
--font-body: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
```

支持暗色模式，通过 `.dark` 类切换所有语义色变量。

### 1.5 各页面功能说明

#### 首页 (pages/index.html)
- 恋爱计时器：从 2026-04-12 起计算天/时/分/秒
- Hero 封面区：可更换封面图 + 双方头像 + 爱心
- Glass 卡片：日期、标题、副标题、计时器
- 5 个导航卡片：留言板、相册、清单、点滴、关于我们
- 入场动画：page-enter/reveal CSS 类
- 管理员模式：可编辑封面

#### 留言板 (pages/leaving.html)
- 留言表单：昵称 + 内容
- 留言卡片列表（倒序）
- 管理员可删除留言

#### 恋爱相册 (pages/love-album.html)
- 按日期/主题分组的照片网格
- 支持 lightbox 图片查看器
- 管理员可添加/编辑分组、上传照片

#### 恋爱清单 (pages/love-list.html)
- 心愿列表，支持勾选完成/删除
- 进度条动画（完成数/总数百分比）
- 显示创建者头像和昵称

#### 点点滴滴 (pages/little-things.html)
- 时间线布局（CSS 竖线 + 圆点）
- 桌面端左右交替布局
- 管理员可添加/删除条目

#### 关于我们 (pages/about-us.html)
- 七夕信功能：称呼、正文、署名、日期
- 管理员可编辑信件内容

#### 管理后台 (pages/admin-dashboard.html)
- 侧边栏 + 内容区布局
- 账户设置、封面设置、站点设置
- 留言管理、相册管理、清单管理、时间线管理
- 备份恢复功能

#### 应用壳层 (app.html)
- iframe 容器加载各页面
- 全局音乐播放器（localStorage 持久化状态）
- 通过 postMessage 实现 iframe 导航拦截
- 移动端底部浮动音乐按钮

### 1.6 关键 JS 脚本说明

| 脚本 | 行数 | 功能 |
|------|------|------|
| admin-data.js | ~600 | LoveData CRUD + LoveAdmin 认证，localStorage 持久化 |
| admin-core.js | ~550 | 管理员 UI 显隐 + Toast 提示 + 密码验证 |
| cover-contrast.js | ~220 | 封面文字对比度自动检测，逐元素独立判断 |
| music.js | ~140 | 背景音乐播放/暂停 + 状态持久化 |
| interactions.js | ~90 | 页面入场动画 + 滚动显隐 |

---

## 阶段二：前端关键问题修复

### 2.1 对比度检测脚本重构

**问题**：不同区域背景不同（封面图 vs banner.jpg vs glass 卡片），文字颜色需要自动适配确保可读性。

**解决方案**：三层检测逻辑

```
初始化 → 遍历所有 [data-contrast-text] 元素
  ├─ detectOverlay(el) → 检查祖先链上的蒙版
  │   ├─ .glass 类 → 强制深色文字
  │   ├─ rgba(255,≥200,≥200,≥0.4) → 浅色蒙版 → 深色文字
  │   ├─ rgba(≤80,≤80,≤80,≥0.25) → 深色蒙版 → 白色文字
  │   └─ 无蒙版 → 继续检测
  │
  ├─ extractBgImage(el) → 从祖先元素提取背景图片 URL
  └─ detectBrightness(url) → 计算图片亮度 → 返回深/浅色文字
```

**关键决策**：
- 蒙版优先级高于背景图片
- 计时器数字不参与自动对比度，固定粉色 `var(--brand)`
- glass 卡片强制深色文字（因为卡片本身是白色半透明）

### 2.2 手机端响应式修复

**问题**：计时数字在手机端溢出 glass 卡片。

**修复**：
- glass 卡片 padding：从固定 `px-8 py-10` 改为 `px-4 py-6 sm:px-6 sm:py-8 md:px-12 md:py-12`
- 计时数字：从 `clamp(28px,8vw,40px)` 缩小到 `clamp(24px,6.5vw,36px)`
- 移动端降低毛玻璃模糊半径（减少 GPU 开销）
- 移动端禁用 fixed 背景（避免滚动重绘卡顿）

### 2.3 缓存策略

每次修改 JS 文件后更新 `?v=` 参数（如 `?v=20260807c` → `?v=20260808d`），确保浏览器加载最新代码。

---

## 阶段三：后端 API 服务器搭建

### 3.1 需求驱动

**用户需求**：希望网页有后端服务器，实现"我这边上传照片和留言，对方刷新就能实时看到"的功能，同时保持 UI 不变。

### 3.2 后端技术选型

| 技术 | 选型理由 |
|------|----------|
| Node.js | 与前端 JS 同语言，降低维护成本 |
| Express | 最流行的 Node.js Web 框架 |
| SQLite (better-sqlite3) | 零配置、嵌入式、适合小型项目 |
| bcryptjs | 密码哈希存储 |
| express-rate-limit | 防暴力破解 |
| multer | 安全文件上传 |
| xss | 防 XSS 攻击 |

### 3.3 数据库设计

```sql
-- 留言表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  text TEXT NOT NULL,
  identity TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 相册分组表
CREATE TABLE album_groups (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 相册照片表
CREATE TABLE album_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES album_groups(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

-- 心愿清单表
CREATE TABLE wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  created_by TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sort_order INTEGER DEFAULT 0
);

-- 时间线表
CREATE TABLE timeline (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  tag TEXT DEFAULT '',
  title TEXT NOT NULL,
  cover TEXT DEFAULT '',
  text TEXT NOT NULL,
  created_by TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 站点设置表
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 账户表
CREATE TABLE accounts (
  side TEXT PRIMARY KEY CHECK(side IN ('left','right')),
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT DEFAULT ''
);

-- 会话表
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  side TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
```

### 3.4 API 端点设计

```
公开端点（无需认证）：
  GET  /api/health              → 健康检查
  POST /api/login               → 登录（rate-limit: 20次/15分钟）
  POST /api/logout              → 登出
  GET  /api/session             → 获取当前会话
  GET  /api/data                → 获取所有公开数据
  GET  /api/messages            → 获取留言列表
  GET  /api/album               → 获取相册
  GET  /api/wishlist            → 获取心愿清单
  GET  /api/timeline            → 获取时间线
  GET  /api/site                → 获取站点设置
  GET  /api/cover               → 获取封面
  GET  /api/letter              → 获取七夕信
  GET  /api/accounts            → 获取账户信息（不含密码）
  GET  /api/check-updates       → 检测数据更新（返回 hash）

需认证端点（authMiddleware）：
  POST /api/messages            → 添加留言（rate-limit: 5次/分钟）
  POST /api/album/group         → 添加相册分组
  POST /api/album/photo         → 上传照片
  POST /api/wishlist            → 添加心愿
  POST /api/timeline            → 添加时间线
  POST /api/site                → 更新站点设置
  POST /api/cover               → 上传封面
  POST /api/letter              → 更新七夕信
  POST /api/accounts/:side/password → 修改密码
  POST /api/upload/avatar       → 上传头像
  POST /api/upload              → 通用上传
  GET  /api/export              → 数据导出
  POST /api/import              → 数据导入
  POST /api/reset               → 重置数据
```

### 3.5 安全措施

1. **密码存储**：bcrypt 哈希（12 轮），环境变量注入预计算哈希，不接收明文密码
2. **会话管理**：HttpOnly Cookie，7 天过期，服务端验证
3. **防暴力破解**：express-rate-limit 分级限流
4. **文件上传安全**：multer 限制文件类型（jpg/png/webp）和大小（10MB）
5. **XSS 防护**：xss 库过滤用户输入
6. **CORS**：仅允许 `https://www.xiaoxingxing.love` 和 `https://xiaoxingxing.love`
7. **生产环境强制**：启动时校验 SESSION_SECRET 和密码哈希必须设置

### 3.6 数据迁移策略

从旧版 JSON 文件 (`data.json`) 自动迁移到 SQLite：
- 首次启动时检测 `data.json` 是否存在
- 如果数据库为空，自动导入 JSON 数据
- 迁移完成后将旧文件重命名为 `.migrated` 后缀
- 启动时自动修复缺失头像和空相册数据

### 3.7 前后端双模式架构

```
默认模式（API 模式）：
  前端 → api-client.js → https://api.xiaoxingxing.love → Express + SQLite

紧急回退模式（localStorage）：
  URL 加 ?local=1 → 前端直接用 localStorage 读写
```

### 3.8 实时同步机制

通过 `api-client.js` 实现轮询检测：

```
1. 前端每 5 秒请求 /api/check-updates
2. 后端返回所有数据的 SHA256 哈希
3. 前端比较哈希值，变化时自动重新加载数据
4. 利用 Page Visibility API：页面隐藏时暂停轮询，节省资源
5. 各页面注册 onUpdate 回调，数据变化时自动刷新 UI
```

---

## 阶段四：部署流程

### 4.1 前端部署（Vercel）

**步骤**：
1. 安装 Vercel CLI：`npm i -g vercel`
2. 登录 Vercel：`vercel login`
3. 配置 `vercel.json`：路由重写 + 缓存策略
4. 部署：`vercel --prod`
5. 绑定域名：`vercel alias` 到 `www.xiaoxingxing.love`

**vercel.json 内容**：
```json
{
  "rewrites": [
    { "source": "/", "destination": "/app.html" },
    { "source": "/pages/:path*", "destination": "/pages/:path*" },
    { "source": "/:page", "destination": "/pages/:page" }
  ],
  "headers": [
    {
      "source": "/assets/music/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)\\.html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```

### 4.2 后端部署（阿里云 ECS）

**服务器信息**：
- IP：139.196.92.218
- 系统：Linux (CentOS/Ubuntu)
- 进程管理：PM2
- 反向代理：Nginx

**部署步骤**：
1. 上传 server.js 到 `/var/www/love-timer-api/`
2. 安装依赖：`npm install`
3. 配置环境变量（.env）：
   ```
   NODE_ENV=production
   SESSION_SECRET=<随机长字符串>
   ADMIN_LEFT_PASSWORD_HASH=<bcrypt 哈希>
   ADMIN_RIGHT_PASSWORD_HASH=<bcrypt 哈希>
   CORS_ORIGINS=https://www.xiaoxingxing.love,https://xiaoxingxing.love
   PORT=3000
   ```
4. 启动 PM2：`pm2 start server.js --name love-timer-api`
5. 配置 Nginx 反向代理 + SSL（Let's Encrypt）

**Nginx 关键配置**：
```nginx
server {
    server_name api.xiaoxingxing.love;
    listen 443 ssl;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 4.3 域名配置

| 域名 | 用途 | DNS 记录 |
|------|------|----------|
| www.xiaoxingxing.love | 前端 (Vercel) | CNAME → cname.vercel-dns.com |
| xiaoxingxing.love | 前端 (Vercel) | CNAME → cname.vercel-dns.com |
| api.xiaoxingxing.love | 后端 (ECS) | A → 139.196.92.218 |

---

## 阶段五：常见问题与修复记录

### 问题 1：express-rate-limit trust proxy 警告
**现象**：`ValidationError: X-Forwarded-For header set but trust proxy false`
**原因**：Nginx 转发请求时设置了 X-Forwarded-For 头，但 Express 默认不信任代理
**修复**：在 `server.js` 中添加 `app.set('trust proxy', true)`

### 问题 2：头像/相册数据缺失
**现象**：账户头像为空，相册数据不显示
**原因**：数据迁移时某些字段未正确导入
**修复**：在 `initAccounts()` 和 `repairAlbumData()` 中添加修复逻辑，启动时自动检测并补充

### 问题 3：check-updates 哈希不完整
**现象**：轮询检测不到数据变化
**原因**：哈希计算只覆盖了部分数据类型
**修复**：将 messages、album、wishlist、timeline、site、cover、letter、accounts 全部纳入哈希计算

### 问题 4：GitHub 推送失败
**现象**：`Connection was reset` 或 `Could not connect to server:443`
**原因**：网络代理或防火墙阻止
**处理**：使用 Vercel CLI 直接部署，绕过 GitHub

### 问题 5：Vercel 部署后 ICP 备案
**现象**：网站显示"备案审核中"占位页
**配置**：`vercel.json` 路由全部指向 `icp-review.html`，备案通过后恢复

---

## 阶段六：项目文件总览

### 关键文件及用途

| 文件 | 大小 | 用途 | 重要性 |
|------|------|------|--------|
| pages/index.html | 36KB | 首页：计时器 + 导航卡片 | ⭐⭐⭐⭐⭐ |
| server-api-updated.js | 40KB | 后端 API 服务器 | ⭐⭐⭐⭐⭐ |
| assets/js/api-client.js | 29KB | API 客户端（前后端桥梁） | ⭐⭐⭐⭐⭐ |
| pages/admin-dashboard.html | 70KB | 管理后台 | ⭐⭐⭐⭐ |
| app.html | 15KB | 应用壳层 | ⭐⭐⭐⭐ |
| assets/js/cover-contrast.js | 9KB | 对比度检测 | ⭐⭐⭐⭐ |
| assets/js/admin-core.js | 22KB | 管理员逻辑 | ⭐⭐⭐ |
| assets/js/admin-data.js | 24KB | 数据管理 | ⭐⭐⭐ |
| pages/love-album.html | 50KB | 相册页面 | ⭐⭐⭐ |
| pages/leaving.html | 30KB | 留言板 | ⭐⭐⭐ |
| pages/love-list.html | 30KB | 心愿清单 | ⭐⭐⭐ |
| pages/little-things.html | 30KB | 时间线 | ⭐⭐⭐ |
| pages/about-us.html | 26KB | 七夕信 | ⭐⭐ |
| pages/admin-login.html | 24KB | 管理登录 | ⭐⭐ |
| vercel.json | 450B | Vercel 部署配置 | ⭐⭐⭐ |
| colors_and_type.css | 7KB | 设计系统 | ⭐⭐⭐ |
| PROJECT_HANDOVER.md | 21KB | 项目交接文档 | ⭐⭐ |

### 前端 JS 依赖链

```
api-client.js (顶层，覆盖 LoveData/LoveAdmin)
  ├── admin-data.js (LoveData CRUD + LoveAdmin 认证)
  ├── admin-core.js (管理员 UI 逻辑)
  ├── music.js (音乐播放)
  ├── interactions.js (动画)
  └── cover-contrast.js (封面文字对比度)
```

### 外部 CDN 依赖

```
Tailwind CSS v4.3.1:  https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.1/dist/index.global.js
Lucide Icons:         https://unpkg.com/lucide@latest
QRCode.js:            https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js
```

---

## 阶段七：给 AI 的启动指令

如果你是新接手的 AI，请按以下步骤开始工作：

```
1. 工作目录：d:\qixiliwu\love-timer
2. 先阅读本文档 (BUILD_LOG.md) 和 PROJECT_HANDOVER.md
3. 技术栈：纯静态 HTML + Tailwind CSS CDN + Vanilla JS + Node.js 后端
4. 前端部署在 Vercel，后端部署在阿里云 ECS (139.196.92.218)
5. 修改规则：
   - 先 Read 文件当前内容
   - 精确修改
   - 更新 JS 缓存版本号 (?v= 参数)
   - 运行验证脚本
   - 告知用户结果
6. 用户偏好简洁中文沟通，直接说改了什么
7. 前端通过 api-client.js 连接后端，默认 API 模式
8. 后端用 PM2 管理，进程名 love-timer-api
9. SSH 密钥：C:/Users/Administrator/.ssh/xiaoxingxing_ed25519
```

---

## 附录：数据统计

- **页面总数**：9 个 HTML 页面
- **JS 脚本**：6 个
- **API 端点**：28 个
- **数据库表**：8 张
- **回忆照片**：16 个文件夹，约 40 张照片
- **前端总代码量**：约 15 万字符（HTML + CSS + JS）
- **后端总代码量**：约 4 万字符（server.js）
- **纪念日**：2026 年 4 月 12 日