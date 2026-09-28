import { guardApi } from "@/lib/auth";
import { activeTracks, getMusicConfig, saveMusicConfig } from "@/lib/music";
import type { MusicConfig } from "@/lib/types";

/** 公开：给播放器读取歌单（只返回展示所需字段） */
export async function GET() {
  const music = await getMusicConfig();
  return Response.json({
    ok: true,
    music: {
      enabled: music.enabled,
      mode: music.mode,
      autoplay: music.autoplay,
      playlistId: music.playlistId,
      playlistName: music.playlistName,
      cover: music.cover,
      customName: music.customName,
      customTracks: music.customTracks,
      // 播放器实际要播的曲目（按 mode 决定）
      tracks: activeTracks(music),
      scanned: music.scanned,
      totalInPlaylist: music.totalInPlaylist,
      updatedAt: music.updatedAt,
    },
  });
}

/** 后台：保存开关与歌单 ID（不触发网络请求） */
export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Partial<MusicConfig>;
  const patch: Partial<MusicConfig> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.playlistId === "string") patch.playlistId = body.playlistId.trim();
  if (body.mode === "custom" || body.mode === "playlist") patch.mode = body.mode;
  if (typeof body.autoplay === "boolean") patch.autoplay = body.autoplay;
  if (typeof body.customName === "string" && body.customName.trim()) {
    patch.customName = body.customName.trim();
  }

  const music = await saveMusicConfig(patch);
  return Response.json({ ok: true, music });
}
