import { allKnownTrackIds, getMusicConfig, resolveSongUrl } from "@/lib/music";

/** 播放时实时解析音频地址（外链有时效，不能预先缓存） */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";

  const music = await getMusicConfig();
  if (!music.enabled) {
    return Response.json({ ok: false, error: "播放器未启用" }, { status: 403 });
  }
  // 只允许解析列表里存在的歌曲，避免被当成任意跳转代理
  if (!allKnownTrackIds(music).has(id)) {
    return Response.json({ ok: false, error: "歌曲不在当前歌单中" }, { status: 404 });
  }

  const url = await resolveSongUrl(id);
  if (!url) {
    // 「解析不出来」是预期内的业务结果（会员曲目未登录等），
    // 前端会据此换成官方外链播放器。用 200 返回，避免浏览器控制台刷出
    // 「Failed to load resource: 502」这种误导性的错误。
    return Response.json({
      ok: false,
      reason: "unavailable",
      error: "这首歌暂时无法播放（可能是 VIP 或已下架）",
    });
  }
  return Response.json({ ok: true, url });
}
