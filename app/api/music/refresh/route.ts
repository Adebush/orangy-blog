import { guardApi } from "@/lib/auth";
import { refreshMusic, saveMusicConfig } from "@/lib/music";

/** 后台：拉取歌单 + 探测可播性 + 落盘 */
export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { playlistId?: string };
  const playlistId = (body.playlistId ?? "").trim();

  if (!playlistId) {
    return Response.json({ ok: false, error: "请先填写歌单 ID" }, { status: 400 });
  }
  if (!/^\d+$/.test(playlistId)) {
    return Response.json(
      { ok: false, error: "歌单 ID 必须是纯数字（在歌单分享链接的 id= 后面）" },
      { status: 400 },
    );
  }

  try {
    // 先把 ID 存下来，即使探测失败也不会丢配置
    await saveMusicConfig({ playlistId });
    const music = await refreshMusic(playlistId);

    if (music.tracks.length === 0) {
      return Response.json({
        ok: false,
        error: "歌单读取成功，但扫描范围内没有可播放的歌曲（可能都是 VIP 曲目）",
        music,
      });
    }
    return Response.json({ ok: true, music });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "拉取歌单失败" },
      { status: 500 },
    );
  }
}
