import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Pin,
  Tag as TagIcon,
} from "lucide-react";
import { ReadingProgress } from "@/components/post/ReadingProgress";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { Toc } from "@/components/post/Toc";
import { getAdjacentPosts, getPost } from "@/lib/posts";
import { formatDate, formatDateCN } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug));
  if (!post) return { title: "文章不存在" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug));
  if (!post) notFound();

  const { prev, next } = await getAdjacentPosts(post.slug);

  return (
    <>
      <ReadingProgress />

      <div className="space-y-6">
        <Link
          href="/posts"
          className="glass-soft text-soft hover:text-brand-500 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>

        {/* 文章头部 */}
        <header className="glass-strong glass-sheen animate-fade-up relative overflow-hidden rounded-4xl p-6 sm:p-9">
          <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-brand-400/30 blur-3xl" />

          <div className="relative">
            {post.pinned && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-300">
                <Pin className="h-3 w-3" />
                置顶文章
              </span>
            )}

            <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              {post.title}
            </h1>

            <div className="text-muted mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateCN(post.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.readingTime} 分钟 · {post.words} 字
              </span>
              <span className="glass-soft text-brand-600 dark:text-brand-300 rounded-full px-2.5 py-1 text-xs font-medium">
                {post.category}
              </span>
            </div>

            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <TagIcon className="text-muted h-3.5 w-3.5" />
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/posts?tag=${encodeURIComponent(t)}`}
                    className="glass-soft hover:text-brand-500 rounded-full px-2.5 py-1 text-xs transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}

            {post.updated && formatDate(post.updated) !== formatDate(post.date) && (
              <p className="text-muted mt-3 text-xs">
                最后更新于 {formatDateCN(post.updated)}
              </p>
            )}
          </div>
        </header>

        {post.cover && (
          <div className="animate-fade-up overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        {/* 正文 + 目录 */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="glass glass-sheen animate-fade-up min-w-0 rounded-4xl p-6 sm:p-9">
            <article
              className="article-prose"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="glass glass-sheen rounded-3xl p-5">
                <Toc items={post.toc} />
                {post.toc.length === 0 && (
                  <p className="text-muted text-sm">本文没有小节标题</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* 上一篇 / 下一篇 */}
        {(prev || next) && (
          <nav className="grid gap-4 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/posts/${encodeURIComponent(prev.slug)}`}
                className="glass glass-sheen glass-hover group rounded-3xl p-5"
              >
                <p className="text-muted flex items-center gap-1.5 text-xs">
                  <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                  上一篇
                </p>
                <p className="mt-2 line-clamp-2 font-semibold transition-colors group-hover:text-brand-500">
                  {prev.title}
                </p>
                <p className="text-muted mt-1.5 text-xs">{formatDate(prev.date)}</p>
              </Link>
            ) : (
              <div className="glass-soft hidden rounded-3xl p-5 sm:block">
                <p className="text-muted text-xs">上一篇</p>
                <p className="text-muted mt-2 text-sm">已经是最新一篇了</p>
              </div>
            )}

            {next ? (
              <Link
                href={`/posts/${encodeURIComponent(next.slug)}`}
                className="glass glass-sheen glass-hover group rounded-3xl p-5 text-right"
              >
                <p className="text-muted flex items-center justify-end gap-1.5 text-xs">
                  下一篇
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
                <p className="mt-2 line-clamp-2 font-semibold transition-colors group-hover:text-brand-500">
                  {next.title}
                </p>
                <p className="text-muted mt-1.5 text-xs">{formatDate(next.date)}</p>
              </Link>
            ) : (
              <div className="glass-soft hidden rounded-3xl p-5 text-right sm:block">
                <p className="text-muted text-xs">下一篇</p>
                <p className="text-muted mt-2 text-sm">已经是最后一篇了</p>
              </div>
            )}
          </nav>
        )}
      </div>

      <CommentsSection
        target={`post:${post.slug}`}
        targetType="post"
        targetTitle={post.title}
        targetUrl={`/posts/${encodeURIComponent(post.slug)}`}
      />
    </>
  );
}
