# ICP备案整改报告

## 基本信息

网站名称：我们的小宇宙

域名：

- xiaoxingxing.love
- www.xiaoxingxing.love
- api.xiaoxingxing.love

网站性质：个人非经营性网站。

备案状态：工信部短信核验已完成，等待管局审核。

当前备案号：空。尚未正式通过，不显示 ICP 备案号。

当前公安备案号：空。尚未办理完成，不显示公安备案号或图标。

整改目标：ICP备案审核通过前，公网统一暂停原网站服务；不针对审核人员、IP、UA、地区、Referer 或 Cookie 展示差异内容；不删除原代码、照片、音乐、数据库或纪念数据。

## 技术栈

前端：

- 静态 HTML/CSS/JavaScript
- Vercel 托管
- `vercel.json` 路由控制
- 页面位于 `pages/`
- 静态资源位于 `assets/`
- 使用浏览器 localStorage 做部分前端缓存/降级数据

后端：

- Node.js + Express
- SQLite
- PM2 进程管理
- Nginx 反向代理
- API 域名：api.xiaoxingxing.love

数据与上传：

- SQLite 数据库：`/var/www/love-timer-api/server-data/love.db`
- 上传目录：`/var/www/love-timer-api/server-data/uploads`

未发现：

- PHP
- Python Web 服务
- Docker 部署文件
- Apache 配置
- OSS 或对象存储 SDK/配置
- Cloudflare 配置
- Service Worker

## 整改措施

前端 Vercel 已使用 `routes` 在部署层接管所有公网路径：

- `/robots.txt` 返回禁止抓取文件
- `/(.*)` 统一返回 `/icp-review.html`
- 所有响应附加 `Cache-Control: no-store, max-age=0, must-revalidate`
- 所有响应附加 `X-Robots-Tag: noindex, nofollow`

后端 Express 已启用 `ICP_REVIEW_MODE=true`：

- `/api/*` 统一返回 403 JSON
- `/uploads/*` 统一返回 403 文本
- API 域名其他路径统一返回 503 关闭页
- `/robots.txt` 返回 `Disallow: /`

备案模式使用的变量为 `ICP_REVIEW_MODE`，等价于本次要求中的 `ICP_FILING_REVIEW`。恢复必须由网站所有者手动操作，不设置自动恢复、日期恢复、UA/IP 恢复或审核员识别。

## 风险清单

| 风险 | 整改前 | 整改措施 | 整改后 | 涉及文件 | 风险级别 |
|---|---|---|---|---|---|
| 网站是否仍公开访问 | 首页、相册、清单、点滴、信件等可公网访问 | Vercel 所有路径统一返回备案审核页 | 原网站内容不可公网访问 | `vercel.json`, `icp-review.html` | 高 |
| 留言板 | 留言页和留言 API 可见 | 前端历史 URL 关闭，后端 `/api/messages` 403 | 已停止 | `vercel.json`, `server-api-updated.js` | 高 |
| 管理员登录 | `pages/admin-login.html` 可直连 | 前端历史 URL 关闭，登录 API 403 | 已停止 | `vercel.json`, `server-api-updated.js` | 高 |
| 内容发布 | 留言、清单、点滴、相册等写接口存在 | 审核模式下所有 `/api/*` 先被守卫截断 | 已停止 | `server-api-updated.js` | 高 |
| 照片上传 | 相册、头像、通用上传接口存在 | `/api/upload*`、`/api/album/photo` 返回 403 | 已停止 | `server-api-updated.js` | 高 |
| 点滴编辑 | 后台可添加/删除点滴 | 后台 URL 和 `/api/timeline*` 关闭 | 已停止 | `vercel.json`, `server-api-updated.js` | 高 |
| 信件编辑 | 后台可编辑信件 | 后台 URL 和 `/api/letter` 写入关闭 | 已停止 | `vercel.json`, `server-api-updated.js` | 高 |
| 音乐 | `assets/music/there-is-romance.mp3` 可作为静态资源加载 | 资源直链被 Vercel 统一返回关闭页 | 已停止公网加载 | `vercel.json` | 中 |
| API | 读写 API 公网可访问 | `ICP_REVIEW_MODE` 下 `/api/*` 全部 403 | 已关闭业务数据返回 | `server-api-updated.js` | 高 |
| 目录索引 | 需确认图片、上传、数据目录不会列表 | Vercel catch-all；API `/uploads/*` 403；未发现 `autoindex on` | 未发现目录浏览 | `vercel.json`, Nginx 配置扫描 | 高 |
| 后台密码 | 后端使用 bcrypt 哈希和 HttpOnly Cookie；前端存在密码输入逻辑 | 审核期登录页/API 已关闭；未打印或保存密码 | 审核期不可用 | `admin-core.js`, `server-api-updated.js` | 高 |
| `.env` | 后端生产 `.env` 只在服务器；前端无 `.env` | 前端 `/.env` 返回关闭页；API 域名 `/.env` 返回 503 | 未公网暴露 | `vercel.json`, `server-api-updated.js` | 高 |
| 密钥 | 代码中存在密钥变量名和示例占位；未在报告中输出真实值 | `.env.example` 为占位；生产密钥不提交；建议检查 Git 历史和轮换策略 | 未发现客户端打包真实密钥证据 | `.env.example`, `server-api-updated.js` | 高 |
| 数据库 | SQLite 在服务器数据目录 | 不删除数据库；API 审核期不返回业务数据 | 未公网暴露 | `/var/www/love-timer-api/server-data/love.db` | 高 |
| 第三方服务 | 原业务页加载 Tailwind CDN、Lucide CDN、二维码 CDN | 审核页不加载脚本，不请求第三方 JS | 审核期已停止 | `icp-review.html` | 中 |
| robots | 需禁止抓取 | 新增 `robots.txt` 和 HTML `noindex,nofollow` | 已设置 | `robots.txt`, `icp-review.html`, `vercel.json` | 中 |
| HTTP | HTTP 入口会跳 HTTPS | 跳转后进入统一关闭页 | 不进入正式站 | Vercel 域名配置 | 中 |
| HTTPS | HTTPS 可访问站点 | 统一关闭页 | 不进入正式站 | `vercel.json` | 高 |
| www | `www` 指向 Vercel | 统一关闭页 | 不进入正式站 | DNS, Vercel | 高 |
| 裸域 | 裸域指向 Vercel 并跳转 www | 跳转后统一关闭页 | 不进入正式站 | DNS, Vercel | 高 |
| 404 | 未命中路径可能成为回站入口 | 未知路径也由 catch-all 返回关闭页，无业务链接 | 已关闭 | `vercel.json` | 中 |
| 静态资源 | 图片、JS、音乐、JSON 直链可能暴露内容 | catch-all 覆盖静态文件路径 | 已停止直链暴露 | `vercel.json` | 高 |
| 备份文件 | 前端根目录存在数据导出 JSON 和服务端脚本副本 | 审核期 catch-all 阻断公网访问 | 审核期已阻断；备案后恢复前建议移出 web 根 | `love-data-export-20260808.json`, `server-api-updated.js` | 高 |
| IC P 备案号 | 尚未取得正式编号 | 保持为空，不生成、不展示 | 空 | `icp-review.config.json`, `.env.example` | 高 |
| 公安备案号 | 尚未办理完成 | 保持为空，不展示图标或编号 | 空 | `ICP_FILING_README.md` | 高 |

