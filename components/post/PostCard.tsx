import Link from "next/link";
import { ArrowUpRight, Clock, Pin } from "lucide-react";
import type { PostMeta } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function PostCard({ post, index = 0 }: { post: PostMeta; index?: number }) {
  return (
    <article
      className="animate-fade-up group"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <Link
        href={`/posts/${encodeURIComponent(post.slug)}`}
        className="glass glass-sheen glass-hover block overflow-hidden rounded-3xl"
      >
        {post.cover ? (
          <div className="relative h-44 overflow-hidden sm:h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </div>
        ) : (
          /* 没有封面时的占位：淡粉底 + 细点阵，比彩虹渐变克制 */
          <div className="relative h-20 overflow-hidden border-b border-white/30 dark:border-white/8">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-100/80 via-white/50 to-brand-200/60 dark:from-brand-900/35 dark:via-transparent dark:to-brand-800/25" />
            <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--color-brand-300)_1px,transparent_1px)] [background-size:13px_13px] dark:opacity-40 dark:[background-image:radial-gradient(var(--color-brand-700)_1px,transparent_1px)]" />
          </div>
        )}

        <div className="p-5">
          <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime} 分钟
            </span>
            {post.pinned && (
              <span className="flex items-center gap-1 text-brand-500">
                <Pin className="h-3 w-3" />
                置顶
              </span>
            )}
            {post.draft && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                草稿
              </span>
            )}
          </div>

          <h3 className="mt-2.5 flex items-start justify-between gap-2 text-lg font-bold leading-snug tracking-tight">
            <span className="transition-colors group-hover:text-brand-500">{post.title}</span>
            <ArrowUpRight className="text-muted mt-0.5 h-4 w-4 shrink-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </h3>

          <p className="text-soft mt-2 line-clamp-2 text-sm leading-relaxed">{post.excerpt}</p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="glass-soft rounded-full px-2.5 py-1 text-[0.7rem] font-medium text-brand-600 dark:text-brand-300">
              {post.category}
            </span>
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-muted text-[0.7rem]">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
