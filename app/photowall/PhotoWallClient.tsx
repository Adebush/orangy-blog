"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Images, X } from "lucide-react";
import type { Photo } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const ALL_TAG = "全部";

export function PhotoWallClient({ photos }: { photos: Photo[] }) {
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const photo of photos) {
      if (photo.tag) set.add(photo.tag);
    }
    return [ALL_TAG, ...[...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))];
  }, [photos]);

  const [activeTag, setActiveTag] = useState(ALL_TAG);
  const [current, setCurrent] = useState<number | null>(null);

  const filtered = useMemo(
    () => (activeTag === ALL_TAG ? photos : photos.filter((p) => p.tag === activeTag)),
    [photos, activeTag],
  );

  const close = useCallback(() => setCurrent(null), []);
  const step = useCallback(
    (delta: number) => {
      setCurrent((index) =>
        index === null || filtered.length === 0
          ? null
          : (index + delta + filtered.length) % filtered.length,
      );
    },
    [filtered.length],
  );

  // 切换筛选时关掉灯箱，避免索引越界
  useEffect(() => {
    setCurrent(null);
  }, [activeTag]);

  useEffect(() => {
    if (current === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    };

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [current, close, step]);

  const active = current !== null ? filtered[current] : undefined;

  if (photos.length === 0) {
    return (
      <div className="glass glass-sheen animate-fade-up rounded-3xl p-10 text-center">
        <Images className="text-muted mx-auto h-8 w-8" />
        <p className="mt-3 font-medium">相册还是空的</p>
        <p className="text-muted mt-1 text-sm">照片还在路上，先去别处逛逛吧</p>
      </div>
    );
  }

  return (
    <div>
      {tags.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              aria-pressed={activeTag === tag}
              className={cn(
                "glass glass-sheen shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                activeTag === tag
                  ? "text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/40"
                  : "text-soft hover:text-brand-500",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass glass-sheen rounded-3xl p-10 text-center">
          <ImageOff className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">这个分类下还没有照片</p>
          <p className="text-muted mt-1 text-sm">换一个标签看看吧</p>
        </div>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {filtered.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`查看照片：${photo.title ?? photo.tag ?? photo.id}`}
              className="glass glass-sheen glass-hover animate-fade-up group mb-4 block w-full break-inside-avoid overflow-hidden rounded-3xl p-1.5 text-left"
              style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.title ?? "照片"}
                loading="lazy"
                className="w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {(photo.title || photo.tag || photo.date) && (
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="text-soft min-w-0 flex-1 truncate text-xs font-medium">
                    {photo.title ?? photo.tag}
                  </span>
                  {photo.date && (
                    <span className="text-muted shrink-0 font-mono text-[0.68rem]">
                      {formatDate(photo.date)}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title ?? "图片预览"}
          onClick={close}
          className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md sm:p-8"
        >
          <button
            type="button"
            onClick={close}
            aria-label="关闭"
            className="glass-strong absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full text-white transition-colors hover:text-brand-400"
          >
            <X className="h-5 w-5" />
          </button>

          {filtered.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  step(-1);
                }}
                aria-label="上一张"
                className="glass-strong absolute left-2 grid h-10 w-10 place-items-center rounded-full text-white transition-colors hover:text-brand-400 sm:left-5 sm:h-12 sm:w-12"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  step(1);
                }}
                aria-label="下一张"
                className="glass-strong absolute right-2 grid h-10 w-10 place-items-center rounded-full text-white transition-colors hover:text-brand-400 sm:right-5 sm:h-12 sm:w-12"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <figure
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full max-w-5xl flex-col items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.src}
              alt={active.title ?? "照片"}
              className="max-h-[76vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <figcaption className="text-center text-xs text-white/80 sm:text-sm">
              {active.title && <span className="font-medium">{active.title}</span>}
              {active.date && (
                <span className="text-white/55"> · {formatDate(active.date)}</span>
              )}
              <span className="ml-2 font-mono text-white/45">
                {(current ?? 0) + 1} / {filtered.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
