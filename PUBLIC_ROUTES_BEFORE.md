# 整改前公网入口清单

本清单根据 `D:/qixiliwu/love-timer` 和 `D:/qixiliwu/love-timer-api` 扫描生成。当前线上已启用备案审核关闭模式，以下条目描述整改前存在或可推断可直连的公网入口。

## 前端页面

| URL | 类型 | 整改前作用 | 当前审核期状态 |
|---|---|---|---|
| `/` | 首页入口 | 进入站点 shell 或首页 | 关闭页 |
| `/index.html` | 首页入口 | 进入站点 shell 或首页 | 关闭页 |
| `/app.html` | iframe shell | 包裹 `pages/index.html` | 关闭页 |
| `/qrcode.html` | 工具页 | 首页二维码 | 关闭页 |
| `/pages/index.html` | 首页 | 我们的小宇宙主页 | 关闭页 |
| `/pages/home-20260808h.html` | 历史首页 | 历史首页版本 | 关闭页 |
| `/pages/love-album.html` | 相册 | 恋爱相册、照片展示 | 关闭页 |
| `/pages/love-list.html` | 清单 | 恋爱清单展示 | 关闭页 |
| `/pages/little-things.html` | 点滴 | 生活点滴记录 | 关闭页 |
| `/pages/leaving.html` | 留言/信件 | 留言与私人内容展示 | 关闭页 |
| `/pages/about-us.html` | 关于我们 | 个人介绍和纪念信息 | 关闭页 |
| `/pages/admin-login.html` | 管理登录 | 管理员登录入口 | 关闭页 |
| `/pages/admin-dashboard.html` | 管理后台 | 后台管理、上传、编辑、删除 | 关闭页 |
| `/partials/project-shell.html` | 片段文件 | 页面 shell 片段，非正式页面但可作为静态文件直连 | 关闭页 |

整改前可视作原站公网页面/入口共 13 个；另有 1 个可直连 partial 文件，不作为业务页面但已纳入关闭范围。

## 前端静态资源入口

| URL/路径 | 类型 | 整改前风险 | 当前审核期状态 |
|---|---|---|---|
| `/assets/js/api-client.js` | JS | 暴露 API 调用结构 | 关闭页 |
| `/assets/js/interactions.js` | JS | 暴露前端交互逻辑 | 关闭页 |
| `/assets/js/admin-core.js` | JS | 暴露后台前端逻辑 | 关闭页 |
| `/assets/js/admin-data.js` | JS | 暴露后台数据逻辑 | 关闭页 |
| `/assets/js/music.js` | JS | 暴露音乐播放逻辑 | 关闭页 |
| `/assets/music/there-is-romance.mp3` | 音乐 | 可能涉及版权；可公网播放 | 关闭页 |
| `/assets/avatars/*` | 图片 | 头像直链 | 关闭页 |
| `/assets/memories/*` | 图片 | 照片和回忆图直链 | 关闭页 |
| `/love-data-export-20260808.json` | 数据导出 | 数据备份可能被下载 | 关闭页 |
| `/server-api-updated.js` | 服务端脚本副本 | 服务端源码副本可能被下载 | 关闭页 |
| `/.env` | 环境文件探测 | 敏感文件探测 | 关闭页 |
| `/.git/config` | Git 探测 | 仓库元数据探测 | 关闭页 |

## 历史/常见绕过路径

| URL | 当前审核期状态 |
|---|---|
| `/pages/` | 关闭页 |
| `/admin` | 关闭页 |
| `/login` | 关闭页 |
| `/manage` | 关闭页 |
| `/upload` | 关闭页 |
| `/message` | 关闭页 |
| `/comment` | 关闭页 |
| `/guestbook` | 关闭页 |
| `/editor` | 关闭页 |
| `/debug` | 关闭页 |
| `/test` | 关闭页 |
| `/sitemap.xml` | 关闭页 |
| 任意不存在路径 | 关闭页 |

## 后端 API 入口

| Method | URL | 整改前作用 | 当前审核期状态 |
|---|---|---|---|
| GET | `/api/health` | 健康检查 | 403 |
| POST | `/api/login` | 管理员登录 | 403 |
| POST | `/api/logout` | 退出登录 | 403 |
| GET | `/api/session` | 登录状态 | 403 |
| GET | `/api/data` | 聚合业务数据 | 403 |
| GET | `/api/messages` | 留言列表 | 403 |
| POST | `/api/messages` | 新增留言 | 403 |
| DELETE | `/api/messages/:id` | 删除留言 | 403 |
| GET | `/api/album` | 相册数据 | 403 |
| POST | `/api/album/group` | 新增相册组 | 403 |
| DELETE | `/api/album/group/:id` | 删除相册组 | 403 |
| POST | `/api/album/photo` | 上传/新增照片 | 403 |
| DELETE | `/api/album/photo` | 删除单张照片 | 403 |
| GET | `/api/wishlist` | 清单数据 | 403 |
| POST | `/api/wishlist` | 新增清单项 | 403 |
| PUT | `/api/wishlist/:index` | 更新清单项 | 403 |
| DELETE | `/api/wishlist/:index` | 删除清单项 | 403 |
| GET | `/api/timeline` | 点滴数据 | 403 |
| POST | `/api/timeline` | 新增点滴 | 403 |
| DELETE | `/api/timeline/:id` | 删除点滴 | 403 |
| GET | `/api/site` | 站点设置 | 403 |
| POST | `/api/site` | 保存站点设置 | 403 |
| GET | `/api/cover` | 封面 | 403 |
| POST | `/api/cover` | 更换封面 | 403 |
| GET | `/api/letter` | 信件 | 403 |
| POST | `/api/letter` | 编辑信件 | 403 |
| GET | `/api/accounts` | 账户信息 | 403 |
| PUT | `/api/accounts/:side` | 修改账户 | 403 |
| POST | `/api/accounts/:side/password` | 修改密码 | 403 |
| POST | `/api/upload/avatar` | 上传头像 | 403 |
| POST | `/api/upload` | 通用上传 | 403 |
| GET | `/api/export` | 导出数据 | 403 |
| POST | `/api/import` | 导入数据 | 403 |
| POST | `/api/reset` | 重置数据 | 403 |
| GET | `/api/check-updates` | 前端轮询更新 | 403 |
| GET | `/uploads/*` | 上传文件直链 | 403 |

## 公网交互功能汇总

整改前存在服务端写入能力的功能：

- 管理员登录
- 留言新增和删除
- 相册组新增、删除
- 照片上传、删除
- 恋爱清单新增、修改、删除
- 点滴新增、删除
- 站点设置保存
- 封面上传或 URL 保存
- 信件保存
- 账户资料和密码修改
- 头像上传
- 数据导入、导出、重置

当前审核期这些写入能力全部由后端 `ICP_REVIEW_MODE` 守卫统一截断，不依赖 CSS 隐藏或前端 JavaScript。

