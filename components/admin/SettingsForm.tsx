"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Info,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  FilesConfig,
  MusicConfig,
  NeteaseAccount,
  SiteConfig,
  SocialLink,
} from "@/lib/types";
import { cn, isCompleteImageUrl } from "@/lib/utils";
import { MusicSettings } from "./MusicSettings";
import { FilesSettings } from "./FilesSettings";

const ICON_OPTIONS = ["github", "x", "twitter", "youtube", "bilibili", "mail", "rss", "globe"];

const TABS = [
  { key: "site", label: "站点信息" },
  { key: "files", label: "文件" },
  { key: "music", label: "音乐播放器" },
  { key: "about", label: "关于页面" },
  { key: "security", label: "安全设置" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-soft mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

const inputCls =
  "glass-soft w-full rounded-2xl px-4 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]";

export function SettingsForm({
  initialSite,
  initialAbout,
  initialMusic,
  initialFiles,
  initialAccount,
}: {
  initialSite: SiteConfig;
  initialAbout: string;
  initialMusic: MusicConfig;
  initialFiles: FilesConfig;
  initialAccount: NeteaseAccount;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("site");
  const [site, setSite] = useState<SiteConfig>(initialSite);
  const [heroTags, setHeroTags] = useState(initialSite.heroTags.join(", "));
  const [about, setAbout] = useState(initialAbout);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const [currentPwd, setCurrentPwd] = useState("");
  const [nextPwd, setNextPwd] = useState("");

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function patch<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setSite((s) => ({ ...s, [key]: value }));
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
    if (data.ok && data.url) {
      patch("avatar", data.url);
      flash("ok", "头像已上传，记得点保存");
    } else {
      flash("err", data.error ?? "上传失败");
    }
  }

  async function saveSiteConfig() {
    setSaving("site");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...site,
          startYear: Number(site.startYear) || new Date().getFullYear(),
          heroTags: heroTags
            .split(/[,，]/)
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        flash("ok", "站点信息已保存");
        router.refresh();
      } else {
        flash("err", data.error ?? "保存失败");
      }
    } finally {
      setSaving(null);
    }
  }

  async function saveAboutPage() {
    setSaving("about");
    try {
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: about }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        flash("ok", "关于页面已保存");
        router.refresh();
      } else {
        flash("err", data.error ?? "保存失败");
      }
    } finally {
      setSaving(null);
    }
  }

  async function savePassword() {
    if (nextPwd.length < 6) {
      flash("err", "新密码至少 6 位");
      return;
    }
    setSaving("pwd");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: currentPwd, next: nextPwd }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        flash("ok", "密码已更新，下次请用新密码登录");
        setCurrentPwd("");
        setNextPwd("");
      } else {
        flash("err", data.error ?? "修改失败");
      }
    } finally {
      setSaving(null);
    }
  }

  const socials = site.socials ?? [];

  return (
    <div className="space-y-4">
      <div className="glass glass-sheen flex gap-1 rounded-3xl p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all",
              tab === t.key
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                : "text-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
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

      {tab === "site" && (
        <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
          <div className="text-muted flex items-start gap-2 rounded-2xl bg-brand-500/8 px-4 py-3 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            这里的信息会立即反映到前台页面的标题、页脚与侧边名片上。
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="站点名称">
              <input value={site.title} onChange={(e) => patch("title", e.target.value)} className={inputCls} />
            </Field>
            <Field label="副标题">
              <input value={site.subtitle} onChange={(e) => patch("subtitle", e.target.value)} className={inputCls} />
            </Field>
            <Field label="作者昵称">
              <input value={site.author} onChange={(e) => patch("author", e.target.value)} className={inputCls} />
            </Field>
            <Field label="所在位置">
              <input value={site.location} onChange={(e) => patch("location", e.target.value)} className={inputCls} />
            </Field>
            <Field label="邮箱">
              <input value={site.email} onChange={(e) => patch("email", e.target.value)} className={inputCls} />
            </Field>
            <Field label="建站年份" hint="用于页脚显示 © 起始年份 与首页「天运行」统计">
              <input
                type="number"
                value={site.startYear}
                onChange={(e) => patch("startYear", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="站点描述" hint="用于 SEO description">
            <textarea
              value={site.description}
              onChange={(e) => patch("description", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-y")}
            />
          </Field>

          <Field
            label="友链页「本站信息」的描述"
            hint="显示在友链页面底部的交换友链卡片里；留空则使用上面的站点描述"
          >
            <input
              value={site.friendsDesc ?? ""}
              onChange={(e) => patch("friendsDesc", e.target.value)}
              placeholder="例如：我的主页"
              className={inputCls}
            />
          </Field>

          <Field label="个人简介" hint="显示在首页 Hero 与侧边名片">
            <textarea
              value={site.bio}
              onChange={(e) => patch("bio", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-y")}
            />
          </Field>

          <Field label="个人标签" hint="用逗号分隔">
            <input value={heroTags} onChange={(e) => setHeroTags(e.target.value)} className={inputCls} />
          </Field>

          <Field label="头像">
            <div className="flex flex-wrap items-center gap-2">
              <input value={site.avatar} onChange={(e) => patch("avatar", e.target.value)} className={cn(inputCls, "min-w-[12rem] flex-1")} />
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                className="glass-soft hover:text-brand-500 flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors"
              >
                <Upload className="h-4 w-4" />
                上传头像
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadAvatar(e.target.files?.[0])}
              />
              {isCompleteImageUrl(site.avatar) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={site.avatar}
                  alt="头像预览"
                  className="h-10 w-10 rounded-xl object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
          </Field>

          <Field label="公告" hint="留空则不显示首页公告条">
            <textarea
              value={site.announcement}
              onChange={(e) => patch("announcement", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-y")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="页脚文字">
              <input value={site.footerText} onChange={(e) => patch("footerText", e.target.value)} className={inputCls} />
            </Field>
            <Field label="ICP 备案号" hint="留空则不显示">
              <input value={site.icp} onChange={(e) => patch("icp", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div>
            <p className="text-soft mb-2 text-sm font-medium">社交链接</p>
            <div className="space-y-2">
              {socials.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={s.label}
                    placeholder="名称"
                    onChange={(e) => {
                      const list = [...socials];
                      list[i] = { ...list[i], label: e.target.value };
                      patch("socials", list);
                    }}
                    className={cn(inputCls, "w-28 shrink-0")}
                  />
                  <input
                    value={s.href}
                    placeholder="https://…"
                    onChange={(e) => {
                      const list = [...socials];
                      list[i] = { ...list[i], href: e.target.value };
                      patch("socials", list);
                    }}
                    className={cn(inputCls, "min-w-[10rem] flex-1")}
                  />
                  <select
                    value={s.icon}
                    onChange={(e) => {
                      const list = [...socials];
                      list[i] = { ...list[i], icon: e.target.value };
                      patch("socials", list);
                    }}
                    className={cn(inputCls, "w-28 shrink-0")}
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => patch("socials", socials.filter((_, idx) => idx !== i))}
                    className="glass-soft grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-red-600 dark:text-red-400"
                    aria-label="删除该链接"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => patch("socials", [...socials, { label: "", href: "", icon: "globe" } as SocialLink])}
              className="glass-soft hover:text-brand-500 mt-2 flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              添加链接
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveSiteConfig}
              disabled={saving === "site"}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
            >
              {saving === "site" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存站点信息
            </button>
          </div>
        </div>
      )}

      {tab === "files" && <FilesSettings initial={initialFiles} />}

      {tab === "music" && (
        <MusicSettings initial={initialMusic} initialAccount={initialAccount} />
      )}

      {tab === "about" && (
        <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
          <Field label="关于页面内容（Markdown）" hint="支持标题、列表、图片、表格、LaTeX 公式">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={22}
              spellCheck={false}
              className="glass-soft w-full resize-y rounded-2xl p-4 font-mono text-sm leading-relaxed outline-none"
            />
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveAboutPage}
              disabled={saving === "about"}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
            >
              {saving === "about" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存关于页面
            </button>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
          <Field label="当前密码">
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          </Field>
          <Field label="新密码" hint="至少 6 位；修改后当前登录状态仍然有效">
            <input
              type="password"
              value={nextPwd}
              onChange={(e) => setNextPwd(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={savePassword}
              disabled={saving === "pwd"}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
            >
              {saving === "pwd" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              修改密码
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
