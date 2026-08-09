# 需要本人在控制台完成的事项

这份文件只列需要网站所有者本人在云平台或备案系统中确认/执行的动作。不要删除服务器、不要删除网站文件、不要删除数据库、不要删除 uploads、不要注销域名。

## 1. 阿里云 ICP 备案控制台

1. 登录阿里云控制台。
2. 进入“ICP备案”。
3. 查看 `xiaoxingxing.love` 当前订单状态。
4. 确认状态仍为等待通信管理局审核。
5. 如果接入商或管局要求“网站需暂停访问”，当前代码层已经暂停；如对方明确要求“暂停解析”，再执行第 2 节的 DNS 暂停解析步骤。
6. 不要填写未正式下发的 ICP 备案号。

## 2. 阿里云 DNS

当前 DNS 查询结果：

- `xiaoxingxing.love` A：`216.198.79.1`
- `www.xiaoxingxing.love` CNAME：`bdcdc5449e0bd13a.vercel-dns-017.com`
- `api.xiaoxingxing.love` A：`139.196.92.218`
- 未发现 AAAA 记录

当前无需盲目删除 DNS，因为四个 Web 入口已经不会进入正式网站。

如果管局或接入商明确要求暂停 Web 解析：

1. 登录阿里云控制台。
2. 进入“云解析 DNS”。
3. 选择域名 `xiaoxingxing.love`。
4. 找到主机记录为 `@`、类型为 `A`、记录值为 `216.198.79.1` 的记录。
5. 使用“暂停”或“禁用”解析，不要删除。
6. 找到主机记录为 `www`、类型为 `CNAME`、记录值为 `bdcdc5449e0bd13a.vercel-dns-017.com` 的记录。
7. 使用“暂停”或“禁用”解析，不要删除。
8. 如果对方要求 API 域名也暂停，找到主机记录为 `api`、类型为 `A`、记录值为 `139.196.92.218` 的记录，也只暂停，不删除。

不要动这些记录，除非你明确知道用途：

- MX
- TXT
- CAA
- 域名验证记录
- 邮箱记录
- 其他非 Web 业务记录

## 3. Vercel

1. 登录 Vercel。
2. 进入对应项目。
3. 打开 Domains。
4. 确认 `www.xiaoxingxing.love` 和 `xiaoxingxing.love` 都绑定在当前 Production 项目上。
5. 打开 Deployments。
6. 确认 Production 部署已经 Ready。
7. 确认没有把 `www.xiaoxingxing.love` 指到旧的 Preview Deployment。
8. 不要重新部署正式网站旧版本。

当前线上已验证 `www` 与裸域最终进入同一个关闭页。

## 4. ECS / PM2 / Nginx

当前 API 域名由 ECS 提供，服务进程为 `love-timer-api`。

审核期建议保持：

```bash
ICP_REVIEW_MODE=true
pm2 restart love-timer-api --update-env
```

如果接入商明确要求服务器层直接返回关闭页，而不是应用层返回：

1. 登录 ECS。
2. 备份 Nginx 站点配置。
3. 只修改 `api.xiaoxingxing.love` 对应 server block。
4. 让该 server block 返回 403 或 503 极简关闭响应。
5. 不要删除 `/var/www/love-timer-api`。
6. 不要删除 `/var/www/love-timer-api/server-data`。
7. 不要删除 `/var/www/love-timer-api/server-data/uploads`。

当前代码层已实现 API 与 uploads 关闭；除非接入商要求，不需要停止 PM2 或删除站点文件。

## 5. OSS / CDN / WAF / 负载均衡

本次项目扫描未发现 OSS、对象存储 SDK、Cloudflare 或阿里云 CDN 配置。

如果阿里云控制台里额外配置过 CDN、WAF、负载均衡或 OSS 静态网站，请逐项确认：

1. 是否绑定 `xiaoxingxing.love`、`www.xiaoxingxing.love` 或 `api.xiaoxingxing.love`。
2. 是否缓存了旧的 HTML、JS、图片或音乐。
3. 是否存在回源到旧服务器的规则。
4. 审核期如需暂停，只暂停对应 Web 域名加速或回源，不删除源文件和 bucket。

## 6. SSL 证书

不要删除证书。当前 HTTP 会跳转 HTTPS，HTTPS 返回关闭页。证书保留有利于审核访问和后续恢复。

## 7. 备案通过后人工恢复

备案通过后再执行：

1. 获取真实 ICP 备案号。
2. 在后端生产 `.env` 填入真实 `ICP_NUMBER`。
3. 将 `ICP_REVIEW_MODE=false`。
4. 重启 API：

```bash
pm2 restart love-timer-api --update-env
```

5. 恢复前端正式路由，推送并等待 Vercel Production Ready。
6. 检查页脚备案号是否只在真实编号存在时显示，并链接到工信部备案系统。
7. 开始或继续公安联网备案，成功后再填写真实公安备案信息。

