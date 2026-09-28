# 毛玻璃个人博客（Glass Blog）

一个**毛玻璃（Glassmorphism）风格**的个人博客系统，带独立的服务器端后台管理。

前端展示 + 后台管理都在同一个 Next.js 应用里，不需要数据库 —— 所有内容以 Markdown / JSON 文件存放在 `content/` 目录，
**拷走 `content/` 就等于带走了整个博客**。

- 站点名称、作者、简介、域名等都由你自己配置，代码里不含任何个人内容

---

## 功能

### 前台

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `/` | 首次访问提示、Hero 名片、音乐+公告（并排）、「这个站都有什么」导览、最新文章（三列）、快速前往/谱面/实用mod（三列）、标签云+最近说说（两列）、留言板+留言表单（两列）。**桌面端一行 2~3 块玻璃** |
| 文章列表 | `/posts` | 即时搜索、标签筛选、三种排序（最新 / 最早 / 最长） |
| 文章详情 | `/posts/[slug]` | Markdown 渲染、代码高亮、KaTeX 公式、自动目录（滚动高亮）、阅读进度条、上下篇导航 |
| 说说 | `/moments` | 短动态，按年份分组，支持配图 / 心情 / 位置 |
| 归档 | `/timeline` | 按年份的时间线，显示文章数与阅读时长 |
| 项目 | `/projects` | 项目卡片网格，支持演示地址与仓库地址 |
| 相册 | `/photowall` | 瀑布流 + 灯箱（方向键切换、Esc 关闭） |
| 友链 | `/friends` | 友链卡片，含「如何交换友链」说明 |
| 关于 | `/about` | 独立 Markdown 页面，可在后台编辑 |
| 文件 | `/files` | 自制谱面、实用 mod 等，按分类选项卡展示；文件托管在 OpenList，点击跳转下载页 |
| 音乐 | 首页毛玻璃分区 | 显示当前曲目与进度；支持自动播放、网易云扫码登录、官方外链兜底 |
| 订阅 | `/rss.xml` | RSS 2.0 |
| SEO | `/sitemap.xml`、`/robots.txt` | 自动生成 |

**配色**：浅色是「浅粉 → 白」渐变，深色是「深紫 → 黑」渐变，主色为玫瑰粉 `#e8578a`。

**新人友好**：
- 首次访问顶部有一条可关闭的欢迎提示，直接指向导览区（关掉后不再出现）；
- 首页有一块「这个站都有什么」，逐项说明九个板块各装什么，
  并特别标出**「关于」里有关于我的一切（介绍、联系方式）**；
- Hero 里还有「更多关于我 →」直达入口；
- 九个导航项都带一句话说明（桌面悬停可见，移动端菜单直接显示）。

**特性**：浅色 / 深色主题（跟随系统，可手动切换，刷新不闪白）、响应式布局、移动端适配、
缓慢漂移的同色系光斑背景、`animate-fade-up` 错落入场动画、回到顶部（带阅读进度环）。

### 音乐播放器

- 在后台「站点设置 → 音乐播放器」里填网易云歌单 ID（**也可以直接粘贴歌单分享链接**）。
  拉取时会在服务端并发探测可播性，只保留能播的条目。
- 前台不再是悬浮播放器，而是**主页上的一个毛玻璃分区**，显示当前曲目、歌手、进度与控制。
- **扫码登录网易云**：后台同一页面点「扫码登录网易云」，用 App 扫码即可
  （不接触密码）。登录后：
  - 可以**按关键词搜索歌曲**，点「加入」把歌加进自定义播放列表；
  - 播放列表可在「播放歌单」和「播放我挑选的」之间切换；
  - 会员 VIP 曲目通过 `song/enhance/player/url` 解析播放地址（未登录时该接口返回 `url=null`）。
- 播放时通过 `/api/music/url` 实时解析，并把 CDN 的 `http` 改写成 `https`
  （否则 HTTPS 页面会被混合内容拦掉）。**音频由网易云 CDN 直供，不占服务器带宽。**
- **官方外链兜底（与自建播放器并存）**：
  - 每首歌旁边和播放器页脚都有「去网易云听」，点开跳到该曲的网易云页面
    （访客若自己有会员，在那边登录即可播会员曲目）；
  - 解析不出播放地址时（典型是会员曲目且本站未登录），播放器会**自动换成网易云官方外链播放器**
    （`music.163.com/outchain/player` 的 iframe，实测可嵌入），而不是干巴巴报错。
- **自动播放**：后台可开关。注意浏览器一律拦截「带声音的自动播放」（Chrome/Safari/Edge 都是策略，代码绕不过），
  所以实现为：进入页面立刻尝试 → 被拦就在用户**第一次点击/触摸/按键**时自动开始，并在分区上提示
  「点击页面任意处开始播放」。老访客若已被浏览器判定为高频互动站点，往往能直接响。
- 音量记忆存在本地。

