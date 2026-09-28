import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Link2, UserPlus, Users } from "lucide-react";
import { SectionHeader } from "@/components/site/Cards";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { getFriends, getSite } from "@/lib/site";
import { getSiteUrl } from "@/lib/site-url";
import type { Friend } from "@/lib/types";

export const metadata: Metadata = {
  title: "友链",
  description: "一路同行的小伙伴们，以及如何与本站交换友链。",
};


function FriendCard({ friend, index }: { friend: Friend; index: number }) {
  return (
    <a
      href={friend.url}
      target="_blank"
      rel="noreferrer noopener"
      className="glass glass-sheen glass-hover animate-fade-up group flex items-start gap-4 rounded-3xl p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-200/60 to-brand-400/50 text-lg font-bold text-white/80">
        {friend.name.slice(0, 1)}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={friend.avatar}
          alt={friend.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full rounded-2xl object-cover"
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold transition-colors group-hover:text-brand-500">
            {friend.name}
          </span>
          <ExternalLink className="text-muted h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="text-soft mt-1 line-clamp-2 block text-sm leading-relaxed">
          {friend.desc}
        </span>
        {friend.tag && (
          <span className="glass-soft mt-2.5 inline-block rounded-full px-2.5 py-1 text-[0.7rem]">
            {friend.tag}
          </span>
        )}
      </span>
    </a>
  );
}

export default async function FriendsPage() {
  const [friends, site, SITE_URL] = await Promise.all([getFriends(), getSite(), getSiteUrl()]);

  // 「本站信息」直接读站点配置，避免站点改名后这里还是旧的
  const siteName = site.title;
  const siteLink = SITE_URL;
  const siteAvatar = site.avatar.startsWith("http")
    ? site.avatar
    : `${SITE_URL}${site.avatar.startsWith("/") ? "" : "/"}${site.avatar}`;
  const siteDesc = site.friendsDesc?.trim() || site.description;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="友链"
        subtitle={friends.length > 0 ? `一共 ${friends.length} 位朋友` : "一路同行的小伙伴们"}
      />

      {friends.length === 0 ? (
        <div className="glass glass-sheen animate-fade-up rounded-3xl p-10 text-center">
          <Users className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">还没有友链</p>
          <p className="text-muted mt-1 text-sm">欢迎在下方了解如何交换友链</p>
          <Link
            href="/"
            className="glass glass-sheen glass-hover mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            回首页看看
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {friends.map((friend, i) => (
            <FriendCard key={`${friend.name}-${friend.url}`} friend={friend} index={i} />
          ))}
        </div>
      )}

      <section
        className="glass glass-sheen animate-fade-up rounded-3xl p-6 sm:p-7"
        style={{ animationDelay: "140ms" }}
      >
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <UserPlus className="text-brand-500 h-4 w-4" />
          如何交换友链
        </h2>
        <ol className="text-soft mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>先把本站加到你的友链页面；</li>
          <li>然后通过邮件或留言告诉我你的站点名称、链接、头像和一句简介；</li>
          <li>我看到后会尽快回访，并把你的站点添加到这里。</li>
        </ol>

        <div className="glass-soft mt-4 rounded-2xl p-4">
          <p className="text-muted flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <Link2 className="h-3.5 w-3.5" />
            本站信息
          </p>
          <dl className="mt-2.5 space-y-1 font-mono text-xs leading-relaxed">
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted w-12 shrink-0">站名</dt>
              <dd>{siteName}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted w-12 shrink-0">链接</dt>
              <dd className="break-all">{siteLink}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted w-12 shrink-0">头像</dt>
              <dd className="break-all">{siteAvatar}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted w-12 shrink-0">描述</dt>
              <dd className="break-all">{siteDesc}</dd>
            </div>
          </dl>
        </div>
      </section>

      <CommentsSection
        target="friends"
        targetType="friend"
        targetTitle="友链"
        targetUrl="/friends"
      />
    </div>
  );
}
