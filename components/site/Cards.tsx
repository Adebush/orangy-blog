import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FolderGit2,
  Images,
  Link as LinkIcon,
  MessageCircle,
  Tag as TagIcon,
} from "lucide-react";
import type { Moment, SiteConfig } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { SOCIAL_ICONS } from "./BrandIcons";

/** 个人名片 */
export function ProfileCard({ site }: { site: SiteConfig }) {
  return (
    <div className="glass glass-sheen animate-fade-up rounded-3xl p-6 text-center">
      <div className="relative mx-auto h-24 w-24">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 opacity-30 blur-lg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={site.avatar}
          alt={site.author}
          className="relative h-24 w-24 rounded-3xl object-cover ring-2 ring-white/60 dark:ring-white/15"
        />
      </div>
      <h3 className="mt-4 text-lg font-bold">{site.author || site.title}</h3>
      <p className="text-muted mt-1 text-xs tracking-wide">{site.subtitle}</p>
      <p className="text-soft mt-3 text-sm leading-relaxed">{site.bio}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {site.heroTags.map((t) => (
          <span key={t} className="glass-soft rounded-full px-2.5 py-1 text-[0.7rem]">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {site.socials.map((s) => {
          const Icon = SOCIAL_ICONS[s.icon] ?? SOCIAL_ICONS.globe;
          return (
            <a
              key={`${s.label}-${s.href}`}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer noopener"
              aria-label={s.label}
              title={s.label}
              className="glass-soft glass-hover grid h-9 w-9 place-items-center rounded-full"
            >
              <Icon className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

/** 标签云 */
export function TagCloud({ tags }: { tags: { tag: string; count: number }[] }) {
  const max = tags[0]?.count ?? 1;
  return (
    <div className="glass glass-sheen animate-fade-up rounded-3xl p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase opacity-70">
        <TagIcon className="h-4 w-4" />
        标签云
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.slice(0, 20).map((t) => {
          const weight = t.count / max;
          return (
            <Link
              key={t.tag}
              href={`/posts?tag=${encodeURIComponent(t.tag)}`}
              className="glass-soft glass-hover rounded-full px-3 py-1.5 transition-colors hover:text-brand-500"
              style={{ fontSize: `${0.72 + weight * 0.3}rem` }}
            >
              {t.tag}
              <span className="text-muted ml-1 text-[0.7em]">{t.count}</span>
            </Link>
          );
        })}
        {tags.length === 0 && <p className="text-muted text-sm">还没有标签</p>}
      </div>
    </div>
  );
}

/** 最新说说 */
export function RecentMoments({ moments }: { moments: Moment[] }) {
  return (
    <div className="glass glass-sheen animate-fade-up rounded-3xl p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase opacity-70">
        <MessageCircle className="h-4 w-4" />
        最近说说
      </h3>
      <ul className="mt-4 space-y-3.5">
        {moments.slice(0, 3).map((m) => (
          <li key={m.id} className="border-l-2 border-brand-500/40 pl-3">
            <p className="text-soft line-clamp-3 text-sm leading-relaxed">{m.content}</p>
            <p className="text-muted mt-1 text-[0.7rem]">{relativeTime(m.date)}</p>
          </li>
        ))}
        {moments.length === 0 && <li className="text-muted text-sm">还没有动态</li>}
      </ul>
      {moments.length > 0 && (
        <Link
          href="/moments"
          className="text-brand-500 mt-4 inline-flex items-center gap-1 text-xs font-medium hover:gap-2 transition-all"
        >
          查看全部 <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** 快捷入口 */
export function QuickLinks({ postCount }: { postCount: number }) {
  const links = [
    { href: "/posts", label: "全部文章", icon: ArrowRight, desc: `${postCount} 篇` },
    { href: "/timeline", label: "归档", icon: CalendarDays, desc: "按时间浏览" },
    { href: "/projects", label: "项目", icon: FolderGit2, desc: "做过的东西" },
    { href: "/photowall", label: "相册", icon: Images, desc: "生活切片" },
    { href: "/friends", label: "友链", icon: LinkIcon, desc: "朋友们" },
    { href: "/moments", label: "说说", icon: Clock3, desc: "碎片记录" },
  ];
  return (
    <div className="glass glass-sheen animate-fade-up rounded-3xl p-6">
      <h3 className="text-sm font-semibold tracking-wide uppercase opacity-70">快速前往</h3>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="glass-soft group flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 transition-all hover:bg-brand-500/12"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{l.label}</span>
              <span className="text-muted block truncate text-[0.7rem]">{l.desc}</span>
            </span>
            <l.icon className="text-muted h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/** 区块标题 */
export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "查看全部",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <span className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
          {title}
        </h2>
        {subtitle && <p className="text-muted mt-1.5 text-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="glass-soft text-soft hover:text-brand-500 group flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
