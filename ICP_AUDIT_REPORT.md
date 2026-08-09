# ICP 备案审核整改报告

## 基本信息

网站名称：我们的小宇宙

域名：

- `xiaoxingxing.love`
- `www.xiaoxingxing.love`
- `api.xiaoxingxing.love`

网站性质：个人非经营性网站，用于情侣照片、生活点滴、纪念日、恋爱清单和私人信件记录。

当前阶段：已完成工信部短信核验，处于通信管理局最终审核阶段。

当前备案号：空。尚未取得正式备案号，不显示任何 ICP 备案号或公安备案号。

## 技术栈

前端：

- 静态 HTML/CSS/JavaScript
- Vercel 托管
- 页面位于 `pages/`
- 静态资源位于 `assets/`

后端：

- Node.js + Express
- SQLite
- PM2 进程管理
- Nginx 反向代理
- API 域名：`api.xiaoxingxing.love`

数据库与上传：

- SQLite 数据库：`/var/www/love-timer-api/server-data/love.db`
- 上传目录：`/var/www/love-timer-api/server-data/uploads`

## 修改前主要风险

| 检查项目 | 发现的问题 | 风险等级 | 修改前状态 | 修改后状态 | 对应文件 | 是否已解决 |
|---|---|---:|---|---|---|---|
| 公开业务页面 | 首页、相册、清单、点滴、信件、关于我们可直接访问 | 高 | 公网开放 | Vercel 统一重写到备案审核页 | `vercel.json`, `icp-review.html` | 是 |
| 留言板 | 公众可访问留言板页面 | 高 | 页面可直接打开 | 统一进入备案审核页 | `vercel.json` | 是 |
| 留言提交 API | `/api/messages` 存在提交能力 | 高 | 登录后可写入，接口公网可见 | `ICP_REVIEW_MODE` 下 `/api/*` 返回关闭状态 | `../love-timer-api/server-api-updated.js` | 是 |
| 管理入口 | `admin-login.html` 和 `admin-dashboard.html` 可通过 URL 访问 | 高 | 公网可访问 | 统一进入备案审核页 | `vercel.json` | 是 |
| 图片上传 | `/api/upload`, `/api/upload/avatar`, `/api/album/photo` 存在上传能力 | 高 | 接口公网可见 | `ICP_REVIEW_MODE` 下全部 API 关闭 | `../love-timer-api/server-api-updated.js` | 是 |
| 上传文件访问 | `/uploads` 可公开访问服务器上传文件 | 中 | 上传文件可直接访问 | `ICP_REVIEW_MODE` 下 `/uploads/*` 返回关闭状态 | `../love-timer-api/server-api-updated.js` | 是 |
| 背景音乐 | 公开页面加载 `.mp3` 背景音乐 | 中 | 可播放/加载 | 维护页不加载音乐，Vercel 不保留音乐资源直出路由 | `vercel.json`, `icp-review.html` | 是 |
| 搜索引擎抓取 | 未统一禁止抓取 | 中 | 普通页面可被抓取 | `robots.txt` 禁止抓取，维护页 `noindex,nofollow` | `robots.txt`, `icp-review.html`, `vercel.json` | 是 |
| 备案号展示 | 尚未取得备案号 | 高 | 未展示备案号 | 继续保持为空，不伪造备案号 | `icp-review.config.json`, `ICP_FILING_README.md` | 是 |
| 第三方脚本 | 页面使用 Lucide CDN 等脚本 | 低 | 业务页加载第三方脚本 | 维护页不加载任何脚本 | `icp-review.html` | 是 |
| 数据安全 | `.env`、数据库、uploads 不能公网暴露 | 高 | 后端 Nginx 已禁止部分目录，API 仍开放 | API/上传审核期关闭；服务器备份保留 | `../love-timer-api/server-api-updated.js` | 是 |
| Service Worker | 需确认是否有缓存劫持 | 低 | 未发现注册代码 | 无需改动 | 全项目扫描 | 是 |
| sitemap | 需避免审核期主动索引 | 低 | 未发现正式 sitemap | 不主动提交 sitemap，robots 禁止抓取 | `robots.txt` | 是 |

## 本次新增文件

- `icp-review.config.json`
- `icp-review.html`
- `robots.txt`
- `ICP_FILING_README.md`
- `ICP_AUDIT_REPORT.md`

## 本次修改文件

- `vercel.json`
- `../love-timer-api/server-api-updated.js`
- `../love-timer-api/.env.example`

## 备份记录

本地备份：

- `D:/qixiliwu/icp-prechange-backups/20260809134143`

服务器备份：

- `/root/icp-prechange-backups/20260809134143`

备份包含前端源码、后端源码、服务器数据目录和恢复前数据库副本。

## 需要人工确认

- 管局最终审核是否还要求“暂停解析”而不是仅暂停网站服务。
- 备案通过后应填入的真实 ICP 备案号。
- 是否需要公安联网备案，以及公安备案信息。
- 域名控制台中裸域和 `www` 的最终解析策略是否与备案服务商要求一致。

