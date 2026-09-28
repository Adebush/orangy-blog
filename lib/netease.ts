import { promises as fs } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { paths } from "./paths";
import type { NeteaseAccount, NeteaseSong } from "./types";

/**
 * 网易云接入层。
 *
 * 为什么需要登录：
 *   未登录时 song/enhance/player/url 对会员曲目返回 code=404、url=null；
 *   带上账号 Cookie 后才会返回真实播放地址。所以 VIP 曲目必须登录。
 *
 * 登录方式用「扫码」：
 *   不接触用户密码，只需要在后台显示一个二维码让用户用网易云 App 扫。
 *
 * ⚠️ Cookie 等同于账号凭据，单独存在 content/.netease.json（已在 .gitignore 中），
 *    任何接口都不会把 Cookie 返回给前端。
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BASE_HEADERS: Record<string, string> = {
  Referer: "https://music.163.com/",
  "User-Agent": UA,
  "Content-Type": "application/x-www-form-urlencoded",
};

interface StoredCredentials {
  cookie: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
  vipType: number;
  loggedInAt: string;
}

const emptyAccount: NeteaseAccount = {
  loggedIn: false,
  userId: "",
  nickname: "",
  avatarUrl: "",
  vipType: 0,
  loggedInAt: "",
};

async function readCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await fs.readFile(paths.netease, "utf8");
    const data = JSON.parse(raw) as StoredCredentials;
    return data?.cookie ? data : null;
  } catch {
    return null;
  }
}

async function writeCredentials(data: StoredCredentials): Promise<void> {
  await fs.mkdir(path.dirname(paths.netease), { recursive: true });
  await fs.writeFile(paths.netease, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

/** 对外暴露的账号信息（不含 Cookie） */
export async function getAccount(): Promise<NeteaseAccount> {
  const cred = await readCredentials();
  if (!cred) return emptyAccount;
  return {
    loggedIn: true,
    userId: cred.userId,
    nickname: cred.nickname,
    avatarUrl: cred.avatarUrl,
    vipType: cred.vipType ?? 0,
    loggedInAt: cred.loggedInAt,
  };
}

export async function logout(): Promise<void> {
  try {
    await fs.unlink(paths.netease);
  } catch {
    /* 本来就没了 */
  }
}

/** 内部使用：拿到 Cookie 头（绝不外传）。music.ts 拉私密歌单也要用 */
export async function cookieHeader(): Promise<string> {
  const cred = await readCredentials();
  return cred?.cookie ?? "";
}

// ============================================================
// 扫码登录
// ============================================================

interface QrSession {
  /** 生成 unikey 时服务端下发的 cookie，轮询时要带上 */
  cookie: string;
  createdAt: number;
}

/** 待轮询的二维码会话（进程内短期保存即可） */
const qrSessions = new Map<string, QrSession>();
const QR_TTL_MS = 5 * 60_000;

function pruneQrSessions() {
  const now = Date.now();
  for (const [key, session] of qrSessions) {
    if (now - session.createdAt > QR_TTL_MS) qrSessions.delete(key);
  }
}

