import { guardApi } from "@/lib/auth";
import { searchSongs } from "@/lib/netease";

/** 后台：搜索网易云歌曲 */
export async function GET(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  if (!q) return Response.json({ ok: false, error: "请输入关键词" }, { status: 400 });

  try {
    const songs = await searchSongs(q, Number(params.get("limit")) || 20);
    return Response.json({ ok: true, songs });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "搜索失败" },
      { status: 502 },
    );
  }
}
