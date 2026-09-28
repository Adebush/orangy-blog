#!/usr/bin/env node
/**
 * 命令行刷新网易云歌单（不依赖后台登录，适合放进 cron）。
 *
 *   node scripts/refresh-music.mjs                 # 用 content/music.json 里已存的歌单 ID
 *   node scripts/refresh-music.mjs 3778678         # 指定歌单 ID
 *   node scripts/refresh-music.mjs 3778678 60      # 指定歌单 ID + 最多扫描多少首
 *
 * 逻辑与 lib/music.ts 保持一致：拉歌单 → 并发探测可播性 → 只写回能播的歌。
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const HEADERS = { Referer: "https://music.163.com/", "User-Agent": UA };
const CONCURRENCY = 8;

const projectRoot = process.cwd();
const contentDir = process.env.ORANGY_CONTENT_DIR ?? path.join(projectRoot, "content");
const musicFile = path.join(contentDir, "music.json");

const toHttps = (u) => (u ? String(u).replace(/^http:\/\//i, "https://") : "");

async function readConfig() {
  try {
    return JSON.parse(await fs.readFile(musicFile, "utf8"));
  } catch {
    return { enabled: true, playlistId: "", playlistName: "", cover: "", tracks: [], scanned: 0, totalInPlaylist: 0, updatedAt: "" };
  }
}

async function fetchPlaylist(id, limit) {
  const res = await fetch(`https://music.163.com/api/playlist/detail?id=${id}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`网易云接口返回 HTTP ${res.status}`);
  const data = await res.json();
  const result = data.result;
  if (!result?.tracks?.length) throw new Error("歌单不存在、为空，或不是公开歌单");

  const tracks = result.tracks.slice(0, limit).map((t) => ({
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

async function isPlayable(id) {
  try {
    const res = await fetch(`https://music.163.com/song/media/outer/url?id=${id}.mp3`, {
      redirect: "manual",
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    const location = res.headers.get("location") ?? "";
    if (!location) return res.ok;
    return !location.includes("/404");
  } catch {
    return false;
  }
}

async function main() {
  const config = await readConfig();
  const playlistId = (process.argv[2] ?? config.playlistId ?? "").trim();
  const limit = Number(process.argv[3] ?? 40) || 40;

  if (!/^\d+$/.test(playlistId)) {
    console.error("✗ 歌单 ID 必须是纯数字。用法：node scripts/refresh-music.mjs <歌单ID> [扫描数量]");
    process.exit(1);
  }

  console.log(`▸ 拉取歌单 ${playlistId} …`);
  const { name, cover, total, tracks } = await fetchPlaylist(playlistId, limit);
  console.log(`  歌单「${name}」，共 ${total} 首，本次扫描 ${tracks.length} 首`);

  const playable = [];
  for (let i = 0; i < tracks.length; i += CONCURRENCY) {
    const chunk = tracks.slice(i, i + CONCURRENCY);
    const flags = await Promise.all(chunk.map((t) => isPlayable(t.id)));
    chunk.forEach((t, idx) => flags[idx] && playable.push(t));
    process.stdout.write(`\r  探测进度 ${Math.min(i + CONCURRENCY, tracks.length)}/${tracks.length}`);
  }
  process.stdout.write("\n");

  const next = {
    ...config,
    playlistId,
    playlistName: name,
    cover,
    tracks: playable,
    scanned: tracks.length,
    totalInPlaylist: total,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(contentDir, { recursive: true });
  await fs.writeFile(musicFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  console.log(`✓ 已写入 ${musicFile}`);
  console.log(`  可播放 ${playable.length} / 扫描 ${tracks.length} 首`);
}
main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
