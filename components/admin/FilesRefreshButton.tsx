"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 「更新文件」按钮：重新从 OpenList 同步所有分类。
 * 放在后台概览页，方便 OpenList 上传新文件后一键同步。
 */
export function FilesRefreshButton({ summary }: { summary: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function refresh() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/files/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        files?: {
          categories: { key: string; label: string; enabled: boolean }[];
          items: Record<string, unknown[]>;
        };
        changes?: Record<string, { added: string[]; removed: string[] }>;
      };
      if (!data.ok || !data.files) {
        setResult({ type: "err", text: data.error ?? "更新失败" });
        return;
      }
      const parts = data.files.categories
        .filter((c) => c.enabled)
        .map((c) => {
          const n = (data.files?.items[c.key] ?? []).length;
          const ch = data.changes?.[c.key];
          const delta =
            ch && (ch.added.length || ch.removed.length)
              ? ` (+${ch.added.length}/-${ch.removed.length})`
              : "";
          return `${c.label} ${n}${delta}`;
        });
      setResult({ type: "ok", text: `已同步：${parts.join("，")}` });
      router.refresh();
    } catch {
      setResult({ type: "err", text: "网络错误，更新失败" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="glass-soft hover:bg-brand-500/12 hover:text-brand-600 dark:hover:text-brand-300 flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {busy ? "正在从 OpenList 同步…" : "更新文件"}
        {!busy && summary && <span className="text-muted ml-auto text-xs">{summary}</span>}
      </button>

      {result && (
        <p
          className={cn(
            "animate-fade-up flex items-start gap-1.5 rounded-xl px-3 py-2 text-xs",
            result.type === "ok"
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/12 text-red-600 dark:text-red-400",
          )}
        >
          {result.type === "ok" ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {result.text}
        </p>
      )}
    </div>
  );
}
