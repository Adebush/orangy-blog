"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  ListMusic,
  Loader2,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { neteaseOutchainUrl, neteaseSongPageUrl } from "@/lib/music-links";
import type { MusicConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const VOLUME_KEY = "orangy-volume";

function formatTime(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * 主页的毛玻璃音乐分区（取代原来的左下角悬浮播放器）。
 *
 * 关于「自动播放」：浏览器一律拦截带声音的自动播放（Chrome/Safari/Edge 都是），
 * 这是策略，代码绕不过去。这里的做法是：
 *   1) 打开页面立刻尝试播放；
 *   2) 被拦下就提示「点击页面任意处开始播放」，并在用户第一次点击/触摸/按键时立刻开始。
 * 实际体验上，用户随手一点音乐就响了。
 */
export function MusicSection({ config }: { config: MusicConfig }) {
  const tracks = config.tracks;
  const audioRef = useRef<HTMLAudioElement>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [needGesture, setNeedGesture] = useState(false);
  const [error, setError] = useState("");
  const [showList, setShowList] = useState(false);
  const [embedId, setEmbedId] = useState<string | null>(null);

  const track = tracks[index];
  const listName =
    config.mode === "custom" ? config.customName || "我挑选的歌" : config.playlistName;

  // 音量记忆
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(VOLUME_KEY));
      if (!Number.isNaN(saved) && saved > 0 && saved <= 1) setVolume(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* ignore */
    }
  }, [volume, muted]);

  /** 播放指定曲目；返回是否真的开始播放了 */
  const playAt = useCallback(
    async (target: number, silent = false): Promise<boolean> => {
      const next = tracks[target];
      if (!next) return false;
      setIndex(target);
      setCurrent(0);
      if (!silent) setError("");
      setLoading(true);
      try {
        const res = await fetch(`/api/music/url?id=${encodeURIComponent(next.id)}`);
        const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
        if (!data.ok || !data.url) {
          setError("本站解析不到播放地址，已切换为网易云官方播放器");
          setEmbedId(next.id);
          setPlaying(false);
          return false;
        }
        const audio = audioRef.current;
        if (!audio) return false;
        audio.src = data.url;
        await audio.play();
        setEmbedId(null);
        setPlaying(true);
        setError("");
        return true;
      } catch {
        // play() 被浏览器拦截时会抛 NotAllowedError
        return false;
      } finally {
        setLoading(false);
      }
    },
    [tracks],
  );

  // 打开页面自动播放；被拦截则进入「等待首次交互」状态
  useEffect(() => {
    if (!config.autoplay || tracks.length === 0) return;
    let cancelled = false;
    (async () => {
      const ok = await playAt(0, true);
      if (!cancelled && !ok) setNeedGesture(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [config.autoplay, tracks.length, playAt]);

  // 被拦后：用户第一次点击 / 触摸 / 按键就立刻开始
  useEffect(() => {
    if (!needGesture) return;
    const handler = async () => {
      const ok = await playAt(index, true);
      if (ok) setNeedGesture(false);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, handler));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [needGesture, index, playAt]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.src) {
      void audio
        .play()
        .then(() => {
          setPlaying(true);
          setNeedGesture(false);
        })
        .catch(() => setNeedGesture(true));
      return;
    }
    void playAt(index);
  }

  const next = useCallback(
    () => playAt((index + 1) % Math.max(tracks.length, 1)),
    [index, playAt, tracks.length],
  );
  const prev = useCallback(
    () => playAt((index - 1 + tracks.length) % Math.max(tracks.length, 1)),
    [index, playAt, tracks.length],
  );

  if (tracks.length === 0) return null;

  const percent = track?.duration ? Math.min(100, (current / track.duration) * 100) : 0;

  return (
    <section className="glass glass-sheen animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime * 1000)}
        onEnded={next}
        onError={() => {
          if (playing) {
            setError("播放中断");
            next();
          }
        }}
      />

      <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-brand-300/25 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* 封面 */}
        <div className="relative h-16 w-16 shrink-0 self-start sm:h-20 sm:w-20">
          <div
            className={cn(
              "absolute inset-0 overflow-hidden rounded-2xl bg-brand-100 dark:bg-brand-900/40",
              playing && "animate-spin-slow",
            )}
          >
            {track?.cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={track.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center">
                <Music className="text-brand-500 h-6 w-6" />
              </span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40">
            <Music className="h-3 w-3" />
          </span>
        </div>

        {/* 曲目信息 */}
        <div className="min-w-0 flex-1">
          <p className="text-muted flex items-center gap-2 text-xs">
            正在播放
            <span className="truncate">· {listName}</span>
            {needGesture && (
              <span className="text-brand-600 dark:text-brand-300 shrink-0">
                · 点击页面任意处开始播放
              </span>
            )}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {track?.name ?? "暂无歌曲"}
            </h3>
            {track && (
              <a
                href={neteaseSongPageUrl(track.id)}
                target="_blank"
                rel="noreferrer noopener"
                title="去网易云听这首歌"
                aria-label="去网易云听这首歌"
                className="text-muted hover:text-brand-500 shrink-0 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-muted mt-0.5 truncate text-xs">{track?.artist}</p>

          {/* 进度 */}
          {!(track && embedId === track.id) && (
            <div className="mt-2.5">
              <input
                type="range"
                min={0}
                max={track?.duration || 0}
                value={current}
                onChange={(e) => {
                  const audio = audioRef.current;
                  const value = Number(e.target.value);
                  setCurrent(value);
                  if (audio && audio.src) audio.currentTime = value / 1000;
                }}
                aria-label="播放进度"
                className="accent-brand-500 h-1 w-full cursor-pointer appearance-none rounded-full bg-black/10 dark:bg-white/15"
                style={{
                  background: `linear-gradient(to right, var(--color-brand-500) ${percent}%, transparent ${percent}%)`,
                }}
              />
              <div className="text-muted mt-1 flex justify-between text-[0.68rem] tabular-nums">
                <span>{formatTime(current)}</span>
                <span>{formatTime(track?.duration ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 控制 */}
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
          {tracks.length > 1 && (
            <button
              type="button"
              onClick={prev}
              aria-label="上一首"
              className="glass-soft hover:text-brand-500 grid h-10 w-10 place-items-center rounded-full transition-colors"
            >
              <SkipBack className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "暂停" : "播放"}
            className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </button>

          {tracks.length > 1 && (
            <button
              type="button"
              onClick={next}
              aria-label="下一首"
              className="glass-soft hover:text-brand-500 grid h-10 w-10 place-items-center rounded-full transition-colors"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          )}

          <div className="text-muted ml-1 hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              aria-label={muted ? "取消静音" : "静音"}
              className="hover:text-brand-500 transition-colors"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(false);
              }}
              aria-label="音量"
              className="accent-brand-500 h-1 w-16 cursor-pointer"
            />
          </div>

          {tracks.length > 1 && (
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              aria-label="播放列表"
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full transition-colors",
                showList ? "text-brand-500" : "glass-soft hover:text-brand-500",
              )}
            >
              <ListMusic className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 官方播放器兜底 */}
      {track && embedId === track.id && (
        <div className="relative mt-4">
          <iframe
            src={neteaseOutchainUrl(track.id)}
            title={`${track.name} - 网易云官方播放器`}
            width="100%"
            height={66}
            frameBorder={0}
            allow="autoplay"
            className="rounded-xl bg-white/60"
          />
          <p className="text-muted mt-2 text-[0.68rem]">
            这是网易云官方播放器。会员曲目可在此登录网易云账号后播放。
          </p>
        </div>
      )}

      {error && (
        <p className="text-brand-700 dark:text-brand-300 relative mt-3 rounded-2xl bg-brand-500/10 px-3.5 py-2 text-xs">
          {error}
        </p>
      )}

      {/* 播放列表 */}
      {showList && tracks.length > 1 && (
        <ul className="relative mt-4 max-h-64 divide-y divide-white/20 overflow-y-auto border-t border-white/30 pt-2 dark:divide-white/8 dark:border-white/10">
          {tracks.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => playAt(i)}
                className={cn(
                  "flex w-full items-center gap-3 px-1 py-2 text-left text-sm transition-colors",
                  i === index
                    ? "text-brand-600 dark:text-brand-300"
                    : "hover:bg-white/40 dark:hover:bg-white/8",
                )}
              >
                <span className="text-muted w-5 shrink-0 text-xs tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.name}</span>
                  <span className="text-muted block truncate text-xs">{t.artist}</span>
                </span>
                <span className="text-muted shrink-0 text-[0.68rem]">
                  {formatTime(t.duration ?? 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