> ⚠️ **登录凭据**保存在 `content/.netease.json`（已在 `.gitignore` 中，任何接口都不会把它返回给前端）。
> 用个人会员账号给公开站点供曲违反网易云服务条款，**存在封号风险**，请自行权衡。
- 也可用命令行刷新（适合放 cron）：
  ```bash
  node scripts/refresh-music.mjs            # 用已保存的歌单 ID
  node scripts/refresh-music.mjs 3778678 60 # 指定歌单 ID + 最多扫描 60 首
  ```

### 文件（OpenList 联动）

自制谱面、实用 mod 这些 zip/7z 动辄几十 MB，放本站会占满磁盘，
所以**文件本体留在 OpenList**，本站只同步文件名清单并做展示。

每个分类对应 OpenList 上的一个目录，前台就是一个选项卡（默认「谱面」+「实用mod」）。

- 后台「站点设置 → 文件」填 OpenList 地址，按分类配置目录，点 **更新文件** 即同步。
- 分类可以随时增删改（显示名 / 目录 / 图标 / 说明），加第三个分类不用改代码。
- **OpenList 上新增或删除文件后，再点一次「更新文件」就会跟着变**——
  新增的出现、删掉的自动消失，并会告诉你每个分类「新增 N 个 / 移除 M 个」。
- 后台概览页也放了同一个「更新文件」按钮，方便随手点。
- 前台点击文件名会在新标签页打开 OpenList 对应文件的下载页；`?tab=<分类key>` 可直接分享某个分类。
- 缓存写在 `content/files.json`；某个分类拉取失败时，它仍展示上一次的缓存。
- 命令行同步（适合放 cron）：
  ```bash
  node scripts/refresh-files.mjs
  ```

> OpenList 的 `/api/fs/list` 需要允许匿名访问（未开「隐藏文件列表」、未设访问密码）。
> 由于 OpenList 多为 http 而本站是 https，谱面用的是普通 `<a>` 跳转 ——
> 这不属于混合内容（只有图片/脚本/iframe 这类子资源才会被浏览器拦截）。

### 后台（`/admin`）

- **Markdown 编辑器**：工具栏、实时预览（走服务端渲染，与正式页面完全一致）、
  图片粘贴 / 拖拽上传、`Ctrl/Cmd + S` 保存、字数与阅读时长统计
- **文章管理**：草稿 / 发布切换、置顶、删除、搜索与筛选
- **内容管理**：说说、友链、项目、相册、时间线，全部结构化编辑，支持排序与图片上传
- **音乐播放器**：绑定网易云歌单，一键拉取并自动过滤不可播放的歌曲
- **站点设置**：站点信息、社交链接、头像上传、关于页面、修改密码
- **认证**：scrypt 哈希密码 + HMAC 签名 Cookie 会话，未登录访问后台自动跳转登录页

---

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 框架 | Next.js 16（App Router / React Server Components） |
| UI | React 19 + Tailwind CSS v4（自定义 `@utility` 毛玻璃层） |
| 内容 | Markdown + JSON 文件（`gray-matter` 解析 frontmatter） |
| 渲染 | unified / remark / rehype + `rehype-katex` + `rehype-highlight` |
| 图标 | lucide-react + 自绘品牌 SVG |
| 部署 | systemd + Nginx 反向代理 + Let's Encrypt |

> 运行时所有页面都是**动态渲染**（根布局里 `dynamic = "force-dynamic"`），
> 所以后台改完内容刷新前台就能看到，不需要重新构建。

---

## 目录结构

```
orangy-blog/
├── app/
│   ├── layout.tsx              # 根布局（字体、主题脚本、导航/页脚）
│   ├── globals.css             # 设计系统：变量、玻璃 utility、文章排版
│   ├── page.tsx                # 首页
│   ├── posts/                  # 文章列表 + 详情
│   ├── moments|timeline|projects|photowall|friends|about/
│   ├── admin/                  # 后台（(dash) 是带鉴权的路由组）
│   ├── api/                    # 后台接口：auth / posts / upload / preview / settings / collections
│   └── uploads/[...path]/      # 读取上传的图片
├── components/
│   ├── site/                   # 导航、页脚、背景、卡片、音乐播放器、品牌图标
│   ├── post/                   # 文章卡片、目录、阅读进度、列表浏览器
│   ├── file/                   # 文件分类选项卡 + 卡片列表 + 首页侧栏卡片
│   └── admin/                  # 侧边栏、登录、编辑器、设置、内容管理、音乐/文件设置
├── lib/
│   ├── posts.ts                # 文章读写（Markdown + frontmatter）
│   ├── site.ts                 # 站点配置与各类 JSON 数据
│   ├── music.ts                # 歌单/自定义曲目、可播性过滤、播放地址
│   ├── netease.ts              # 网易云扫码登录、搜索、VIP 地址解析、凭据管理
│   ├── music-links.ts          # 网易云页面/官方外链播放器 URL（纯函数，客户端可用）
│   ├── files.ts                # OpenList 文件清单同步与缓存（按分类）
│   ├── markdown.ts             # Markdown -> HTML 渲染管线 + 路径定义
│   ├── auth.ts                 # 密码哈希、会话签名、鉴权守卫
│   └── utils.ts                # 日期、字数、slug 等工具
├── content/                    # ★ 全部用户数据（不在仓库里，克隆后为空）
│   ├── posts/*.md              # 文章（frontmatter 控制草稿/置顶/标签等）
│   ├── uploads/                # 后台上传的图片（运行时生成）
│   ├── site.json               # 站点配置
│   ├── moments|friends|projects|photos|timeline.json
│   ├── music.json              # 音乐播放器配置、歌单与自定义曲目
│   ├── .netease.json           # 网易云登录凭据（运行时生成，已 gitignore）
│   ├── files.json              # 文件分类配置与 OpenList 同步下来的清单
│   ├── about.md                # 关于页面
│   └── .auth.json              # 后台凭据（运行时生成，勿提交）
├── deploy/                     # 部署脚本与 Nginx 模板
├── scripts/
│   ├── set-password.mjs        # 初始化 / 重置后台密码
│   ├── refresh-music.mjs       # 命令行刷新网易云歌单
│   └── refresh-files.mjs       # 命令行同步 OpenList 文件
└── public/                     # 站点图标、头像、示例图
```