## 第三方依赖清单

原业务页发现的第三方资源：

- `https://cdn.jsdelivr.net`：Tailwind Browser、QRCodeJS
- `https://unpkg.com`：Lucide 图标

审核页不加载上述第三方脚本。

未发现：

- Google Analytics
- 百度统计
- 51LA
- Umami
- Clarity
- 第三方评论系统
- 广告脚本
- 第三方音乐播放器

## 公开资源与敏感文件检查

已识别的历史公开风险文件：

- `love-data-export-20260808.json`
- `server-api-updated.js`
- 本地未跟踪文件 `BUILD_LOG.md`

当前线上这些路径均由 Vercel catch-all 返回关闭页，不返回原文件。`BUILD_LOG.md` 是本地未跟踪文件，不应上传或提交。

备案通过恢复正式网站前，建议将数据导出、服务端源码副本、审计日志、构建日志移出前端 web 根目录，或继续在部署层禁止访问这类文件。

## 生产环境验证摘要

验证时间：2026-08-09。

本地验证：

- 前端使用本地临时 HTTP 服务按 Vercel catch-all 行为请求 `/`、`/index.html`、历史页面、静态 JS、音乐、未知路径和 `robots.txt`，结果全部为关闭页或禁止抓取文件。
- 本地后端尝试直接启动 Express 服务时，当前机器的 `better-sqlite3` 原生模块与 Node.js 版本不匹配；尝试 rebuild 时因 nodejs.org 头文件下载超时未完成。因此本轮后端以生产 API 真实请求结果作为验收证据。

前端：

- 桌面 Chrome UA、iPhone Safari UA、Android Chrome UA 请求 `/`、`/pages/index.html`、`/pages/love-album.html`、`/assets/js/api-client.js`、`/assets/js/interactions.js`、`/assets/js/admin-core.js`，响应 SHA256 完全一致。
- 统一响应 hash：`c08472719524e99b819c322b919d5ad87588d3c1fdca01034129fb7d732baf40`
- `Cache-Control: no-store, max-age=0, must-revalidate`
- `X-Robots-Tag: noindex, nofollow`
- 未发现按 UA 返回不同内容。

后端：

- `GET /api/data`：403
- `GET /api/messages`：403
- `POST /api/messages`：403
- `POST /api/login`：403
- `POST /api/upload`：403
- `GET /uploads/nonexistent.jpg`：403
- `GET /`：503

DNS：

- `xiaoxingxing.love` A：`216.198.79.1`
- `www.xiaoxingxing.love` CNAME：`bdcdc5449e0bd13a.vercel-dns-017.com`
- `api.xiaoxingxing.love` A：`139.196.92.218`
- 三个域名均未发现 AAAA 记录。

## 备份记录

本地备份：

- `D:/qixiliwu/icp-prechange-backups/20260809134143`

服务器备份：

- `/root/icp-prechange-backups/20260809134143`
- `/var/www/love-timer-api/server.js.pre-icp-20260809214900.bak`
- `/var/www/love-timer-api/.env.pre-icp-20260809214900.bak`

备份包含前端源码、后端源码、服务器数据目录和恢复前数据库副本。没有删除照片、文章、点滴、恋爱清单、信件、音乐、数据库或上传目录。

## 剩余风险

备案通过恢复正式网站前仍需处理：

- 将备份/导出/服务端副本文件从前端 web 根目录移出，或配置长期禁止公网访问。
- 正式站恢复后不要把留言板恢复成匿名公众 UGC。
- 正式站恢复后不要公开管理入口和编辑按钮给普通访客。
- 确认音乐版权；版权不明确时不要向公网提供完整音乐文件。
- 检查照片 EXIF，尤其是 GPS、设备序列号等隐私信息；如需清理，先生成副本，不改唯一原图。
