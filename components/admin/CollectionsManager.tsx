"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type { IconType } from "@/components/site/BrandIcons";
import { cn, isCompleteImageUrl } from "@/lib/utils";

type FieldType = "text" | "textarea" | "datetime" | "image" | "images" | "tags";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

interface Schema {
  label: string;
  hint: string;
  icon: IconType;
  fields: FieldDef[];
  make: () => Record<string, unknown>;
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

const SCHEMAS: Record<string, Schema> = {
  moments: {
    label: "说说",
    hint: "短动态，按时间倒序显示在「说说」页面",
    icon: MessageCircle,
    fields: [
      { key: "content", label: "内容", type: "textarea", placeholder: "此刻在想什么…" },
      { key: "date", label: "时间", type: "datetime" },
      { key: "images", label: "配图", type: "images" },
      { key: "mood", label: "心情", type: "text", placeholder: "开心" },
      { key: "location", label: "位置", type: "text", placeholder: "杭州" },
    ],
    make: () => ({ id: uid(), content: "", date: new Date().toISOString(), images: [] }),
  },
  friends: {
    label: "友链",
    hint: "朋友们的站点，显示在「友链」页面",
    icon: MessageCircle,
    fields: [
      { key: "name", label: "站名", type: "text" },
      { key: "url", label: "链接", type: "text", placeholder: "https://" },
      { key: "avatar", label: "头像", type: "image" },
      { key: "desc", label: "简介", type: "text" },
      { key: "tag", label: "标签", type: "text", placeholder: "技术" },
    ],
    make: () => ({ name: "", url: "", avatar: "", desc: "", tag: "" }),
  },
  projects: {
    label: "项目",
    hint: "作品 / 开源项目，显示在「项目」页面",
    icon: MessageCircle,
    fields: [
      { key: "name", label: "项目名", type: "text" },
      { key: "desc", label: "描述", type: "textarea" },
      { key: "tags", label: "技术标签", type: "tags" },
      { key: "status", label: "状态", type: "text", placeholder: "进行中 / 已上线" },
      { key: "url", label: "演示地址", type: "text" },
      { key: "repo", label: "仓库地址", type: "text" },
      { key: "cover", label: "封面", type: "image" },
    ],
    make: () => ({ name: "", desc: "", tags: [], status: "", url: "", repo: "", cover: "" }),
  },
  photos: {
    label: "相册",
    hint: "照片墙图片，显示在「相册」页面",
    icon: MessageCircle,
    fields: [
      { key: "src", label: "图片", type: "image" },
      { key: "title", label: "标题", type: "text" },
      { key: "tag", label: "分组", type: "text", placeholder: "旅行" },
      { key: "date", label: "日期", type: "text", placeholder: "2026-01-01" },
    ],
    make: () => ({ id: uid(), src: "", title: "", tag: "", date: "" }),
  },
  timeline: {
    label: "时间线",
    hint: "大事记，可与文章归档一起浏览",
    icon: MessageCircle,
    fields: [
      { key: "title", label: "标题", type: "text" },
      { key: "date", label: "时间", type: "text", placeholder: "2026-01-01" },
      { key: "desc", label: "描述", type: "textarea" },
      { key: "type", label: "类型", type: "text", placeholder: "里程碑" },
      { key: "href", label: "相关链接", type: "text" },
    ],
    make: () => ({ title: "", date: new Date().toISOString().slice(0, 10), desc: "", type: "", href: "" }),
  },
};

const inputCls =
  "glass-soft w-full rounded-2xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function displayValue(item: Record<string, unknown>, field: FieldDef): string {
  const v = item[field.key];
  if (field.type === "images") return Array.isArray(v) ? (v as string[]).join("\n") : "";
  if (field.type === "tags") return Array.isArray(v) ? (v as string[]).join(", ") : "";
  if (field.type === "datetime") return toLocalInput(String(v ?? ""));
  return v === undefined || v === null ? "" : String(v);
}

