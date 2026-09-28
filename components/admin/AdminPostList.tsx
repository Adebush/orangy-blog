"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FileSearch,
  Loader2,
  PenLine,
  Pin,
  PinOff,
  Search,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { PostMeta } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type Filter = "all" | "published" | "draft";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "published", label: "已发布" },
  { key: "draft", label: "草稿" },
];

export function AdminPostList({ posts }: { posts: PostMeta[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = posts;
    if (filter === "published") list = list.filter((p) => !p.draft);
    if (filter === "draft") list = list.filter((p) => p.draft);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.title, p.category, p.tags.join(" ")].join(" ").toLowerCase().includes(q),
      );
    }
    return list;
  }, [posts, filter, query]);

  /** 切换置顶 / 草稿：先取回完整文章，再整体回写 */
  async function toggle(slug: string, field: "draft" | "pinned") {
    setBusy(`${slug}:${field}`);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
      const data = (await res.json()) as { ok: boolean; post?: PostMeta & { content: string } };
      if (!data.ok || !data.post) return;
      const p = data.post;
      await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.title,
          date: p.date,
          tags: p.tags,
          category: p.category,
          cover: p.cover ?? "",
          excerpt: p.excerpt,
          draft: field === "draft" ? !p.draft : p.draft,
          pinned: field === "pinned" ? !p.pinned : p.pinned,
          content: p.content,
        }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(slug: string, title: string) {
    if (!window.confirm(`确定要删除《${title}》吗？此操作不可撤销。`)) return;
    setBusy(`${slug}:delete`);
    try {
      await fetch(`/api/posts/${encodeURIComponent(slug)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass glass-sheen rounded-3xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="glass-soft relative flex flex-1 items-center rounded-2xl px-3.5">
            <Search className="text-muted h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文章标题、分类、标签…"
              className="w-full bg-transparent px-2.5 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="glass-soft flex shrink-0 items-center gap-1 rounded-2xl p-1">
            {FILTERS.map((f) => {
              const count =
                f.key === "all"
                  ? posts.length
                  : f.key === "published"
                    ? posts.filter((p) => !p.draft).length
                    : posts.filter((p) => p.draft).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                    filter === f.key
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                      : "text-soft hover:text-ink",
                  )}
                >
                  {f.label} {count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass glass-sheen rounded-3xl p-12 text-center">
          <FileSearch className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">没有匹配的文章</p>
          <Link href="/admin/editor" className="text-brand-500 mt-2 inline-block text-sm hover:underline">
            去写一篇新的
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((p) => (
            <li
              key={p.slug}
              className="glass glass-sheen animate-fade-up flex flex-wrap items-center gap-3 rounded-3xl p-3.5 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/editor/${encodeURIComponent(p.slug)}`}
                    className="hover:text-brand-500 truncate font-semibold transition-colors"
                  >
                    {p.title}
                  </Link>
                  {p.pinned && <Pin className="h-3 w-3 shrink-0 text-brand-500" />}
                  {p.draft ? (
                    <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.68rem] text-amber-600 dark:text-amber-400">
                      草稿
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.68rem] text-emerald-600 dark:text-emerald-400">
                      已发布
                    </span>
                  )}
                </div>
                <p className="text-muted mt-1 truncate text-xs">
                  {formatDate(p.date)} · {p.category} · {p.words} 字 · {p.readingTime} 分钟
                  {p.tags.length > 0 && ` · ${p.tags.map((t) => `#${t}`).join(" ")}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/admin/editor/${encodeURIComponent(p.slug)}`}
                  title="编辑"
                  className="glass-soft hover:text-brand-500 grid h-9 w-9 place-items-center rounded-xl transition-colors"
                >
                  <PenLine className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(p.slug, "pinned")}
                  disabled={busy === `${p.slug}:pinned`}
                  title={p.pinned ? "取消置顶" : "置顶"}
                  className={cn(
                    "glass-soft grid h-9 w-9 place-items-center rounded-xl transition-colors",
                    p.pinned ? "text-brand-500" : "hover:text-brand-500",
                  )}
                >
                  {busy === `${p.slug}:pinned` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : p.pinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(p.slug, "draft")}
                  disabled={busy === `${p.slug}:draft`}
                  title={p.draft ? "发布" : "转为草稿"}
                  className="glass-soft hover:text-brand-500 grid h-9 w-9 place-items-center rounded-xl transition-colors"
                >
                  {busy === `${p.slug}:draft` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : p.draft ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.slug, p.title)}
                  disabled={busy === `${p.slug}:delete`}
                  title="删除"
                  className="glass-soft grid h-9 w-9 place-items-center rounded-xl text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
                >
                  {busy === `${p.slug}:delete` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
