"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  Crown,
  Loader2,
  LogOut,
  Music,
  Plus,
  QrCode,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { MusicTrack, NeteaseAccount, NeteaseSong } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputCls =
  "glass-soft w-full rounded-2xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]";

function formatDuration(ms: number): string {
  if (!ms) return "--:--";
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function NeteasePanel({
  initialAccount,
  initialCustomTracks,
  initialMode,
  initialCustomName,
}: {
  initialAccount: NeteaseAccount;
  initialCustomTracks: MusicTrack[];
  initialMode: "playlist" | "custom";
  initialCustomName: string;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<NeteaseAccount>(initialAccount);
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>(initialCustomTracks);
  const [mode, setMode] = useState<"playlist" | "custom">(initialMode);
  const [customName, setCustomName] = useState(initialCustomName);

  // 登录
  const [qr, setQr] = useState<string | null>(null);
  const [qrKey, setQrKey] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  // 搜索
  const [keyword, setKeyword] = useState("");
  const [songs, setSongs] = useState<NeteaseSong[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  // ---------- 扫码登录 ----------
  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  async function startLogin() {
    setLoginBusy(true);
    setQrStatus("");
    try {
      const res = await fetch("/api/music/account/qr", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; key?: string; qr?: string; error?: string };
      if (!data.ok || !data.qr || !data.key) {
        flash("err", data.error ?? "获取二维码失败");
        return;
      }
      setQr(data.qr);
      setQrKey(data.key);
      setQrStatus("请用网易云音乐 App 扫码");

      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const r = await fetch("/api/music/account/qr", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: data.key }),
          });
          const s = (await r.json()) as {
            ok: boolean;
            status?: string;
            message?: string;
            account?: NeteaseAccount;
          };
          if (s.message) setQrStatus(s.message);
          if (s.status === "success" && s.account) {
            stopPolling();
            setAccount(s.account);
            setQr(null);
            setQrKey(null);
            flash("ok", s.message ?? "登录成功");
            router.refresh();
          } else if (s.status === "expired" || s.status === "error") {
            stopPolling();
            setQr(null);
            setQrKey(null);
          }
        } catch {
          /* 单次失败继续轮询 */
        }
      }, 2500);
    } finally {
      setLoginBusy(false);
    }
  }

  async function doLogout() {
    if (!window.confirm("退出后会员 VIP 歌曲将无法播放，确定退出吗？")) return;
    stopPolling();
    await fetch("/api/music/account", { method: "DELETE" });
    setAccount({ loggedIn: false, userId: "", nickname: "", avatarUrl: "", vipType: 0, loggedInAt: "" });
    setQr(null);
    flash("ok", "已退出网易云账号");
    router.refresh();
  }

  // ---------- 搜索 ----------
  async function doSearch(event?: React.FormEvent) {
    event?.preventDefault();
    if (!keyword.trim()) return;
    setSearching(true);
    setSongs([]);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(keyword.trim())}`);
      const data = (await res.json()) as { ok: boolean; songs?: NeteaseSong[]; error?: string };
      if (!data.ok) {
        flash("err", data.error ?? "搜索失败");
        return;
      }
      setSongs(data.songs ?? []);
      if (!data.songs?.length) flash("err", "没搜到相关歌曲");
    } catch {
      flash("err", "网络错误，搜索失败");
    } finally {
      setSearching(false);
    }
  }

  async function add(song: NeteaseSong) {
    setAdding(song.id);
    try {
      const res = await fetch("/api/music/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: song.id,
          name: song.name,
          artist: song.artist,
          album: song.album,
          cover: song.cover,
          duration: song.duration,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        customTracks?: MusicTrack[];
        mode?: "playlist" | "custom";
        error?: string;
      };
      if (!data.ok || !data.customTracks) {
        flash("err", data.error ?? "添加失败");
        return;
      }
      setCustomTracks(data.customTracks);
      if (data.mode) setMode(data.mode);
      flash("ok", `已加入播放列表：${song.name}`);
      router.refresh();
    } finally {
      setAdding(null);
    }
  }

  async function remove(id: string, name: string) {
    const res = await fetch(`/api/music/tracks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json()) as { ok: boolean; customTracks?: MusicTrack[] };
    if (data.ok && data.customTracks) {
      setCustomTracks(data.customTracks);
      flash("ok", `已移除：${name}`);
      router.refresh();
    }
  }

  async function clearAll() {
    if (!window.confirm("确定清空手动挑选的全部曲目吗？")) return;
    const res = await fetch("/api/music/tracks?all=1", { method: "DELETE" });
    const data = (await res.json()) as { ok: boolean; customTracks?: MusicTrack[] };
    if (data.ok) {
      setCustomTracks(data.customTracks ?? []);
      flash("ok", "已清空");
      router.refresh();
    }
  }

  async function switchMode(next: "playlist" | "custom") {
    setMode(next);
    await fetch("/api/music", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next, customName }),
    });
    flash("ok", next === "custom" ? "播放器已切换为「手动挑选」列表" : "播放器已切换回歌单模式");
    router.refresh();
  }

  const isVip = account.vipType > 0;

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={cn(
            "animate-fade-up flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/12 text-red-600 dark:text-red-400",
          )}
        >
          {message.type === "ok" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* ---------- 账号 ---------- */}
      <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold">
          <QrCode className="h-4 w-4" />
          网易云账号
          {account.loggedIn && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
              已登录
            </span>
          )}
        </h3>

        {account.loggedIn ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {account.avatarUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={account.avatarUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-2xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {account.nickname || `用户 ${account.userId}`}
                {isVip && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.68rem] text-amber-700 dark:text-amber-400">
                    <Crown className="h-3 w-3" />
                    VIP
                  </span>
                )}
              </p>
              <p className="text-muted text-xs">
                会员曲目现在可以解析播放地址了
                {account.loggedInAt
                  ? ` · 登录于 ${account.loggedInAt.slice(0, 16).replace("T", " ")}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={doLogout}
              className="glass-soft flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-muted text-xs leading-relaxed">
              未登录时只能播放免费曲目（会员曲目接口会返回 <code>url=null</code>）。
              扫码登录后即可解析 <b>VIP 歌曲</b>的播放地址 —— 密码不会经过本站，只保存登录凭据。
              <br />
              <span className="text-amber-600 dark:text-amber-400">
                提醒：用个人会员账号给公开站点供曲违反网易云条款，存在封号风险。
              </span>
            </p>
            {qr ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="网易云登录二维码"
                  className="h-[200px] w-[200px] shrink-0 rounded-2xl bg-white p-2"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">用网易云音乐 App 扫码</p>
                  <p className="text-muted mt-1 text-xs">{qrStatus || "等待扫码…"}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopPolling();
                      setQr(null);
                      setQrKey(null);
                    }}
                    className="glass-soft mt-3 inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium"
                  >
                    <X className="h-3.5 w-3.5" />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startLogin}
                disabled={loginBusy}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
              >
                {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                扫码登录网易云
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---------- 搜索 ---------- */}
      <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold">
          <Search className="h-4 w-4" />
          搜索歌曲并加入播放列表
        </h3>

        <form onSubmit={doSearch} className="mt-3.5 flex flex-wrap gap-2">
          <div className="glass-soft flex min-w-[12rem] flex-1 items-center rounded-2xl px-3.5">
            <Search className="text-muted h-4 w-4 shrink-0" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="歌名 / 歌手，例如：晴天 周杰伦"
              className="w-full bg-transparent px-2.5 py-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? "搜索中…" : "搜索"}
          </button>
        </form>

        {songs.length > 0 && (
          <ul className="mt-4 max-h-96 divide-y divide-white/20 overflow-y-auto dark:divide-white/8">
            {songs.map((song) => {
              const added = customTracks.some((t) => t.id === song.id);
              return (
                <li key={song.id} className="flex items-center gap-3 py-2.5">
                  {song.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={song.cover} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10">
                      <Music className="text-brand-500 h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{song.name}</span>
                      {song.vip && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[0.62rem] text-amber-700 dark:text-amber-400">
                          <Crown className="h-2.5 w-2.5" />
                          VIP
                        </span>
                      )}
                      {!song.playable && (
                        <span className="text-muted shrink-0 text-[0.62rem]">当前不可播</span>
                      )}
                    </span>
                    <span className="text-muted block truncate text-xs">
                      {song.artist} · {song.album}
                    </span>
                  </span>
                  <span className="text-muted shrink-0 text-xs tabular-nums">
                    {formatDuration(song.duration)}
                  </span>
                  <button
                    type="button"
                    onClick={() => add(song)}
                    disabled={added || adding === song.id}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                      added
                        ? "glass-soft text-muted cursor-default"
                        : "bg-brand-500 text-white shadow-md shadow-brand-500/30 hover:shadow-lg",
                    )}
                  >
                    {adding === song.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : added ? (
                      <BadgeCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {added ? "已加入" : "加入"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---------- 播放列表 ---------- */}
      <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold">
            <Music className="h-4 w-4" />
            我的播放列表
            <span className="text-muted text-sm font-normal">{customTracks.length} 首</span>
          </h3>
          {customTracks.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="glass-soft flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清空
            </button>
          )}
        </div>

        {/* 前台播放哪个列表 */}
        <div className="glass-soft mt-3.5 flex flex-wrap items-center gap-2 rounded-2xl p-1.5">
          {(
            [
              { key: "playlist", label: "播放歌单" },
              { key: "custom", label: "播放我挑选的" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => switchMode(option.key)}
              className={cn(
                "flex-1 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                mode === option.key
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                  : "text-soft hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-muted mt-2 text-xs">
          当前前台播放的是：
          <b className="text-brand-600 dark:text-brand-300">
            {mode === "custom" ? `手动挑选（${customTracks.length} 首）` : "上面配置的歌单"}
          </b>
        </p>

        {customTracks.length === 0 ? (
          <p className="text-muted mt-4 text-center text-sm">
            还没有挑歌 —— 在上面搜索，点「加入」即可
          </p>
        ) : (
          <ul className="mt-4 max-h-80 divide-y divide-white/20 overflow-y-auto dark:divide-white/8">
            {customTracks.map((track, index) => (
              <li key={track.id} className="flex items-center gap-3 py-2.5">
                <span className="text-muted w-6 shrink-0 text-xs tabular-nums">{index + 1}</span>
                {track.cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={track.cover} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/10">
                    <Music className="text-brand-500 h-3.5 w-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{track.name}</span>
                  <span className="text-muted block truncate text-xs">{track.artist}</span>
                </span>
                <span className="text-muted shrink-0 text-xs tabular-nums">
                  {formatDuration(track.duration ?? 0)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(track.id, track.name)}
                  aria-label={`移除 ${track.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-red-600 transition-colors hover:bg-red-500/12 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
