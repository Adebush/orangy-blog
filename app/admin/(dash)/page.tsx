import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  FolderGit2,
  Images,
  Link as LinkIcon,
  MessageCircle,
  PenSquare,
  Settings,
  Tag as TagIcon,
} from "lucide-react";
import { listPosts, getTags } from "@/lib/posts";
import { getFriends, getMoments, getPhotos, getProjects, getSite } from "@/lib/site";
import { getFilesConfig } from "@/lib/files";
import { FilesRefreshButton } from "@/components/admin/FilesRefreshButton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "概览" };

export default async function AdminDashboard() {
  const [site, posts, tags, moments, friends, projects, photos, files] = await Promise.all([
    getSite(),
    listPosts({ includeDrafts: true }),
    getTags(),
    getMoments(),
    getFriends(),
    getProjects(),
    getPhotos(),
    getFilesConfig(),
  ]);
  const filesSummary = files.categories
    .filter((c) => c.enabled)
    .map((c) => `${c.label} ${(files.items[c.key] ?? []).length}`)
    .join(" · ");

  const published = posts.filter((p) => !p.draft);
  const drafts = posts.filter((p) => p.draft);
  const totalWords = posts.reduce((sum, p) => sum + p.words, 0);

  const stats = [
    { label: "已发布", value: published.length, icon: FileText, href: "/admin/posts" },
    { label: "草稿", value: drafts.length, icon: FileText, href: "/admin/posts?filter=draft" },
    { label: "标签", value: tags.length, icon: TagIcon, href: "/admin/posts" },
    { label: "说说", value: moments.length, icon: MessageCircle, href: "/admin/collections?type=moments" },
    { label: "友链", value: friends.length, icon: LinkIcon, href: "/admin/collections?type=friends" },
    { label: "项目", value: projects.length, icon: FolderGit2, href: "/admin/collections?type=projects" },
    { label: "照片", value: photos.length, icon: Images, href: "/admin/collections?type=photos" },
    { label: "总字数", value: totalWords, icon: CalendarDays, href: "/admin/posts" },
  ];

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-sheen animate-fade-up relative overflow-hidden rounded-3xl p-6 sm:p-7">
        <div className="pointer-events-none absolute -top-20 -right-14 h-48 w-48 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              欢迎回来，<span className="text-gradient">{site.author || site.title}</span>
            </h1>
            <p className="text-soft mt-1.5 text-sm">
              这里可以写文章、管理内容与调整站点设置，改动会立即生效。
            </p>
          </div>
          <Link
            href="/admin/editor"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl"
          >
            <PenSquare className="h-4 w-4" />
            写新文章
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className="glass glass-sheen glass-hover animate-fade-up rounded-3xl p-4"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <s.icon className="text-brand-500 h-4 w-4" />
            <p className="mt-2.5 text-2xl font-bold tracking-tight">{s.value}</p>
            <p className="text-muted mt-0.5 text-xs">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">最近的文章</h2>
            <Link
              href="/admin/posts"
              className="text-brand-500 flex items-center gap-1 text-xs font-medium hover:gap-2 transition-all"
            >
              全部文章 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <ul className="divide-y divide-white/20 dark:divide-white/8">
            {posts.slice(0, 6).map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/admin/editor/${encodeURIComponent(p.slug)}`}
                  className="group flex items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium transition-colors group-hover:text-brand-500">
                      {p.title}
                    </span>
                    <span className="text-muted mt-0.5 block text-xs">
                      {formatDate(p.date)} · {p.words} 字 · {p.category}
                    </span>
                  </span>
                  {p.draft ? (
                    <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-[0.7rem] text-amber-600 dark:text-amber-400">
                      草稿
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.7rem] text-emerald-600 dark:text-emerald-400">
                      已发布
                    </span>
                  )}
                </Link>
              </li>
            ))}
            {posts.length === 0 && (
              <li className="text-muted py-8 text-center text-sm">
                还没有文章，点右上角「写新文章」开始吧
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-5">
          <div className="glass glass-sheen rounded-3xl p-5">
            <h2 className="font-bold">快捷操作</h2>
            <div className="mt-3.5 space-y-2">
              {[
                { href: "/admin/editor", label: "写新文章", icon: PenSquare },
                { href: "/admin/collections?type=moments", label: "发一条说说", icon: MessageCircle },
                { href: "/admin/collections?type=friends", label: "管理友链", icon: LinkIcon },
                { href: "/admin/settings", label: "站点设置", icon: Settings },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="glass-soft hover:bg-brand-500/12 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors"
                >
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </Link>
              ))}

              {/* OpenList 上传新文件后，点这里一键同步 */}
              <FilesRefreshButton summary={filesSummary} />
            </div>
          </div>

          <div className="glass glass-sheen rounded-3xl p-5">
            <h2 className="font-bold">站点信息</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">站名</dt>
                <dd className="truncate font-medium">{site.title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">作者</dt>
                <dd className="truncate font-medium">{site.author}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">起始年份</dt>
                <dd className="font-medium">{site.startYear}</dd>
              </div>
            </dl>
            <Link
              href="/admin/settings"
              className="text-brand-500 mt-4 flex items-center gap-1 text-xs font-medium hover:gap-2 transition-all"
            >
              去修改 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
