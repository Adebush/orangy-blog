import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, FileText } from "lucide-react";
import { SectionHeader } from "@/components/site/Cards";
import { getArchive } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "归档",
  description: "按年份浏览全部已发布的文章。",
};

export default async function TimelinePage() {
  const archive = await getArchive();
  const total = archive.reduce((sum, year) => sum + year.posts.length, 0);

  const stats = [
    { label: "篇文章", value: total, icon: FileText },
    { label: "个年份", value: archive.length, icon: CalendarDays },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader title="归档" subtitle="时间线上一共留下了这些文字" />

      {total === 0 ? (
        <div className="glass glass-sheen animate-fade-up rounded-3xl p-10 text-center">
          <CalendarDays className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">时间线还是空的</p>
          <p className="text-muted mt-1 text-sm">等第一篇文字写下之后，这里就会亮起来</p>
          <Link
            href="/posts"
            className="glass glass-sheen glass-hover mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            去看看文章
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="glass glass-sheen animate-fade-up rounded-2xl px-4 py-3"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <s.icon className="text-brand-500 h-4 w-4" />
                <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-muted mt-0.5 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {archive.map((group, gi) => (
            <section
              key={group.year}
              className="animate-fade-up"
              style={{ animationDelay: `${60 + gi * 70}ms` }}
            >
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{group.year}</h2>
                <span className="glass-soft text-muted rounded-full px-2.5 py-1 text-[0.7rem]">
                  {group.posts.length} 篇
                </span>
              </div>

              <ol className="relative space-y-3">
                {/* 橙色渐变细线 */}
                <span
                  aria-hidden="true"
                  className="absolute top-2 bottom-2 left-[5px] w-px -translate-x-1/2 bg-gradient-to-b from-brand-400 via-brand-500/50 to-transparent"
                />
                {group.posts.map((post) => (
                  <li key={post.slug} className="relative pl-6">
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-[5px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 ring-4 ring-brand-500/15"
                    />
                    <Link
                      href={`/posts/${encodeURIComponent(post.slug)}`}
                      className="glass glass-sheen glass-hover group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3"
                    >
                      <time
                        dateTime={post.date}
                        className="text-muted w-20 shrink-0 font-mono text-xs"
                      >
                        {formatDate(post.date)}
                      </time>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-brand-500">
                        {post.title}
                      </span>
                      <span className="text-muted flex shrink-0 items-center gap-1 text-xs">
                        <Clock3 className="h-3 w-3" />
                        {post.readingTime} 分钟
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
