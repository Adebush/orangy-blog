"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSearch, Search, X } from "lucide-react";
import { PostCard } from "./PostCard";
import type { PostMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "new" | "old" | "long";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "new", label: "最新" },
  { key: "old", label: "最早" },
  { key: "long", label: "最长" },
];

export function PostsExplorer({
  posts,
  tags,
  initialQuery = "",
  initialTag = "",
}: {
  posts: PostMeta[];
  tags: { tag: string; count: number }[];
  initialQuery?: string;
  initialTag?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);
  const [sort, setSort] = useState<SortKey>("new");

  // 让筛选状态同步进地址栏，方便分享 / 刷新保持
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/posts?${qs}` : "/posts");
  }, [query, tag]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = posts;
    if (tag) list = list.filter((p) => p.tags.includes(tag));
    if (q) {
      list = list.filter((p) =>
        [p.title, p.excerpt, p.category, p.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (sort === "old") list = [...list].reverse();
    if (sort === "long") list = [...list].sort((a, b) => b.readingTime - a.readingTime);
    return list;
  }, [posts, query, tag, sort]);

  const hasFilter = Boolean(query.trim() || tag);

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      <div className="glass glass-sheen animate-fade-up rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="glass-soft relative flex flex-1 items-center rounded-2xl px-3.5">
            <Search className="text-muted h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、摘要、标签…"
              aria-label="搜索文章"
              className="w-full bg-transparent px-2.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清空搜索"
                className="text-muted hover:text-brand-500 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="glass-soft flex shrink-0 items-center gap-1 rounded-2xl p-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  sort === s.key
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "text-soft hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTag("")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                tag === ""
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "glass-soft text-soft hover:text-brand-500",
              )}
            >
              全部 {posts.length}
            </button>
            {tags.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => setTag((cur) => (cur === t.tag ? "" : t.tag))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  tag === t.tag
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "glass-soft text-soft hover:text-brand-500",
                )}
              >
                {t.tag}
                <span className="ml-1 opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 结果统计 */}
      <p className="text-muted px-1 text-sm">
        共 <span className="text-brand-500 font-semibold">{filtered.length}</span> 篇文章
        {tag && <span> · 标签「{tag}」</span>}
        {query.trim() && <span> · 关键词「{query.trim()}」</span>}
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTag("");
            }}
            className="text-brand-500 ml-3 hover:underline"
          >
            清除筛选
          </button>
        )}
      </p>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <PostCard key={p.slug} post={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass glass-sheen rounded-3xl p-12 text-center">
          <FileSearch className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">没有匹配的文章</p>
          <p className="text-muted mt-1 text-sm">换个关键词或标签试试看</p>
        </div>
      )}
    </div>
  );
}
