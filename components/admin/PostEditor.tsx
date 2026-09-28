"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Check,
  Code,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Save,
  SquareCode,
  Strikethrough,
  Table,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react";
import type { TocItem } from "@/lib/types";
import { cn, countWords, isCompleteImageUrl, readingTime } from "@/lib/utils";

export interface EditorInitial {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  excerpt: string;
  draft: boolean;
  pinned: boolean;
  content: string;
}

/** ISO -> datetime-local 输入框需要的本地时间字符串 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({ initial }: { initial?: EditorInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [date, setDate] = useState(toLocalInput(initial?.date ?? new Date().toISOString()));
  const [category, setCategory] = useState(initial?.category ?? "随笔");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [draft, setDraft] = useState(initial?.draft ?? true);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [content, setContent] = useState(initial?.content ?? "");

  const [savedSlug, setSavedSlug] = useState(initial?.slug ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const words = useMemo(() => countWords(content), [content]);

  // 标题自动推导 slug（用户手动改过就不覆盖）
  const effectiveSlug = slugTouched ? slug : title;

  // 有未保存改动时离开页面给出提示
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Ctrl/Cmd + S 保存
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 预览：交给服务端渲染，保证与正式页一致
  useEffect(() => {
    if (tab !== "preview" && !(typeof window !== "undefined" && window.innerWidth >= 1024)) return;
    const timer = setTimeout(async () => {
      setRendering(true);
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const data = (await res.json()) as { ok: boolean; html?: string; toc?: TocItem[] };
        if (data.ok) {
          setHtml(data.html ?? "");
          setToc(data.toc ?? []);
        }
      } catch {
        /* 忽略预览失败 */
      } finally {
        setRendering(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [content, tab]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  /** 在光标处执行一次文本改写 */
  const apply = useCallback(
    (fn: (value: string, start: number, end: number) => { value: string; s: number; e: number }) => {
      const ta = taRef.current;
      if (!ta) return;
      const result = fn(ta.value, ta.selectionStart, ta.selectionEnd);
      setContent(result.value);
      setDirty(true);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(result.s, result.e);
      });
    },
    [],
  );

  const surround = (before: string, after = before) =>
    apply((value, s, e) => {
      const selected = value.slice(s, e) || "文本";
      return {
        value: value.slice(0, s) + before + selected + after + value.slice(e),
        s: s + before.length,
        e: s + before.length + selected.length,
      };
    });

  const prefixLines = (prefix: string) =>
    apply((value, s, e) => {
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const block = value.slice(lineStart, e || s);
      const updated = block
        .split("\n")
        .map((line) => (line.startsWith(prefix) ? line : prefix + line))
        .join("\n");
      return {
        value: value.slice(0, lineStart) + updated + value.slice(e || s),
        s: lineStart,
        e: lineStart + updated.length,
      };
    });

  const insertText = (text: string) =>
    apply((value, s, e) => ({
      value: value.slice(0, s) + text + value.slice(e),
      s: s + text.length,
      e: s + text.length,
    }));

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        setMessage({ type: "err", text: data.error ?? "上传失败" });
        return null;
      }
      return data.url;
    } catch {
      setMessage({ type: "err", text: "上传失败，请重试" });
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await uploadFile(file);
      if (url) insertText(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
    };
    input.click();
  }

  async function onCoverPick(file: File | undefined) {
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setCover(url);
      setDirty(true);
    }
  }

  async function save() {
    if (saving) return;
    const finalSlug = effectiveSlug.trim();
    if (!title.trim() && !content.trim()) {
      setMessage({ type: "err", text: "标题和正文不能同时为空" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || finalSlug || "未命名",
        slug: finalSlug,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        category: category.trim() || "未分类",
        cover: cover.trim(),
        excerpt: excerpt.trim(),
        draft,
        pinned,
        content,
      };

      const res = await fetch(
        savedSlug ? `/api/posts/${encodeURIComponent(savedSlug)}` : "/api/posts",
        {
          method: savedSlug ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        post?: { slug: string };
      };
      if (!data.ok) {
        setMessage({ type: "err", text: data.error ?? "保存失败" });
        return;
      }
      setDirty(false);
      setMessage({
        type: "ok",
        text: draft ? "草稿已保存" : "文章已发布，前台立即可见",
      });
      const newSlug = data.post?.slug ?? savedSlug;
      if (!savedSlug && newSlug) {
        setSavedSlug(newSlug);
        setSlug(newSlug);
        setSlugTouched(true);
        window.history.replaceState(null, "", `/admin/editor/${encodeURIComponent(newSlug)}`);
      }
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "网络错误，保存失败" });
    } finally {
      setSaving(false);
    }
  }
  saveRef.current = save;

  async function remove() {
    if (!savedSlug) return;
    if (!window.confirm(`确定要删除《${title || savedSlug}》吗？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/posts/${encodeURIComponent(savedSlug)}`, { method: "DELETE" });
      router.replace("/admin/posts");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const tools = [
    { title: "二级标题", icon: Heading2, run: () => prefixLines("## ") },
    { title: "三级标题", icon: Heading3, run: () => prefixLines("### ") },
    { title: "加粗", icon: Bold, run: () => surround("**") },
    { title: "斜体", icon: Italic, run: () => surround("*") },
    { title: "删除线", icon: Strikethrough, run: () => surround("~~") },
    { title: "行内代码", icon: Code, run: () => surround("`") },
    { title: "引用", icon: Quote, run: () => prefixLines("> ") },
    { title: "无序列表", icon: List, run: () => prefixLines("- ") },
    { title: "有序列表", icon: ListOrdered, run: () => prefixLines("1. ") },
    { title: "链接", icon: Link2, run: () => surround("[", "](https://)") },
    { title: "代码块", icon: SquareCode, run: () => surround("```\n", "\n```") },
    { title: "表格", icon: Table, run: () => insertText("\n| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n") },
    { title: "分割线", icon: Minus, run: () => insertText("\n---\n") },
  ];

  const preview = (
    <div className="glass glass-sheen rounded-3xl p-5 sm:p-7">
      {rendering && (
        <p className="text-muted mb-3 flex items-center gap-1.5 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> 渲染中…
        </p>
      )}
      {html ? (
        <article className="article-prose" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-muted py-10 text-center text-sm">
          开始输入正文，这里会实时显示渲染效果
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 顶部操作条 */}
      <div className="glass-strong glass-sheen sticky top-3 z-30 flex flex-wrap items-center gap-3 rounded-3xl p-3.5">
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="glass-soft hover:text-brand-500 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {isEdit ? "编辑文章" : "写新文章"}
            {dirty && <span className="text-brand-500 ml-2 text-xs font-normal">· 未保存</span>}
          </p>
          <p className="text-muted truncate text-xs">
            {words} 字 · 约 {readingTime(content)} 分钟 · {draft ? "草稿" : "已发布"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSlug && !draft && (
            <a
              href={`/posts/${encodeURIComponent(savedSlug)}`}
              target="_blank"
              rel="noreferrer"
              className="glass-soft hover:text-brand-500 hidden items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition-colors sm:flex"
            >
              <Eye className="h-4 w-4" />
              预览前台
            </a>
          )}
          {savedSlug && (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="glass-soft flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/12 disabled:opacity-60 dark:text-red-400"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              删除
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
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
          {message.type === "ok" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* 元信息 */}
      <div className="glass glass-sheen rounded-3xl p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="text-soft mb-1.5 block text-sm font-medium">标题</label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              placeholder="给这篇文章起个标题"
              className="glass-soft w-full rounded-2xl px-4 py-3 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-[color:var(--ink-muted)]"
            />
          </div>

          <div>
            <label className="text-soft mb-1.5 block text-sm font-medium">
              URL 别名（slug）
            </label>
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
                setDirty(true);
              }}
              placeholder="留空则由标题自动生成"
              className="glass-soft w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-soft mb-1.5 block text-sm font-medium">发布时间</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDirty(true);
              }}
              className="glass-soft w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-soft mb-1.5 block text-sm font-medium">分类</label>
            <input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setDirty(true);
              }}
              placeholder="随笔"
              className="glass-soft w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-soft mb-1.5 block text-sm font-medium">
              标签（用逗号分隔）
            </label>
            <input
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                setDirty(true);
              }}
              placeholder="Next.js, 前端, 生活"
              className="glass-soft w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-soft mb-1.5 block text-sm font-medium">
              摘要（留空自动从正文提取）
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                setDirty(true);
              }}
              rows={2}
              placeholder="用于列表页和搜索结果展示"
              className="glass-soft w-full resize-y rounded-2xl px-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-soft mb-1.5 block text-sm font-medium">封面图</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={cover}
                onChange={(e) => {
                  setCover(e.target.value);
                  setDirty(true);
                }}
                placeholder="/uploads/xxx.png 或图片链接"
                className="glass-soft min-w-[12rem] flex-1 rounded-2xl px-4 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                className="glass-soft hover:text-brand-500 flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                上传
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onCoverPick(e.target.files?.[0])}
              />
            </div>
            {isCompleteImageUrl(cover) && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={cover}
                    alt="封面预览"
                    className="h-16 w-24 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                <button
                  type="button"
                  onClick={() => {
                    setCover("");
                    setDirty(true);
                  }}
                  className="text-muted hover:text-brand-500 text-xs"
                >
                  移除封面
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => {
                  setDraft(e.target.checked);
                  setDirty(true);
                }}
                className="accent-brand-500 h-4 w-4"
              />
              保存为草稿（前台不可见）
            </label>
            <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => {
                  setPinned(e.target.checked);
                  setDirty(true);
                }}
                className="accent-brand-500 h-4 w-4"
              />
              置顶到首页
            </label>
          </div>
        </div>
      </div>

      {/* 编辑区 */}
      <div className="glass glass-sheen overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center gap-1 border-b border-white/25 p-2.5 dark:border-white/10">
          {tools.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              aria-label={t.title}
              onClick={t.run}
              className="hover:bg-brand-500/12 hover:text-brand-500 grid h-8 w-8 place-items-center rounded-xl transition-colors"
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            title="插入图片"
            aria-label="插入图片"
            onClick={insertImage}
            disabled={uploading}
            className="hover:bg-brand-500/12 hover:text-brand-500 grid h-8 w-8 place-items-center rounded-xl transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-1 lg:hidden">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  tab === t ? "bg-brand-500 text-white" : "text-soft",
                )}
              >
                {t === "write" ? "编辑" : "预览"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div className={cn(tab === "preview" && "hidden lg:block")}>
            <textarea
              ref={taRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              onPaste={async (e) => {
                const file = Array.from(e.clipboardData.files).find((f) =>
                  f.type.startsWith("image/"),
                );
                if (!file) return;
                e.preventDefault();
                const url = await uploadFile(file);
                if (url) insertText(`\n![${file.name}](${url})\n`);
              }}
              onDrop={async (e) => {
                const file = Array.from(e.dataTransfer.files).find((f) =>
                  f.type.startsWith("image/"),
                );
                if (!file) return;
                e.preventDefault();
                const url = await uploadFile(file);
                if (url) insertText(`\n![${file.name}](${url})\n`);
              }}
              spellCheck={false}
              placeholder={"开始写 Markdown…\n\n支持标题、列表、表格、代码块、LaTeX 公式（$..$）\n可以直接把图片粘贴或拖进来"}
              className="min-h-[26rem] w-full resize-y rounded-2xl bg-transparent p-3 font-mono text-sm leading-relaxed outline-none lg:min-h-[34rem]"
            />
          </div>

          <div className={cn("min-w-0", tab === "write" && "hidden lg:block")}>
            <div className="lg:sticky lg:top-24">
              <div className="max-h-[34rem] overflow-y-auto pr-1">{preview}</div>
              {toc.length > 0 && (
                <p className="text-muted mt-3 flex items-center gap-1.5 text-xs">
                  <Redo2 className="h-3 w-3" />
                  共 {toc.length} 个小节
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
