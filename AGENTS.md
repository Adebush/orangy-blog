# 毛玻璃博客 —— 开发约定

毛玻璃（Glassmorphism）风格个人博客。**Next.js 16 App Router + React 19 + TypeScript(strict) + Tailwind CSS v4**。

- 项目根目录：仓库根目录（`app/`、`components/`、`lib/`、`content/`、`deploy/`、`scripts/`）
- 内容目录：`content/`（Markdown 文章 + JSON 数据），运行时读写，**热生效**
- 根 `app/layout.tsx` 已声明 `export const dynamic = "force-dynamic"`，页面无需重复声明
- 站点名：由 `content/site.json` 的 `title` 决定；主色为玫瑰粉 `brand-*`（见 `app/globals.css` 的 `--color-brand-500`）

## 重要：环境注意事项

1. **lucide-react 是 v1，已移除品牌图标**：`Github` / `Twitter` / `Youtube` / `LucideIcon` 类型**都不存在**。
   - 品牌图标用 `@/components/site/BrandIcons`：`GithubIcon`、`XIcon`、`YoutubeIcon`、`BilibiliIcon`
   - 图标类型用 `IconType`（从 `@/components/site/BrandIcons` 导入），不要用 `LucideIcon`
2. **不要使用 `next/image`**。`next.config.ts` 里 `images.unoptimized = true`，一律用原生 `<img>`，
   并在上一行加 `{/* eslint-disable-next-line @next/next/no-img-element */}`。
3. **不要运行 `next build` 或 `next dev`**（.next 目录会被并发写坏）。只允许 `npx tsc --noEmit` 做类型检查。
4. 服务器时钟是 2026 年，依赖版本较新，不要升级或降级任何依赖。

## 设计系统（`app/globals.css`）

自定义 utility（可直接当 class 用）：

| class | 作用 |
| --- | --- |
| `glass` | 标准玻璃面板：半透明 + 模糊 + 描边 + 阴影 |
| `glass-strong` | 更实的玻璃（弹窗、重要卡片） |
| `glass-soft` | 轻玻璃（小标签、次级块） |
| `glass-sheen` | 顶部 1px 高光，让玻璃更像玻璃（常与上面的组合） |
| `glass-hover` | 悬停上浮 4px + 阴影加深 + 边框转品牌色 |
| `text-ink` / `text-soft` / `text-muted` | 三级文字色 |
| `text-gradient` | 玫瑰粉→紫渐变文字 |
| `animate-fade-up` / `animate-fade-in` / `animate-float` / `animate-blob` | 动画 |
| `article-prose` | Markdown 正文排版样式（h2 带品牌色竖条、代码块、表格、KaTeX 等） |
| `no-scrollbar` | 隐藏滚动条 |

圆角偏好：卡片 `rounded-3xl`，大区块 `rounded-4xl`，小元素 `rounded-2xl`，胶囊 `rounded-full`。

常用组合：`className="glass glass-sheen glass-hover rounded-3xl p-6"`

自动加载 `animate-fade-up` 时用 `style={{ animationDelay: \`${i * 60}ms\` }}` 做错落入场。

## 可复用组件

- `@/components/site/Cards`：`SectionHeader`（区块标题，props: `title/subtitle/href/linkLabel`）、
  `ProfileCard({site})`、`TagCloud({tags})`、`RecentMoments({moments})`、`QuickLinks({postCount})`
- `@/components/post/PostCard`：`PostCard({post, index})`
- `@/components/post/Toc`：`Toc({items})`（客户端，滚动高亮）
- `@/components/post/ReadingProgress`：无 props
- `@/components/site/BrandIcons`：品牌 SVG + `IconType`
- `@/lib/utils`：`cn()`、`formatDate()`、`formatDateCN()`、`relativeTime()`、`countWords()`、`readingTime()`、`makeExcerpt()`、`firstImage()`、`createSlugger()`、`toSafeSlug()`

## 数据层 API（全部是 async，服务端组件里直接 await）

```ts
// @/lib/posts
listPosts({ includeDrafts?: boolean }): Promise<PostMeta[]>          // 置顶优先，再按时间倒序
getPost(slug, { includeDrafts?: boolean }): Promise<Post | null>     // Post 含 content/html/toc
getAdjacentPosts(slug): Promise<{ prev: PostMeta | null; next: PostMeta | null }>
getTags(): Promise<{ tag: string; count: number }[]>
getCategories(): Promise<{ tag: string; count: number }[]>
getArchive(): Promise<{ year: string; posts: PostMeta[] }[]>
searchPosts(posts, query): PostMeta[]

// @/lib/site
getSite(): Promise<SiteConfig>
getMoments(): Promise<Moment[]>        // 已按时间倒序
getFriends(): Promise<Friend[]>
getProjects(): Promise<Project[]>
getPhotos(): Promise<Photo[]>
getTimeline(): Promise<TimelineItem[]> // 已按时间倒序
getAbout(): Promise<{ markdown: string; html: string }>
```

类型定义见 `@/lib/types.ts`（`PostMeta`、`Post`、`SiteConfig`、`Moment`、`Friend`、`Project`、`Photo`、`TimelineItem`、`TocItem`）。
`@/lib/nav` 导出 `NAV_ITEMS`（**纯常量，无 Node 依赖，可在客户端组件里安全导入**）。
`@/lib/site` 与 `@/lib/posts` **依赖 `node:fs`，绝对不能在客户端组件（`"use client"`）里导入**。

## 页面代码风格

- 每个页面 `export const metadata` 或 `generateMetadata` 设置标题。
- 空状态要有友好提示（图标 + 文案 + 引导链接）。
- 中文文案，`text-sm`/`text-xs` 用于次要信息，标题用 `font-bold tracking-tight`。
- 移动端优先：先写单列，再用 `sm:` / `lg:` 加分栏。
- 服务端组件优先；只有需要交互（状态、事件、滚动监听）时才拆出 `"use client"` 子组件。
