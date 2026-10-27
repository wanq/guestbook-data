# guestbook-data

钟云声个人主页 + GitHub Issues 留言板，部署在 Vercel。

留言与站点开关都走 **同源 `/api/*` 服务端**，浏览器不再持有 GitHub token。

## 安全修复说明

此前仓库里曾硬编码 classic PAT和管理密码相关注释。请务必：

1. **立刻撤销** 旧的 leaked classic PAT（GitHub → Settings → Developer settings → Personal access tokens）
2. 新建**仅本仓库 Issues 读写**的 token（fine-grained 推荐；或 classic 仅勾选本公开仓所需最小权限）
3. 把新 token 和强管理密码只放进 **Vercel 环境变量**，不要写进任何前端文件或再提交到 Git

> 云端签到 / `wb-checkin` 使用另一套 WorkBuddy JWT，与本仓库的 `GITHUB_TOKEN` **无关**。撤销留言板旧 PAT、改本站 env **不会**影响签到。

## 必需的 Vercel 环境变量

| 变量 | 说明 |
|------|------|
| `GITHUB_TOKEN` | GitHub PAT。需对本仓库 Issues 有 read/write。**不要**提交到仓库。 |
| `ADMIN_PASSWORD` | 管理控制台明文密码（服务端比对）。用于 `/control.html`、主页管理弹窗、删除留言、改站点开关。 |

在 Vercel 项目 → Settings → Environment Variables 中配置后 **Redeploy**。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/messages` | 列出标题以 `[留言]` 开头的 open issues |
| POST | `/api/messages` | body `{ "name", "message" }` 创建留言（轻量按 IP 限流） |
| DELETE | `/api/messages?number=N` | 关闭留言；需 `x-admin-password` 或 `Authorization: Bearer <ADMIN_PASSWORD>` |
| GET | `/api/site-config` | 公开读取 `[SITE_CONFIG]`（active / expireAt / message） |
| POST | `/api/site-config` | 更新站点开关；需管理密码头 |
| POST | `/api/admin/login` | body `{ "password" }` 校验管理密码 |

`/` 仍由 `/api/index` 做关站门禁后返回 `home.html`。

## 本地文件

- `home.html` — 个人主页 + 留言
- `control.html` — 链接控制台（无密钥；写操作需管理密码）
- `api/` — Vercel Serverless
- `lib/` — 服务端共用逻辑（token / 鉴权 / HTML escape）

## 部署检查清单

1. 撤销旧 leaked PAT  
2. 创建新 scoped `GITHUB_TOKEN`  
3. 设置 `ADMIN_PASSWORD`（换掉历史上暴露过的弱口令）  
4. Vercel 写入上述 env 并 redeploy  
5. 打开站点试留言；用新密码登录管理台试开关 / 删留言  
