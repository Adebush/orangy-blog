import { promises as fs } from "node:fs";
import path from "node:path";
import {
  cookieHeader,
  isPlayable as neteasePlayable,
  parsePlaylistId,
  resolveNeteaseUrl,
} from "./netease";
import { paths } from "./paths";
import type { MusicConfig, MusicTrack } from "./types";

/**
 * 网易云音乐歌单接入。
 *
 * 说明：
 * - 歌单详情走 music.163.com 的公开接口；
 * - 播放地址优先走 song/enhance/player/url（登录后会员曲目也能解析），
 *   未登录或拿不到时退回经典 `song/media/outer/url` 外链；
 * - 拉取歌单时会并发探测一遍，只把「当前身份下能播」的歌存下来，
 *   避免播放器里一堆点不动的歌；
 * - CDN 返回的是 http，而本站是 https，浏览器会拦混合内容，
 *   因此所有音频与封面地址统一改写成 https（实测 CDN 支持 https + Range）。
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
  Referer: "https://music.163.com/",
  "User-Agent": UA,
};

/** 单次最多扫描多少首（探测有网络开销，别太大） */
export const MUSIC_SCAN_LIMIT = 40;
const PROBE_CONCURRENCY = 8;

export const defaultMusic: MusicConfig = {
  enabled: false,
  autoplay: true,
  mode: "playlist",
  customTracks: [],
  customName: "我挑选的歌",
  playlistId: "",
  playlistName: "",
  cover: "",
  tracks: [],
  scanned: 0,
  totalInPlaylist: 0,
  updatedAt: "",
};