function joinCookies(setCookies: string[]): string {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

export interface QrLoginStart {
  key: string;
  /** data:image/png;base64,... */
  qr: string;
}

/** 第一步：取 unikey 并生成二维码 */
export async function startQrLogin(): Promise<QrLoginStart> {
  pruneQrSessions();

  const res = await fetch("https://music.163.com/api/login/qrcode/unikey?type=1", {
    method: "POST",
    headers: BASE_HEADERS,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json()) as { code?: number; unikey?: string };
  if (data.code !== 200 || !data.unikey) {
    throw new Error("无法获取登录二维码，请稍后再试");
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  qrSessions.set(data.unikey, {
    cookie: joinCookies(setCookies),
    createdAt: Date.now(),
  });

  const qr = await QRCode.toDataURL(`https://music.163.com/login?codekey=${data.unikey}`, {
    margin: 1,
    width: 260,
    errorCorrectionLevel: "M",
  });

  return { key: data.unikey, qr };
}

export interface QrLoginPoll {
  /** 801 待扫描 / 802 待确认 / 803 成功 / 800 过期 */
  status: "waiting" | "scanned" | "success" | "expired" | "error";
  message: string;
  account?: NeteaseAccount;
}

/** 第二步：轮询扫码结果 */
export async function pollQrLogin(key: string): Promise<QrLoginPoll> {
  const session = qrSessions.get(key);
  const headers: Record<string, string> = { ...BASE_HEADERS };
  if (session?.cookie) headers.Cookie = session.cookie;

  const res = await fetch(
    `https://music.163.com/api/login/qrcode/client/login?key=${encodeURIComponent(key)}&type=1`,
    { method: "POST", headers, signal: AbortSignal.timeout(15_000), cache: "no-store" },
  );

  const data = (await res.json()) as { code?: number; message?: string };
  const code = data.code;

  if (code === 801) return { status: "waiting", message: "等待扫码…" };
  if (code === 802) return { status: "scanned", message: "已扫码，请在手机上确认登录" };
  if (code === 800) {
    qrSessions.delete(key);
    return { status: "expired", message: "二维码已过期，请重新获取" };
  }
  if (code !== 803) {
    return { status: "error", message: data.message || `登录失败（code ${code}）` };
  }

  // 803：Set-Cookie 里就是账号凭据
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookie = joinCookies(setCookies);
  if (!cookie.includes("MUSIC_U")) {
    return { status: "error", message: "登录成功但没拿到凭据，请重试" };
  }

  // 用 Cookie 查一次账号信息，顺便验证凭据有效
  let userId = "";
  let nickname = "";
  let avatarUrl = "";
  let vipType = 0;
  try {
    const infoRes = await fetch("https://music.163.com/api/nuser/account/get", {
      headers: { ...BASE_HEADERS, Cookie: cookie },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const info = (await infoRes.json()) as {
      account?: { id?: number; vipType?: number };
      profile?: { userId?: number; nickname?: string; avatarUrl?: string; vipType?: number };
    };
    userId = String(info.profile?.userId ?? info.account?.id ?? "");
    nickname = info.profile?.nickname ?? "";
    avatarUrl = info.profile?.avatarUrl ?? "";
    vipType = info.profile?.vipType ?? info.account?.vipType ?? 0;
  } catch {
    /* 拿不到资料不影响使用 */
  }

  await writeCredentials({
    cookie,
    userId,
    nickname,
    avatarUrl,
    vipType,
    loggedInAt: new Date().toISOString(),
  });
  qrSessions.delete(key);

  return {
    status: "success",
    message: nickname ? `已登录：${nickname}` : "登录成功",
    account: await getAccount(),
  };
}

// ============================================================
// 搜索
// ============================================================

interface CloudSearchSong {
  id: number;
  name: string;
  fee?: number;
  dt?: number;
  duration?: number;
  ar?: { name?: string }[];
  artists?: { name?: string }[];
  al?: { name?: string; picUrl?: string };
  album?: { name?: string; picUrl?: string };
  privilege?: { pl?: number; plLevel?: string | null };
}

/** 搜索歌曲；带上登录态能搜到更多（且能判断是否可播） */
export async function searchSongs(keyword: string, limit = 20): Promise<NeteaseSong[]> {
  const q = keyword.trim();
  if (!q) return [];

  const headers: Record<string, string> = { ...BASE_HEADERS };
  const cookie = await cookieHeader();
  if (cookie) headers.Cookie = cookie;

  const body = new URLSearchParams({
    s: q,
    type: "1",
    limit: String(Math.min(Math.max(limit, 1), 50)),
    offset: "0",
  });

  const res = await fetch("https://music.163.com/api/cloudsearch/pc", {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`网易云搜索接口返回 HTTP ${res.status}`);

  const data = (await res.json()) as {
    code?: number;
    result?: { songs?: CloudSearchSong[] };
    message?: string;
  };

  // -462 之类是风控，提示用户稍后再试
  if (data.code !== 200) {
    throw new Error(
      data.code === -462
        ? "网易云触发了风控验证，请稍后再试（或先在浏览器登录一次）"
        : data.message || `搜索失败（code ${data.code}）`,
    );
  }

  return (data.result?.songs ?? []).map((song) => {
    const artists = song.ar ?? song.artists ?? [];
    const album = song.al ?? song.album ?? {};
    const fee = song.fee ?? 0;
    const pl = song.privilege?.pl ?? 0;
    return {
      id: String(song.id),
      name: song.name,
      artist: artists.map((a) => a.name).filter(Boolean).join(" / ") || "未知歌手",
      album: album.name ?? "",
      cover: (album.picUrl ?? "").replace(/^http:\/\//i, "https://"),
      duration: song.dt ?? song.duration ?? 0,
      fee,
      playable: pl > 0,
      vip: fee === 1,
    };
  });
}

// ============================================================
// 播放地址
// ============================================================

/**
 * 解析可播放地址。
 * 已登录时优先走 enhance/player/url —— 这是唯一能给会员曲目返回地址的接口；
 * 拿不到再退回经典外链。
 */
export async function resolveNeteaseUrl(id: string): Promise<string | null> {
  if (!/^\d+$/.test(id)) return null;
  const cookie = await cookieHeader();

  if (cookie) {
    try {
      const res = await fetch(
        `https://music.163.com/api/song/enhance/player/url?ids=%5B${id}%5D&br=320000`,
        {
          headers: { ...BASE_HEADERS, Cookie: cookie },
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        },
      );
      const data = (await res.json()) as {
        data?: { url?: string | null; code?: number }[];
      };
      const url = data.data?.[0]?.url;
      if (url) return url.replace(/^http:\/\//i, "https://");
    } catch {
      /* 继续走下面的兜底 */
    }
  }

  // 兜底：经典外链（免费曲目可用）
  try {
    const res = await fetch(`https://music.163.com/song/media/outer/url?id=${id}.mp3`, {
      redirect: "manual",
      headers: { ...BASE_HEADERS, ...(cookie ? { Cookie: cookie } : {}) },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const location = res.headers.get("location") ?? "";
    if (location && !location.includes("/404")) {
      return location.replace(/^http:\/\//i, "https://");
    }
    return null;
  } catch {
    return null;
  }
}

/** 探测是否可播放（用于过滤歌单） */
export async function isPlayable(id: string): Promise<boolean> {
  return (await resolveNeteaseUrl(id)) !== null;
}

// ============================================================
// 歌单 ID 解析
// ============================================================

/**
 * 允许用户直接粘贴分享链接或分享文本，而不只是纯数字 ID。
 * 支持：
 *   3778678
 *   https://music.163.com/playlist?id=3778678
 *   https://music.163.com/#/playlist?id=3778678&userid=1
 *   https://y.music.163.com/m/playlist?id=3778678
 *   分享文本「... /playlist/3778678 ...」
 */
export function parsePlaylistId(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return s;

  const patterns = [
    /playlist[/?#]*\?[^#]*\bid=(\d+)/i,
    /[?&#]id=(\d+)/i,
    /playlist\/(\d+)/i,
    /\b(\d{5,})\b/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}
