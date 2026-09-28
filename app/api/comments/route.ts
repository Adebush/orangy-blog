import { addComment, getSettings, listApproved, publicComment } from "@/lib/comments";

/** 公开：读取某个目标下已通过审核的评论（支持 ?limit= & ?offset= 分页） */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const target = params.get("target") ?? "";
  if (!target) {
    return Response.json({ ok: false, error: "缺少 target 参数" }, { status: 400 });
  }

  const settings = await getSettings();
  const limitParam = Number(params.get("limit"));
  const offsetParam = Number(params.get("offset"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : settings.perPage;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  const { items, total } = await listApproved(target, { limit, offset });

  return Response.json({
    ok: true,
    enabled: settings.enabled,
    total,
    hasMore: offset + items.length < total,
    comments: items.map(publicComment),
  });
}

/** 公开：提交评论 / 主页留言 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = (forwarded.split(",")[0] || req.headers.get("x-real-ip") || "").trim();

  const result = await addComment({
    target: String(body.target ?? ""),
    targetType: String(body.targetType ?? ""),
    targetTitle: String(body.targetTitle ?? ""),
    targetUrl: String(body.targetUrl ?? ""),
    author: String(body.author ?? ""),
    email: String(body.email ?? ""),
    website: String(body.website ?? ""),
    content: String(body.content ?? ""),
    honeypot: String(body.honeypot ?? ""),
    ip,
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }
  return Response.json({
    ok: true,
    pending: result.pending,
    comment: result.comment ? publicComment(result.comment) : undefined,
  });
}