function applyValue(
  item: Record<string, unknown>,
  field: FieldDef,
  raw: string,
): Record<string, unknown> {
  if (field.type === "images") {
    return {
      ...item,
      [field.key]: raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  if (field.type === "tags") {
    return {
      ...item,
      [field.key]: raw
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  if (field.type === "datetime") {
    return { ...item, [field.key]: raw ? new Date(raw).toISOString() : "" };
  }
  return { ...item, [field.key]: raw };
}

export function CollectionsManager({ initialType = "moments" }: { initialType?: string }) {
  const type = initialType in SCHEMAS ? initialType : "moments";
  const schema = SCHEMAS[type];

  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collections?type=${type}`);
      const data = (await res.json()) as { ok: boolean; items?: Record<string, unknown>[] };
      setItems(Array.isArray(data.items) ? data.items : []);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  async function upload(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
        if (data.ok && data.url) resolve(data.url);
        else {
          setMessage({ type: "err", text: data.error ?? "上传失败" });
          resolve(null);
        }
      };
      input.click();
    });
  }

  async function uploadInto(index: number, field: FieldDef) {
    setUploading(`${index}:${field.key}`);
    try {
      const url = await upload();
      if (!url) return;
      setItems((list) => {
        const next = [...list];
        const item = next[index];
        if (field.type === "images") {
          const cur = Array.isArray(item[field.key]) ? (item[field.key] as string[]) : [];
          next[index] = { ...item, [field.key]: [...cur, url] };
        } else {
          next[index] = { ...item, [field.key]: url };
        }
        return next;
      });
      setDirty(true);
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, items }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setDirty(false);
        setMessage({ type: "ok", text: "已保存，前台立即生效" });
      } else {
        setMessage({ type: "err", text: data.error ?? "保存失败" });
      }
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setItems((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  const Icon = schema.icon;

  return (
    <div className="space-y-4">
      <div className="glass glass-sheen flex flex-wrap gap-1 rounded-3xl p-1.5">
        {Object.entries(SCHEMAS).map(([key, s]) => (
          <a
            key={key}
            href={`/admin/collections?type=${key}`}
            className={cn(
              "flex-1 rounded-2xl px-4 py-2.5 text-center text-sm font-medium transition-all",
              key === type
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                : "text-soft hover:text-ink",
            )}
          >
            {s.label}
          </a>
        ))}
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

      <div className="glass-strong glass-sheen sticky top-3 z-20 flex flex-wrap items-center gap-3 rounded-3xl p-3.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="text-brand-500 h-4 w-4" />
            {schema.label}
            <span className="text-muted font-normal">共 {items.length} 条</span>
            {dirty && <span className="text-brand-500 text-xs font-normal">· 未保存</span>}
          </p>
          <p className="text-muted mt-0.5 truncate text-xs">{schema.hint}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setItems((list) => [...list, schema.make()]);
            setDirty(true);
          }}
          className="glass-soft hover:text-brand-500 flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          新增一条
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </button>
      </div>

      {loading ? (
        <div className="glass glass-sheen rounded-3xl p-12 text-center">
          <Loader2 className="text-muted mx-auto h-6 w-6 animate-spin" />
          <p className="text-muted mt-3 text-sm">加载中…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass glass-sheen rounded-3xl p-12 text-center">
          <ImagePlus className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">还没有{schema.label}内容</p>
          <p className="text-muted mt-1 text-sm">点上方「新增一条」开始添加</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={String(item.id ?? index)}
              className="glass glass-sheen animate-fade-up rounded-3xl p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-muted text-xs font-semibold">
                  #{index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    title="上移"
                    className="glass-soft grid h-8 w-8 place-items-center rounded-xl transition-colors hover:text-brand-500 disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    title="下移"
                    className="glass-soft grid h-8 w-8 place-items-center rounded-xl transition-colors hover:text-brand-500 disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("确定删除这一条吗？")) return;
                      setItems((list) => list.filter((_, i) => i !== index));
                      setDirty(true);
                    }}
                    title="删除"
                    className="glass-soft grid h-8 w-8 place-items-center rounded-xl text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {schema.fields.map((field) => {
                  const wide = field.type === "textarea" || field.type === "images";
                  return (
                    <div key={field.key} className={wide ? "sm:col-span-2" : undefined}>
                      <label className="text-muted mb-1 block text-xs font-medium">
                        {field.label}
                      </label>

                      {field.type === "textarea" ? (
                        <textarea
                          value={displayValue(item, field)}
                          onChange={(e) => {
                            setItems((list) =>
                              list.map((it, i) =>
                                i === index ? applyValue(it, field, e.target.value) : it,
                              ),
                            );
                            setDirty(true);
                          }}
                          rows={3}
                          placeholder={field.placeholder}
                          className={cn(inputCls, "resize-y")}
                        />
                      ) : field.type === "image" || field.type === "images" ? (
                        <div className="space-y-2">
                          <textarea
                            value={displayValue(item, field)}
                            onChange={(e) => {
                              setItems((list) =>
                                list.map((it, i) =>
                                  i === index ? applyValue(it, field, e.target.value) : it,
                                ),
                              );
                              setDirty(true);
                            }}
                            rows={field.type === "images" ? 3 : 1}
                            placeholder="/uploads/xxx.png，每行一个"
                            className={cn(inputCls, "resize-y font-mono text-xs")}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => uploadInto(index, field)}
                              disabled={uploading === `${index}:${field.key}`}
                              className="glass-soft hover:text-brand-500 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
                            >
                              {uploading === `${index}:${field.key}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              上传图片
                            </button>
                            {field.type === "image" && isCompleteImageUrl(displayValue(item, field)) && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={displayValue(item, field)}
                                alt="预览"
                                className="h-10 w-14 rounded-lg object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                              />
                            )}
                          </div>
                          {field.type === "images" && (
                            <div className="flex flex-wrap gap-2">
                              {(Array.isArray(item[field.key]) ? (item[field.key] as string[]) : [])
                                  .filter(isCompleteImageUrl)
                                  .map(
                                (src, si) => (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    key={`${src}-${si}`}
                                    src={src}
                                    alt="预览"
                                    className="h-12 w-16 rounded-lg object-cover"
                                  />
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type={field.type === "datetime" ? "datetime-local" : "text"}
                          value={displayValue(item, field)}
                          onChange={(e) => {
                            setItems((list) =>
                              list.map((it, i) =>
                                i === index ? applyValue(it, field, e.target.value) : it,
                              ),
                            );
                            setDirty(true);
                          }}
                          placeholder={field.placeholder}
                          className={inputCls}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