---

## 从零部署（拿到这个仓库后怎么用）

> **仓库里不含任何个人内容**：`content/`（站点配置、文章、评论、上传的图片、各类凭据）
> 已在 `.gitignore` 中，克隆下来就是**一个空博客**。所有内容都由你自己在后台录入。

```bash
git clone <这个仓库> my-blog && cd my-blog
npm install

# 1) 设置后台密码（会打印出来，请保存）
node scripts/set-password.mjs

# 2) 本地跑起来看看
npm run dev            # http://localhost:3100
```

打开 `/admin` 登录后，按顺序配一遍即可：

| 位置 | 要做什么 |
| --- | --- |
| 站点设置 → 站点信息 | 站名、作者、头像、简介、社交链接（**这是别人了解你的地方**） |
| 站点设置 → 关于页面 | 「关于我」的内容 |
| 站点设置 → 文件 | 填自己的 OpenList 地址与目录，点「更新文件」 |
| 站点设置 → 音乐播放器 | 填歌单 ID 或扫码登录网易云、搜歌加入播放列表 |
| 写文章 | 开始写第一篇 |

### 部署到服务器

```bash
sudo bash deploy/install.sh          # systemd + Nginx 反代（自动识别域名）
sudo bash deploy/enable-ssl.sh       # 申请 Let's Encrypt 证书并切 HTTPS
```

> 站点对外地址默认从请求头自动推导；也可以在 systemd 里设 `ORANGY_SITE_URL=https://你的域名`
> （`install.sh` 已自动写入）。

---

## 本地开发

```bash
npm install
npm run dev          # http://localhost:3100

# 首次需要初始化后台密码
node scripts/set-password.mjs
```

## 部署

```bash
# 一键部署：装依赖、构建、写 systemd 服务、配置 Nginx 反代
sudo bash deploy/install.sh

# 强制重新构建
sudo bash deploy/install.sh --build

# 申请证书并切换 HTTPS（需要域名已解析到本机）
sudo bash deploy/enable-ssl.sh
```

`deploy/install.sh` 会自动选择可用的 Node（>= 20.9），并保留服务器上其它站点配置不变
（它只新增 `/www/server/panel/vhost/nginx/<域名>.conf`）。

## 日常运维

```bash
systemctl status orangy-blog        # 查看状态
systemctl restart orangy-blog       # 重启
journalctl -u orangy-blog -f        # 实时日志

# 更新代码后
cd /path/to/orangy-blog && sudo bash deploy/install.sh --build

# 备份（内容即全部数据）
tar czf orangy-backup-$(date +%F).tar.gz content/

# 重置后台密码
node scripts/set-password.mjs admin 新密码 && systemctl restart orangy-blog

# 刷新网易云歌单（不依赖后台登录，可放 cron）
node scripts/refresh-music.mjs

# 同步 OpenList 文件（上传新文件后跑一次）
node scripts/refresh-files.mjs
```

## 写文章的 frontmatter 格式

```yaml
---
title: "文章标题"
date: "2026-09-27T09:00:00.000Z"
tags: ["标签一", "标签二"]
category: "分类"
cover: "/uploads/xxx.png"   # 可选，留空自动取正文第一张图
excerpt: "摘要"              # 可选，留空自动从正文提取
draft: false                # true = 草稿，前台不可见
pinned: false               # true = 首页置顶
---
```

也可以直接在后台「写文章」里可视化编辑，效果一样。

---

## 说明

- 依赖版本：Next.js 16.3.6 / React 19.3.0 / Tailwind CSS 4.3.3。
- 本项目为**自研实现**，设计风格参考了 Glassmorphism 设计语言，代码可自由使用与修改。
