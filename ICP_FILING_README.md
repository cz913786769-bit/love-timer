# ICP 备案审核模式说明

## 1. 当前备案阶段

网站当前处于首次 ICP 备案的通信管理局最终审核阶段。尚未取得正式 ICP 备案号。

当前启用 `ICP_REVIEW_MODE`，目的是真实暂停公开互联网信息服务，等待备案审核完成。

## 2. ICP_REVIEW_MODE 在哪里设置

前端静态站：

- `icp-review.config.json`
- `vercel.json`

当前 `vercel.json` 将除 `robots.txt` 以外的所有公网路径统一重写到：

- `/icp-review.html`

后端 API：

- `love-timer-api/server-api-updated.js`
- 生产服务器 `/var/www/love-timer-api/.env`

生产服务器需要设置：

```ini
ICP_REVIEW_MODE=true
ICP_NUMBER=
ICP_URL=https://beian.miit.gov.cn/
```

`ICP_NUMBER` 在正式备案号取得前必须保持为空。

## 3. 当前关闭了哪些功能

备案审核模式下，公网访问统一只看到维护/审核页面，以下功能暂停对外开放：

- 首页、相册、恋爱清单、点点滴滴、信件、关于我们
- 留言板和留言提交
- 管理入口、管理员登录页、管理后台
- 添加照片、上传图片、更换封面
- 添加点滴、编辑信件、保存/发布类操作
- API 数据读取与写入
- `/uploads` 上传文件访问
- 背景音乐加载和播放
- 搜索引擎抓取

## 4. 原功能代码在哪里

前端页面仍保留在：

- `pages/index.html`
- `pages/home-20260808h.html`
- `pages/love-album.html`
- `pages/love-list.html`
- `pages/little-things.html`
- `pages/leaving.html`
- `pages/about-us.html`
- `pages/admin-login.html`
- `pages/admin-dashboard.html`

前端数据/API 客户端仍保留在：

- `assets/js/api-client.js`
- `assets/js/admin-core.js`
- `assets/js/admin-data.js`

后端 API 仍保留在：

- `../love-timer-api/server-api-updated.js`

生产数据库和上传文件仍保留在服务器：

- `/var/www/love-timer-api/server-data/love.db`
- `/var/www/love-timer-api/server-data/uploads`

## 5. 如何测试备案模式

前端应测试：

- `https://www.xiaoxingxing.love`
- `https://www.xiaoxingxing.love/pages/love-album.html`
- `https://www.xiaoxingxing.love/pages/leaving.html`
- `https://www.xiaoxingxing.love/pages/admin-login.html`
- `https://www.xiaoxingxing.love/assets/music/there-is-romance.mp3`
- `https://www.xiaoxingxing.love/robots.txt`

除 `robots.txt` 外，均应显示“我们的小宇宙 / 网站备案审核中，暂未开放。/ 感谢访问。”。

后端应测试：

- `https://api.xiaoxingxing.love/api/data`
- `https://api.xiaoxingxing.love/api/messages`
- `https://api.xiaoxingxing.love/api/login`
- `https://api.xiaoxingxing.love/api/upload`
- `https://api.xiaoxingxing.love/uploads/<existing-file>`

备案审核模式下，API 与上传路径应返回关闭状态，不应返回原业务数据。

## 6. 备案成功后如何关闭备案模式

备案审核通过后，由网站所有者确认后再恢复。

前端恢复步骤：

1. 将 `vercel.json` 恢复为正式站点路由配置。
2. 保留 `icp-review.html` 和 `icp-review.config.json` 作为可逆维护工具，或将 `ICP_REVIEW_MODE` 改为 `false` 后保留。
3. 在获得真实备案号后填写 `ICP_NUMBER`。
4. 提交并推送到 GitHub，等待 Vercel 生产部署完成。

后端恢复步骤：

1. 在服务器 `/var/www/love-timer-api/.env` 中设置：

```ini
ICP_REVIEW_MODE=false
ICP_NUMBER=<真实备案号>
ICP_URL=https://beian.miit.gov.cn/
```

2. 重启 PM2：

```bash
pm2 restart love-timer-api
```

3. 测试 API 数据和上传功能是否恢复。

## 7. 如何填入真实 ICP 备案号

备案号只能在管局正式审核通过后，由网站所有者手动填写。

不得使用申请中、猜测、随机或他人的备案号。

推荐环境变量：

```ini
ICP_NUMBER=真实备案号
ICP_URL=https://beian.miit.gov.cn/
```

## 8. 页脚 ICP 备案号在哪里显示

当前尚未取得备案号，所以页面不显示备案号。

备案通过后，可以在正式网站公共页脚统一读取 `ICP_NUMBER`。备案号链接必须指向：

- `https://beian.miit.gov.cn/`

## 9. 哪些功能不建议恢复为公众开放

备案成功后也不建议恢复为公众开放：

- 匿名游客留言
- 游客上传图片
- 游客发布点滴/文章
- 公开注册、第三方登录、论坛、社区类能力
- 面向公众的通用文件上传
- API 调试、测试、demo、数据库管理页面

如果保留留言功能，建议仅允许已认证的指定账户写入。

## 10. 公安联网备案提醒

取得 ICP 备案号后，仍需根据属地要求确认是否需要办理公安联网备案。

如需办理，必须使用真实公安备案信息，不得伪造公安备案号或提前展示尚未取得的公安备案号。