const toHttps = (url?: string | null): string =>
  url ? url.replace(/^http:\/\//i, "https://") : "";

export async function getMusicConfig(): Promise<MusicConfig> {
  try {
    const raw = await fs.readFile(paths.music, "utf8");
    const parsed = JSON.parse(raw) as Partial<MusicConfig>;
    return {
      ...defaultMusic,
      ...parsed,
      tracks: parsed.tracks ?? [],
      customTracks: parsed.customTracks ?? [],
      autoplay: parsed.autoplay !== false,
      mode: parsed.mode === "custom" ? "custom" : "playlist",
    };
  } catch {
    return defaultMusic;
  }
}

export async function saveMusicConfig(patch: Partial<MusicConfig>): Promise<MusicConfig> {
  const current = await getMusicConfig();
  const next: MusicConfig = { ...current, ...patch };
  await fs.mkdir(path.dirname(paths.music), { recursive: true });
  await fs.writeFile(paths.music, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

interface RawTrack {
  id: number;
  name: string;
  artists?: { name?: string }[];
  album?: { name?: string; picUrl?: string; blurPicUrl?: string };
  duration?: number;
}

interface PlaylistResponse {
  code?: number;
  result?: {
    name?: string;
    coverImgUrl?: string;
    trackCount?: number;
    tracks?: RawTrack[];
  };
}

export interface FetchedPlaylist {
  name: string;
  cover: string;
  total: number;
  tracks: MusicTrack[];
}

/** 拉取歌单详情（不探测可播性） */
export async function fetchNeteasePlaylist(playlistId: string): Promise<FetchedPlaylist> {
  // 支持直接粘贴分享链接 / 分享文本，不只是纯数字 ID
  const id = parsePlaylistId(playlistId);
  if (!id) {
    throw new Error("没认出歌单 ID —— 可以填纯数字，也可以直接粘贴歌单分享链接");
  }

  const cookie = await cookieHeader();
  const headers: Record<string, string> = { ...HEADERS };
  if (cookie) headers.Cookie = cookie;

  let res: Response;
  try {
    res = await fetch(`https://music.163.com/api/playlist/detail?id=${id}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new Error("无法连接网易云音乐接口，请检查服务器网络");
  }
  if (!res.ok) throw new Error(`网易云接口返回 HTTP ${res.status}`);

  const data = (await res.json()) as PlaylistResponse & { msg?: string };
  const result = data.result;

  if (!result) {
    // 网易云对「不存在」和「无权限」都返回 code 404 + msg "no resource"，
    // 这时给出可操作的提示，而不是笼统的「未找到」。
    throw new Error(
      cookie
        ? `读不到这个歌单（ID ${id}）。请确认歌单存在、且属于当前登录的账号，或把它设为公开`
        : `读不到这个歌单（ID ${id}）。私密歌单需要先在上面扫码登录网易云账号，公开歌单请确认 ID 正确`,
    );
  }
  if (!result.tracks?.length) {
    throw new Error(`歌单「${result.name ?? id}」是空的，没有可添加的歌曲`);
  }

  const tracks: MusicTrack[] = result.tracks
    .slice(0, MUSIC_SCAN_LIMIT)
    .map((t) => ({
      id: String(t.id),
      name: t.name,
      artist: (t.artists ?? []).map((a) => a.name).filter(Boolean).join(" / ") || "未知歌手",
      album: t.album?.name ?? "",
      cover: toHttps(t.album?.picUrl ?? t.album?.blurPicUrl),
      duration: t.duration ?? 0,
    }));

  return {
    name: result.name ?? "网易云歌单",
    cover: toHttps(result.coverImgUrl),
    total: result.trackCount ?? result.tracks.length,
    tracks,
  };
}

/** 并发探测并只保留可播放的歌曲 */
export async function filterPlayable(tracks: MusicTrack[]): Promise<MusicTrack[]> {
  const playable: MusicTrack[] = [];
  for (let i = 0; i < tracks.length; i += PROBE_CONCURRENCY) {
    const chunk = tracks.slice(i, i + PROBE_CONCURRENCY);
    const flags = await Promise.all(chunk.map((t) => neteasePlayable(t.id)));
    chunk.forEach((track, idx) => {
      if (flags[idx]) playable.push(track);
    });
  }
  return playable;
}

/**
 * 播放时实时解析地址（外链带时效，不能缓存）。
 * 已登录网易云账号时走 enhance/player/url，会员曲目也能拿到地址。
 */
export async function resolveSongUrl(id: string): Promise<string | null> {
  return resolveNeteaseUrl(id);
}

/** 拉取 + 探测 + 落盘（后台上传歌单时调用） */
export async function refreshMusic(playlistId: string): Promise<MusicConfig> {
  const { name, cover, total, tracks } = await fetchNeteasePlaylist(playlistId);
  const playable = await filterPlayable(tracks);
  return saveMusicConfig({
    playlistId: playlistId.trim(),
    playlistName: name,
    cover,
    tracks: playable,
    scanned: tracks.length,
    totalInPlaylist: total,
    updatedAt: new Date().toISOString(),
  });
}

/** 播放器实际应该显示的曲目：按 mode 决定用歌单还是自定义列表 */
export function activeTracks(config: MusicConfig): MusicTrack[] {
  return config.mode === "custom" ? config.customTracks : config.tracks;
}

/** 歌单扫描结果 + 自定义列表合并去重后的全部可用曲目 id（用于校验播放请求） */
export function allKnownTrackIds(config: MusicConfig): Set<string> {
  return new Set([...config.tracks, ...config.customTracks].map((t) => t.id));
}

/** 手动往自定义列表里加一首（按 id 去重） */
export async function addCustomTrack(track: MusicTrack): Promise<MusicConfig> {
  const current = await getMusicConfig();
  if (current.customTracks.some((t) => t.id === track.id)) {
    return current;
  }
  return saveMusicConfig({
    customTracks: [...current.customTracks, track],
    mode: "custom",
  });
}

export async function removeCustomTrack(id: string): Promise<MusicConfig> {
  const current = await getMusicConfig();
  return saveMusicConfig({
    customTracks: current.customTracks.filter((t) => t.id !== id),
  });
}

export async function clearCustomTracks(): Promise<MusicConfig> {
  return saveMusicConfig({ customTracks: [] });
}
