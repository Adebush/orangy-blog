"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, TriangleAlert, X } from "lucide-react";
import type { FileCategory, FileItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { categoryIcon } from "./categoryIcons";

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EXT_STYLE: Record<string, string> = {
  zip: "bg-brand-500/15 text-brand-700 dark:text-brand-300",
  "7z": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  rar: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export function FilesExplorer({
  categories,
  items,
  initialTab,
  lastError,
}: {
  categories: FileCategory[];
  items: Record<string, FileItem[]>;
  initialTab?: string;
  lastError?: string;
}) {
  const enabled = useMemo(() => categories.filter((c) => c.enabled), [categories]);
  const [tab, setTab] = useState(() => {
    if (initialTab && enabled.some((c) => c.key === initialTab)) return initialTab;
    return enabled[0]?.key ?? "";
  });
  const [query, setQuery] = useState("");

  // 把当前分类同步进地址栏，方便直接分享某个分类
  useEffect(() => {
    if (!tab) return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [tab]);

  const active = enabled.find((c) => c.key === tab) ?? enabled[0];
  const list = useMemo(() => items[active?.key ?? ""] ?? [], [items, active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) => f.title.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
    );
  }, [list, query]);

  const totalSize = useMemo(() => list.reduce((sum, f) => sum + (f.size || 0), 0), [list]);

  if (enabled.length === 0) {
    return (
      <div className="glass glass-sheen rounded-3xl p-12 text-center">
        <p className="font-medium">还没有配置文件分类</p>
        <p className="text-muted mt-1 text-sm">去后台「站点设置 → 文件」里添加</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 分类选项卡 */}
      <div className="glass glass-sheen animate-fade-up flex flex-wrap gap-1 rounded-3xl p-1.5">
        {enabled.map((category) => {
          const Icon = categoryIcon(category.icon);
          const count = (items[category.key] ?? []).length;
          const isActive = category.key === active?.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => {
                setTab(category.key);
                setQuery("");
              }}
              aria-pressed={isActive}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                  : "text-soft hover:text-ink hover:bg-white/45 dark:hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{category.label}</span>
              <span className={cn("text-xs", isActive ? "text-white/75" : "text-muted")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <>
          {/* 分类说明 + 搜索 */}
          <div className="glass glass-sheen animate-fade-up space-y-3 rounded-3xl p-4">
            {active.desc && (
              <p className="text-soft px-1 text-sm">
                {active.desc}
                <span className="text-muted">
                  {" "}
                  · 共 {list.length} 个文件 · 合计 {formatSize(totalSize)}
                </span>
              </p>
            )}
            <div className="glass-soft relative flex items-center rounded-2xl px-3.5">
              <Search className="text-muted h-4 w-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`搜索${active.label}…`}
                aria-label={`搜索${active.label}`}
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
          </div>

          {/* 文件卡片 */}
          {filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((file, i) => {
                const Icon = categoryIcon(active.icon);
                return (
                  <a
                    key={file.name}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={`在 OpenList 打开：${file.name}`}
                    className="glass glass-sheen glass-hover animate-fade-up group flex flex-col rounded-3xl p-5"
                    style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-300/50 to-brand-500/40 dark:from-brand-800/50 dark:to-brand-600/30">
                        <Icon className="text-brand-700 dark:text-brand-200 h-5 w-5" />
                      </span>
                      <ExternalLink className="text-muted h-4 w-4 shrink-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </div>

                    <h3 className="mt-3.5 line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300">
                      {file.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                      {file.ext && (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase",
                            EXT_STYLE[file.ext] ?? "glass-soft text-soft",
                          )}
                        >
                          {file.ext}
                        </span>
                      )}
                      <span className="text-muted text-xs">{formatSize(file.size)}</span>
                      <span className="text-brand-600 dark:text-brand-300 ml-auto text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                        去下载 →
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : list.length === 0 ? (
            <div className="glass glass-sheen rounded-3xl p-12 text-center">
              <TriangleAlert className="text-muted mx-auto h-8 w-8" />
              <p className="mt-3 font-medium">
                {lastError ? "暂时读不到文件列表" : "这个分类下还没有文件"}
              </p>
              {lastError && <p className="text-muted mt-1.5 text-sm">{lastError}</p>}
            </div>
          ) : (
            <div className="glass glass-sheen rounded-3xl p-10 text-center">
              <Search className="text-muted mx-auto h-7 w-7" />
              <p className="mt-3 font-medium">没有匹配的文件</p>
              <p className="text-muted mt-1 text-sm">换个关键词试试</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
