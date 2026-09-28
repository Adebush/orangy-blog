"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ExternalLink,
  FolderOpen,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import type { FileCategory, FilesConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON_NAMES, categoryIcon } from "@/components/file/categoryIcons";

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const inputCls =
  "glass-soft w-full rounded-2xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]";

export function FilesSettings({ initial }: { initial: FilesConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<FilesConfig>(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [categories, setCategories] = useState<FileCategory[]>(initial.categories);
  const [busy, setBusy] = useState<"save" | "fetch" | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 8000);
  }

  function patchCategory(index: number, patch: Partial<FileCategory>) {
    setCategories((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addCategory() {
    setCategories((list) => [
      ...list,
      {
        key: `cat${Date.now().toString(36)}`,
        label: "新分类",
        path: "/",
        icon: "folder-open",
        desc: "",
        enabled: true,
      },
    ]);
  }

  async function saveOnly() {
    setBusy("save");
    try {
      const res = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, baseUrl, categories }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; files?: FilesConfig };
      if (data.ok && data.files) {
        setConfig(data.files);
        setCategories(data.files.categories);
        flash("ok", "已保存");
        router.refresh();
      } else {
        flash("err", data.error ?? "保存失败");
      }
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    setBusy("fetch");
    try {
      const res = await fetch("/api/files/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, categories }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        files?: FilesConfig;
        changes?: Record<string, { added: string[]; removed: string[] }>;
      };
      if (data.files) {
        setConfig(data.files);
        setCategories(data.files.categories);
      }
      if (data.ok && data.files) {
        const parts = data.files.categories
          .filter((c) => c.enabled)
          .map((c) => {
            const ch = data.changes?.[c.key];
            const n = (data.files?.items[c.key] ?? []).length;
            const delta =
              ch && (ch.added.length || ch.removed.length)
                ? `，新增 ${ch.added.length} / 移除 ${ch.removed.length}`
                : "";
            return `${c.label} ${n} 个${delta}`;
          });
        flash("ok", `已同步 OpenList：${parts.join("；")}`);
        router.refresh();
      } else {
        flash("err", data.error ?? "更新失败");
      }
    } catch {
      flash("err", "网络错误，更新失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-muted flex items-start gap-2 rounded-2xl bg-brand-500/8 px-4 py-3 text-xs">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          这些压缩包体积大，放本站会占满磁盘，所以<b>文件本体留在 OpenList</b>，本站只读取文件名清单。
          前台「文件」页会把每个分类渲染成一个选项卡，点击文件名跳到 OpenList 对应文件的下载页。
          <br />
          需要 OpenList 的 <code className="text-brand-600 dark:text-brand-300">/api/fs/list</code>{" "}
          允许匿名访问（未开「隐藏文件列表」、未设访问密码）。
        </span>
      </div>

      {message && (
        <div
          className={cn(
            "animate-fade-up flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/12 text-red-600 dark:text-red-400",
          )}
        >
          {message.type === "ok" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* 基础设置 */}
      <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
        <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-brand-500 h-4 w-4"
          />
          在前台显示「文件」选项卡
        </label>

        <div>
          <label className="text-soft mb-1.5 block text-sm font-medium">OpenList 站点地址</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://1.2.3.4:5244"
            className={inputCls}
          />
        </div>
      </div>

      {/* 分类管理 */}
      <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">分类选项卡</h3>
            <p className="text-muted mt-0.5 text-xs">
              每个分类对应 OpenList 上的一个目录，前台就是一个选项卡
            </p>
          </div>
          <button
            type="button"
            onClick={addCategory}
            className="glass-soft hover:text-brand-500 flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            添加分类
          </button>
        </div>

        <ul className="space-y-3">
          {categories.map((category, index) => {
            const Icon = categoryIcon(category.icon);
            const count = (config.items[category.key] ?? []).length;
            return (
              <li key={category.key} className="glass-soft rounded-2xl p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15">
                    <Icon className="text-brand-600 dark:text-brand-300 h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {category.label || "未命名"}
                    </span>
                    <span className="text-muted block truncate text-xs">
                      已同步 {count} 个文件
                    </span>
                  </span>
                  <label className="text-muted flex shrink-0 cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={category.enabled}
                      onChange={(e) => patchCategory(index, { enabled: e.target.checked })}
                      className="accent-brand-500 h-3.5 w-3.5"
                    />
                    启用
                  </label>
                  <button
                    type="button"
                    onClick={() => setCategories((list) => list.filter((_, i) => i !== index))}
                    title="删除该分类"
                    aria-label="删除该分类"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="text-muted mb-1 block text-xs font-medium">显示名</label>
                    <input
                      value={category.label}
                      onChange={(e) => patchCategory(index, { label: e.target.value })}
                      placeholder="谱面"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-muted mb-1 block text-xs font-medium">
                      OpenList 目录
                    </label>
                    <input
                      value={category.path}
                      onChange={(e) => patchCategory(index, { path: e.target.value })}
                      placeholder="例如：/我的谱面"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-muted mb-1 block text-xs font-medium">图标</label>
                    <select
                      value={category.icon}
                      onChange={(e) => patchCategory(index, { icon: e.target.value })}
                      className={inputCls}
                    >
                      {CATEGORY_ICON_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-muted mb-1 block text-xs font-medium">
                      说明（显示在标题下方）
                    </label>
                    <input
                      value={category.desc}
                      onChange={(e) => patchCategory(index, { desc: e.target.value })}
                      placeholder="冰与火之舞自制谱"
                      className={inputCls}
                    />
                  </div>
                </div>

                <a
                  href={`${baseUrl.replace(/\/+$/, "")}/${category.path
                    .split("/")
                    .filter(Boolean)
                    .map(encodeURIComponent)
                    .join("/")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted hover:text-brand-500 mt-2.5 inline-flex items-center gap-1 text-xs transition-colors"
                >
                  打开该目录
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/25 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={syncNow}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {busy === "fetch" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {busy === "fetch" ? "正在从 OpenList 同步…" : "更新文件"}
          </button>
          <button
            type="button"
            onClick={saveOnly}
            disabled={busy !== null}
            className="glass-soft hover:text-brand-500 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {busy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            仅保存设置
          </button>
        </div>
        <p className="text-muted text-xs">
          OpenList 里上传或删除文件后，点一次「更新文件」即可同步 ——
          新增的会出现，删掉的会自动消失。
        </p>
      </div>

      {/* 各分类同步结果 */}
      <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-100 dark:bg-brand-900/40">
            <FolderOpen className="text-brand-600 dark:text-brand-300 h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {config.updatedAt
                ? `上次同步：${config.updatedAt.slice(0, 16).replace("T", " ")}`
                : "尚未同步过"}
            </p>
            <p className="text-muted text-xs">
              {categories.filter((c) => c.enabled).length} 个启用的分类
            </p>
            {config.lastError && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {config.lastError}
              </p>
            )}
          </div>
        </div>

        {categories
          .filter((c) => c.enabled && (config.items[c.key] ?? []).length > 0)
          .map((category) => {
            const list = config.items[category.key] ?? [];
            const total = list.reduce((s, f) => s + (f.size || 0), 0);
            return (
              <div key={category.key}>
                <p className="text-soft mb-2 text-sm font-medium">
                  {category.label}
                  <span className="text-muted font-normal">
                    {" "}
                    · {list.length} 个 · {formatSize(total)}
                  </span>
                </p>
                <ul className="max-h-64 divide-y divide-white/20 overflow-y-auto dark:divide-white/8">
                  {list.map((file, i) => (
                    <li key={file.name} className="flex items-center gap-3 py-2 text-sm">
                      <span className="text-muted w-6 shrink-0 text-xs tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{file.title}</span>
                        <span className="text-muted block truncate text-xs">{file.name}</span>
                      </span>
                      <span className="text-muted shrink-0 text-xs uppercase">{file.ext}</span>
                      <span className="text-muted w-16 shrink-0 text-right text-xs tabular-nums">
                        {formatSize(file.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </div>
  );
}
