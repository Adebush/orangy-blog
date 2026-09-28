import Link from "next/link";
import { ArrowRight, Mail, MapPin, Megaphone, PenLine } from "lucide-react";
import { PostCard } from "@/components/post/PostCard";
import { FilesCard } from "@/components/file/FilesCard";
import { Guestbook } from "@/components/site/Guestbook";
import { MusicSection } from "@/components/site/MusicSection";
import { SiteGuide } from "@/components/site/SiteGuide";
import { WelcomeBanner } from "@/components/site/WelcomeBanner";
import { NAV_ITEMS } from "@/lib/nav";
import { QuickLinks, RecentMoments, SectionHeader, TagCloud } from "@/components/site/Cards";
import { SOCIAL_ICONS } from "@/components/site/BrandIcons";
import { getFiles } from "@/lib/files";
import { activeTracks, getMusicConfig } from "@/lib/music";
import { getTags, listPosts } from "@/lib/posts";
import { getMoments, getSite } from "@/lib/site";

export default async function HomePage() {
  const [site, posts, tags, moments, files, music] = await Promise.all([
    getSite(),
    listPosts(),
    getTags(),
    getMoments(),
    getFiles(),
    getMusicConfig(),
  ]);
  const musicTracks = activeTracks(music);
  const hasMusic = music.enabled && musicTracks.length > 0;
  const fileCategories = files.enabled
    ? files.categories.filter((c) => c.enabled && (files.items[c.key] ?? []).length > 0)
    : [];

  const days = Math.max(
    1,
    Math.floor((Date.now() - new Date(`${site.startYear}-01-01`).getTime()) / 86_400_000),
  );

  const stats = [
    { label: "篇文章", value: posts.length },
    { label: "个标签", value: tags.length },
    { label: "条说说", value: moments.length },
    { label: "天运行", value: days },
  ];

  return (
    <div className="space-y-8">
      {/* 首次访问提示（关掉后不再出现） */}
      <WelcomeBanner />

      {/* Hero */}
      <section className="glass-strong glass-sheen animate-fade-up relative overflow-hidden rounded-4xl p-7 sm:p-10">
        <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-brand-300/30 blur-3xl" />

        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="animate-float relative shrink-0">
            <div className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-br from-brand-400 to-brand-600 opacity-35 blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={site.avatar}
              alt={site.author}
              className="relative h-20 w-20 rounded-[1.6rem] object-cover ring-2 ring-white/60 sm:h-24 sm:w-24 dark:ring-white/15"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-muted text-sm">
              欢迎来到 <span className="text-brand-600 dark:text-brand-300 font-semibold">{site.title}</span>
            </p>
            <h1 className="mt-1.5 text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              你好，我是{" "}
              <span className="text-brand-600 dark:text-brand-300">
                {site.author || site.title}
              </span>
            </h1>
            <p className="text-soft mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
              {site.bio}
            </p>

            {site.heroTags.length > 0 && (
              <p className="text-muted mt-3 text-sm">{site.heroTags.join(" · ")}</p>
            )}

            <div className="text-muted mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {site.socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.icon] ?? SOCIAL_ICONS.globe;
                return (
                  <a
                    key={`${s.label}-${s.href}`}
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer noopener"
                    className="hover:text-brand-600 dark:hover:text-brand-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </a>
                );
              })}
              {site.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {site.location}
                </span>
              )}
              {site.email && (
                <a
                  href={`mailto:${site.email}`}
                  className="hover:text-brand-600 dark:hover:bg-brand-500/12 flex items-center gap-1.5 rounded-full transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {site.email}
                </a>
              )}
              {/* 直接告诉访客「关于我」在哪 */}
              <Link
                href="/about"
                className="text-brand-600 dark:text-brand-300 flex items-center gap-1 font-medium transition-all hover:gap-2"
              >
                更多关于我
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 站点数据：一行文字，不做成一排卡片 */}
        <div className="text-muted relative mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/30 pt-5 text-sm dark:border-white/10">
          {stats.map((s) => (
            <span key={s.label}>
              <span className="text-ink font-semibold">{s.value}</span> {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* 音乐 + 公告：桌面并排一行，省掉一行高度 */}
      {(hasMusic || site.announcement) && (
        <div
          className={
            hasMusic && site.announcement
              ? "grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start"
              : "grid gap-6"
          }
        >
          {hasMusic && <MusicSection config={{ ...music, tracks: musicTracks }} />}
          {site.announcement && (
            <div className="glass glass-sheen animate-fade-up flex items-start gap-3 rounded-3xl px-5 py-5">
              <Megaphone className="text-brand-500 mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-soft text-sm leading-relaxed">{site.announcement}</p>
            </div>
          )}
        </div>
      )}

      {/* 这个站都有什么：给新访客的导览（内部已是三列） */}
      <SiteGuide items={NAV_ITEMS} />

      {/* 最新文章：整行，桌面三列排卡片 */}
      <div>
        <SectionHeader title="最新文章" subtitle="记录下每一个想留住的想法" href="/posts" />
        {posts.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 6).map((p, i) => (
              <PostCard key={p.slug} post={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass glass-sheen rounded-3xl p-10 text-center">
            <PenLine className="text-muted mx-auto h-8 w-8" />
            <p className="mt-3 font-medium">还没有文章</p>
            <p className="text-muted mt-1 text-sm">
              去{" "}
              <Link href="/admin" className="text-brand-500 hover:underline">
                后台
              </Link>{" "}
              写下第一篇吧
            </p>
          </div>
        )}

        {posts.length > 6 && (
          <div className="mt-6 text-center">
            <Link
              href="/posts"
              className="glass glass-sheen glass-hover inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              查看全部 {posts.length} 篇文章
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* 快速前往 / 谱面 / 实用MOD：桌面一行三块 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLinks postCount={posts.length} />
        {fileCategories.map((category) => (
          <FilesCard
            key={category.key}
            category={category}
            items={files.items[category.key] ?? []}
          />
        ))}
      </div>

      {/* 标签云 / 最近说说：桌面一行两块 */}
      <div className="grid gap-6 sm:grid-cols-2">
        <TagCloud tags={tags} />
        <RecentMoments moments={moments} />
      </div>

      {/* 主页留言板：弹幕 + 留言表单 */}
      <Guestbook />
    </div>
  );
}
