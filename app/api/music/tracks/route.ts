import { guardApi } from "@/lib/auth";
import { addCustomTrack, clearCustomTracks, getMusicConfig, removeCustomTrack } from "@/lib/music";
import type { MusicTrack } from "@/lib/types";

/** 后台：自定义播放列表读取 */
export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  const music = await getMusicConfig();
  return Response.json({
    ok: true,
    mode: music.mode,
    customName: music.customName,
    customTracks: music.customTracks,
  });
}

/** 后台：把一首歌加进自定义播放列表 */
export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Partial<MusicTrack>;
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!/^\d+$/.test(id) || !name) {
    return Response.json({ ok: false, error: "歌曲信息不完整" }, { status: 400 });
  }

  const music = await addCustomTrack({
    id,
    name,
    artist: String(body.artist ?? "未知歌手"),
    album: String(body.album ?? ""),
    cover: String(body.cover ?? ""),
    duration: Number(body.duration) || 0,
  });
  return Response.json({ ok: true, customTracks: music.customTracks, mode: music.mode });
}

/** 后台：移除一首（?id=）或清空全部（?all=1） */
export async function DELETE(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  if (params.get("all")) {
    const music = await clearCustomTracks();
    return Response.json({ ok: true, customTracks: music.customTracks });
  }

  const id = (params.get("id") ?? "").trim();
  if (!id) return Response.json({ ok: false, error: "缺少 id" }, { status: 400 });

  const music = await removeCustomTrack(id);
  return Response.json({ ok: true, customTracks: music.customTracks });
}
