"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  MessageSquare,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Comment, CommentSettings } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

type Filter = "pending" | "approved" | "home" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "home", label: "主页留言" },
  { key: "all", label: "全部" },
];

const inputCls =
  "glass-soft w-full rounded-2xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]";

export function CommentModeration({
  initialComments,
  initialSettings,
}: {
  initialComments: Comment[];
  initialSettings: CommentSettings;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [settings, setSettings] = useState<CommentSettings>(initialSettings);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  }

  const counts = useMemo(
    () => ({
      pending: comments.filter((c) => !c.approved).length,
      approved: comments.filter((c) => c.approved).length,
      home: comments.filter((c) => c.targetType === "home").length,
      all: comments.length,
      featured: comments.filter((c) => c.featured).length,
    }),
    [comments],
  );

  const filtered = useMemo(() => {
    let list = comments;
    if (filter === "pending") list = list.filter((c) => !c.approved);
    if (filter === "approved") list = list.filter((c) => c.approved);
    if (filter === "home") list = list.filter((c) => c.targetType === "home");
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.author, c.content, c.targetTitle, c.email].join(" ").toLowerCase().includes(q),
      );
    }
    return list;
  }, [comments, filter, query]);

  async function patch(id: string, body: { approved?: boolean; featured?: boolean }) {
    setBusy(id);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; comment?: Comment };
      if (!data.ok || !data.comment) {
        flash("err", data.error ?? "操作失败");
        return;
      }
      const updated = data.comment;
      setComments((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, author: string) {
    if (!window.confirm(`确定删除 ${author} 的这条评论吗？`)) return;
    setBusy(id);
    try {
      await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
      setComments((list) => list.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(patchBody: Partial<CommentSettings>) {
    const next = { ...settings, ...patchBody };
    setSettings(next);
    const res = await fetch("/api/comments/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    const data = (await res.json()) as { ok: boolean; settings?: CommentSettings };
    if (data.ok && data.settings) {
      setSettings(data.settings);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      {/* 设置 */}
      <div className="glass glass-sheen rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Settings2 className="h-4 w-4" />
          评论设置
        </h2>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => saveSettings({ enabled: e.target.checked })}
              className="accent-brand-500 h-4 w-4"
            />
            开启评论功能
          </label>
          <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={settings.requireApproval}
              onChange={(e) => saveSettings({ requireApproval: e.target.checked })}
              className="accent-brand-500 h-4 w-4"
            />
            新评论需要审核后才显示
          </label>
        </div>
        <p className="text-muted mt-3 text-xs">
          关闭「需要审核」后，评论会立即出现在前台。主页留言无论是否审核，都只有被勾选
          <span className="text-brand-600 dark:text-brand-300">「展示到主页」</span>
          的才会以弹幕形式出现。
          当前弹幕 {counts.featured} 条。
        </p>
      </div>

      {message && (
        <div
          className={cn(
            "animate-fade-up flex items-center gap-2 rounded-2xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/12 text-red-600 dark:text-red-400",
          )}
        >
          {message.type === "ok" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* 筛选 */}
      <div className="glass glass-sheen space-y-3 rounded-3xl p-4">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-2xl px-3.5 py-2 text-sm font-medium transition-all",
                filter === f.key
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                  : "text-soft hover:bg-white/45 dark:hover:bg-white/10",
              )}
            >
              {f.label}
              <span className={cn("ml-1.5 text-xs", filter === f.key ? "text-white/75" : "text-muted")}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索昵称、内容、页面…"
          className={inputCls}
        />
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="glass glass-sheen rounded-3xl p-12 text-center">
          <MessageSquare className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">
            {filter === "pending" ? "没有待审核的评论，很干净 🎉" : "没有匹配的评论"}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((comment) => (
            <li key={comment.id} className="glass glass-sheen animate-fade-up rounded-3xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-brand-500/15 text-brand-700 dark:text-brand-300 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold">
                  {comment.author.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-sm font-semibold">{comment.author}</span>
                {comment.email && <span className="text-muted text-xs">{comment.email}</span>}
                <time className="text-muted text-xs">{relativeTime(comment.createdAt)}</time>

                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.68rem]",
                    comment.approved
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {comment.approved ? "已通过" : "待审核"}
                </span>

                {comment.targetType === "home" && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.68rem]",
                      comment.featured
                        ? "bg-brand-500/20 text-brand-700 dark:text-brand-300"
                        : "glass-soft text-muted",
                    )}
                  >
                    {comment.featured ? "弹幕中" : "未上弹幕"}
                  </span>
                )}

                <Link
                  href={comment.targetUrl || "/"}
                  target="_blank"
                  className="text-muted hover:text-brand-500 ml-auto flex items-center gap-1 text-xs transition-colors"
                >
                  {comment.targetTitle || comment.target}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <p className="text-soft mt-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {comment.content}
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch(comment.id, { approved: !comment.approved })}
                  disabled={busy === comment.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-medium transition-colors",
                    comment.approved
                      ? "glass-soft hover:text-amber-600"
                      : "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400",
                  )}
                >
                  {busy === comment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : comment.approved ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {comment.approved ? "取消通过" : "通过"}
                </button>

                {comment.targetType === "home" && (
                  <button
                    type="button"
                    onClick={() => patch(comment.id, { featured: !comment.featured })}
                    disabled={busy === comment.id || !comment.approved}
                    title={!comment.approved ? "先通过审核才能上弹幕" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                      comment.featured
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                        : "glass-soft hover:text-brand-600 dark:hover:text-brand-300",
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {comment.featured ? "取消展示到主页" : "展示到主页"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => remove(comment.id, comment.author)}
                  disabled={busy === comment.id}
                  className="glass-soft ml-auto flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
