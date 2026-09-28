import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, MessageCircle, Smile } from "lucide-react";
import { SectionHeader } from "@/components/site/Cards";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { getMoments } from "@/lib/site";
import type { Moment } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "说说",
  description: "碎片化的日常记录，随手写下的想法与心情。",
};

/** 图片网格列数：1~3 列，类名必须完整写出以便 Tailwind 扫描 */
const IMAGE_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

function MomentCard({ moment, index }: { moment: Moment; index: number }) {
  const images = moment.images ?? [];
  const columns = IMAGE_COLUMNS[Math.min(images.length, 3)] ?? "grid-cols-3";

  return (
    <article
      className="glass glass-sheen glass-hover animate-fade-up rounded-3xl p-5 sm:p-6"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <p className="text-soft text-sm leading-relaxed whitespace-pre-line sm:text-[0.95rem]">
        {moment.content}
      </p>

      {images.length > 0 && (
        <div className={`mt-4 grid gap-2 ${columns}`}>
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${moment.id}-${i}`}
              src={src}
              alt={`说说配图 ${i + 1}`}
              loading="lazy"
              className={
                images.length === 1
                  ? "max-h-[30rem] w-full rounded-2xl object-cover"
                  : "h-36 w-full rounded-2xl object-cover sm:h-44"
              }
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/25 pt-3.5 text-xs dark:border-white/10">
        <span className="text-muted flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {relativeTime(moment.date)}
        </span>
        <time dateTime={moment.date} className="text-muted font-mono">
          {formatDate(moment.date)}
        </time>

        {moment.mood && (
          <span className="glass-soft text-brand-600 dark:text-brand-300 flex items-center gap-1 rounded-full px-2.5 py-1">
            <Smile className="h-3 w-3" />
            {moment.mood}
          </span>
        )}
        {moment.location && (
          <span className="glass-soft text-soft flex items-center gap-1 rounded-full px-2.5 py-1">
            <MapPin className="h-3 w-3" />
            {moment.location}
          </span>
        )}
      </div>
    </article>
  );
}

export default async function MomentsPage() {
  const moments = await getMoments();

  // getMoments() 已按时间倒序，这里只做分组，保持顺序
  const groups = new Map<string, Moment[]>();
  for (const m of moments) {
    const year = formatDate(m.date).slice(0, 4) || "未知年份";
    const list = groups.get(year);
    if (list) list.push(m);
    else groups.set(year, [m]);
  }
  const years = [...groups.entries()];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="说说"
        subtitle={moments.length > 0 ? `一共 ${moments.length} 条碎片记录` : "碎片化的日常记录"}
      />

      {moments.length === 0 ? (
        <div className="glass glass-sheen animate-fade-up rounded-3xl p-10 text-center">
          <MessageCircle className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">还没有说说</p>
          <p className="text-muted mt-1 text-sm">生活还在继续，故事正在路上</p>
          <Link
            href="/"
            className="glass glass-sheen glass-hover mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            回首页看看
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        years.map(([year, list]) => (
          <section key={year} className="space-y-4">
            <h2 className="flex items-baseline gap-2 text-lg font-bold tracking-tight">
              <span className="inline-block h-4 w-1.5 self-center rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
              {year}
              <span className="text-muted text-xs font-normal">{list.length} 条</span>
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((m, i) => (
                <MomentCard key={m.id} moment={m} index={i} />
              ))}
            </div>
          </section>
        ))
      )}

      <CommentsSection
        target="moments"
        targetType="moment"
        targetTitle="说说"
        targetUrl="/moments"
      />
    </div>
  );
}
