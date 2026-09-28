"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Music,
  RefreshCw,
  Save,
} from "lucide-react";
import type { MusicConfig, MusicTrack, NeteaseAccount } from "@/lib/types";
import { NeteasePanel } from "./NeteasePanel";
import { cn } from "@/lib/utils";

function formatDuration(ms?: number): string {
  if (!ms) return "--:--";
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function MusicSettings({
  initial,
  initialAccount,
}: {
  initial: MusicConfig;
  initialAccount: NeteaseAccount;
}) {
  const router = useRouter();
  const [music, setMusic] = useState<MusicConfig>(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [playlistId, setPlaylistId] = useState(initial.playlistId);
  const [autoplay, setAutoplay] = useState(initial.autoplay !== false);
  const [busy, setBusy] = useState<"save" | "fetch" | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  }

  /** 只保存开关与歌单 ID，不联网 */
  async function saveOnly() {
    setBusy("save");
    try {
      const res = await fetch("/api/music", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, playlistId, autoplay }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; music?: MusicConfig };
      if (data.ok && data.music) {
        setMusic(data.music);
        flash("ok", "已保存");
        router.refresh();
      } else {
        flash("err", data.error ?? "保存失败");
      }
    } finally {
      setBusy(null);
    }
  }

  /** 保存并重新拉取歌单（会联网探测可播放性） */
  async function fetchPlaylist() {
    if (!/^\d+$/.test(playlistId.trim())) {
      flash("err", "歌单 ID 必须是纯数字");
      return;
    }
    setBusy("fetch");
    try {
      await fetch("/api/music", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, playlistId }),
      });
      const res = await fetch("/api/music/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; music?: MusicConfig };
      if (data.music) setMusic(data.music);
      if (data.ok && data.music) {
        flash(
          "ok",
          `拉取成功：扫描 ${data.music.scanned} 首，其中 ${data.music.tracks.length} 首可播放`,
        );
        router.refresh();
      } else {
        flash("err", data.error ?? "拉取失败");
      }
    } catch {
      flash("err", "网络错误，拉取失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-muted flex items-start gap-2 rounded-2xl bg-brand-500/8 px-4 py-3 text-xs">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          填写网易云歌单 ID 即可。获取方式：在网易云打开歌单 → 分享 → 复制链接，
          链接里 <code className="text-brand-600 dark:text-brand-300">id=</code> 后面那串数字就是。
          <br />
          保存后会把歌单里<b>实测能播放</b>的歌挑出来（VIP / 下架歌曲会被自动跳过），
          播放时实时解析地址，不占用服务器带宽。
        </span>
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
          {message.type === "ok" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* 网易云账号 / 搜索 / 自定义播放列表 */}
      <NeteasePanel
        initialAccount={initialAccount}
        initialCustomTracks={initial.customTracks ?? []}
        initialMode={initial.mode ?? "playlist"}
        initialCustomName={initial.customName ?? ""}
      />

      <div className="glass glass-sheen space-y-4 rounded-3xl p-5 sm:p-6">
        <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-brand-500 h-4 w-4"
          />
          在前台显示音乐分区
        </label>

        <label className="glass-soft flex cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(e) => setAutoplay(e.target.checked)}
            className="accent-brand-500 h-4 w-4"
          />
          打开页面自动播放
        </label>
        <p className="text-muted text-xs">
          浏览器一律拦截「带声音的自动播放」，这是浏览器策略，代码绕不过。
          打开自动播放后：进入页面会立刻尝试播放，若被拦截，会在用户
          <b>第一次点击 / 触摸 / 按键</b>时自动开始，并在分区上提示。
        </p>

        <div>
          <label className="text-soft mb-1.5 block text-sm font-medium">网易云歌单 ID</label>
          <input
            value={playlistId}
            onChange={(e) => setPlaylistId(e.target.value)}
            placeholder="例如 3778678，或直接粘贴歌单分享链接"
            inputMode="numeric"
            className="glass-soft w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchPlaylist}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {busy === "fetch" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {busy === "fetch" ? "拉取中（需要十几秒）…" : "保存并拉取歌单"}
          </button>
          <button
            type="button"
            onClick={saveOnly}
            disabled={busy !== null}
            className="glass-soft hover:text-brand-500 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            仅保存开关
          </button>
        </div>
      </div>

      {/* 当前歌单状态 */}
      <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 dark:bg-brand-900/40">
            {music.cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={music.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music className="text-brand-500 h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{music.playlistName || "尚未拉取歌单"}</p>
            <p className="text-muted text-xs">
              {music.tracks.length > 0 ? (
                <>
                  可播放 {music.tracks.length} 首 · 扫描 {music.scanned} 首
                  {music.totalInPlaylist ? ` · 歌单共 ${music.totalInPlaylist} 首` : ""}
                  {music.updatedAt ? ` · 更新于 ${music.updatedAt.slice(0, 16).replace("T", " ")}` : ""}
                </>
              ) : (
                "填好歌单 ID 后点「保存并拉取歌单」"
              )}
            </p>
          </div>
        </div>

        {music.tracks.length > 0 && (
          <ul className="mt-4 max-h-80 divide-y divide-white/20 overflow-y-auto dark:divide-white/8">
            {music.tracks.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="text-muted w-6 shrink-0 text-xs tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.name}</span>
                  <span className="text-muted block truncate text-xs">{t.artist}</span>
                </span>
                <span className="text-muted shrink-0 text-xs tabular-nums">
                  {formatDuration(t.duration)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
