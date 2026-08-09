# ICP 备案审核模式说明

## 当前为什么关闭网站

当前是首次 ICP 备案审核阶段：工信部短信核验已完成，正在等待通信管理局最终审核。

审核通过前，网站不继续提供原来的公开 Web 服务。当前关闭是真实面向所有公网用户生效，不区分审核人员、普通用户、IP、地区、浏览器、User-Agent、Referer 或 Cookie。

关闭公网访问不等于删除网站。原代码、照片、音乐、留言、清单、点滴、信件、SQLite 数据库和上传文件都保留。

## 备案模式在哪里配置

前端静态站：

- `vercel.json`
- `icp-review.html`
- `icp-review.config.json`
- `robots.txt`

前端当前通过 Vercel 部署层实现关闭：

- `/robots.txt` 返回禁止抓取规则
- 其他所有路径统一返回 `/icp-review.html`

后端 API：

- `love-timer-api/server-api-updated.js`
- 生产服务器 `/var/www/love-timer-api/.env`

后端当前使用：

```ini
ICP_REVIEW_MODE=true
ICP_NUMBER=
ICP_URL=https://beian.miit.gov.cn/
PSB_NUMBER=
PSB_URL=
```

`ICP_REVIEW_MODE` 是本项目的审核模式变量，等价于 `ICP_FILING_REVIEW=true`。当前不使用自动恢复，不使用日期恢复，不使用审核机器人识别。

## 原网站数据在哪里

前端原页面仍在：

- `pages/index.html`
- `pages/home-20260808h.html`
- `pages/love-album.html`
- `pages/love-list.html`
- `pages/little-things.html`
- `pages/leaving.html`
- `pages/about-us.html`
- `pages/admin-login.html`
- `pages/admin-dashboard.html`

前端脚本仍在：

- `assets/js/api-client.js`
- `assets/js/admin-core.js`
- `assets/js/admin-data.js`
- `assets/js/interactions.js`
- `assets/js/music.js`

生产数据仍在服务器：

- `/var/www/love-timer-api/server-data/love.db`
- `/var/www/love-timer-api/server-data/uploads`

备份位置：

- `D:/qixiliwu/icp-prechange-backups/20260809134143`
- `/root/icp-prechange-backups/20260809134143`
- `/var/www/love-timer-api/server.js.pre-icp-20260809214900.bak`
- `/var/www/love-timer-api/.env.pre-icp-20260809214900.bak`

## 如何确认没有删除数据

检查本地与服务器备份目录是否存在。

检查生产服务器数据目录：

```bash
ls -lah /var/www/love-timer-api/server-data
ls -lah /var/www/love-timer-api/server-data/uploads
```

检查 SQLite 数据库存在：

```bash
ls -lah /var/www/love-timer-api/server-data/love.db
```

不要在备案审核期间重新导入数据、清空数据库、删除 uploads 或删除相册资源。

## 当前关闭了哪些功能

- 首页
- 相册
- 恋爱清单
- 点点滴滴
- 写给你的信
- 关于我们
- 留言板
- 管理入口
- 管理员登录页
- 管理后台
- 添加照片
- 删除照片
- 更换封面
- 添加点滴
- 编辑信件
- 上传文件
- API 数据读取与写入
- `/uploads` 上传文件访问
- 背景音乐公网加载

## 如何测试备案模式

前端应测试：

- `https://www.xiaoxingxing.love`
- `https://www.xiaoxingxing.love/pages/index.html`
- `https://www.xiaoxingxing.love/pages/love-album.html`
- `https://www.xiaoxingxing.love/pages/leaving.html`
- `https://www.xiaoxingxing.love/pages/admin-login.html`
- `https://www.xiaoxingxing.love/pages/admin-dashboard.html`
- `https://www.xiaoxingxing.love/assets/js/api-client.js`
- `https://www.xiaoxingxing.love/assets/music/there-is-romance.mp3`
- `https://www.xiaoxingxing.love/robots.txt`

除 `robots.txt` 外，均应只显示备案审核关闭页，且不出现进入正式网站的链接。

后端应测试：

- `https://api.xiaoxingxing.love/api/data`
- `https://api.xiaoxingxing.love/api/messages`
- `https://api.xiaoxingxing.love/api/login`
- `https://api.xiaoxingxing.love/api/upload`
- `https://api.xiaoxingxing.love/uploads/nonexistent.jpg`

备案审核模式下，API 与上传路径不应返回原业务数据。

## 备案通过以后如何恢复

恢复必须由网站所有者手动执行。

前端恢复：

1. 将 `vercel.json` 恢复为正式站点路由配置，移除审核期 `/(.*)` catch-all。
2. 确认不再将静态资源、业务页面统一指向 `icp-review.html`。
3. 填入真实 ICP 备案号，不要填写申请中或猜测的编号。
4. 提交并推送到 GitHub，等待 Vercel Production 部署完成。

后端恢复：

1. 修改生产服务器 `/var/www/love-timer-api/.env`：

```ini
ICP_REVIEW_MODE=false
ICP_NUMBER=正式下发的备案号
ICP_URL=https://beian.miit.gov.cn/
PSB_NUMBER=
PSB_URL=
```

2. 重启服务：

```bash
pm2 restart love-timer-api --update-env
```

3. 验证 `GET /api/data`、登录、相册、清单、留言、上传是否按正式权限模型工作。

## 真实备案号在哪里填

后端：

- 生产服务器 `/var/www/love-timer-api/.env`
- `.env.example` 只保留占位，不填真实密钥或正式号码

前端：

- 恢复正式站后，在统一页脚或配置读取位置显示
- 只有 `ICP_NUMBER` 非空时才显示

备案号链接：

- `https://beian.miit.gov.cn/`

## 公安备案成功以后在哪里填

当前保持：

```ini
PSB_NUMBER=
PSB_URL=
```

公安联网备案完成前不显示公安备案编号、图标或链接。完成后由网站所有者手动填写真实编号和真实链接。

## 备案通过后也不建议恢复的能力

- 匿名游客留言
- 游客上传图片
- 游客发布点滴/文章
- 公众注册
- 第三方登录
- 评论区
- 论坛/社区/公众交流平台
- 面向公众的通用文件上传
- 未授权公开音乐文件
- API 调试、测试、数据库管理页面

