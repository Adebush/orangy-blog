import { guardApi } from "@/lib/auth";
import { moderate, removeComment } from "@/lib/comments";

type Ctx = { params: Promise<{ id: string }> };

/** 后台：审核（通过/取消）与「展示到主页弹幕」开关 */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await guardApi();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    approved?: boolean;
    featured?: boolean;
  };

  const comment = await moderate(id, {
    approved: typeof body.approved === "boolean" ? body.approved : undefined,
    featured: typeof body.featured === "boolean" ? body.featured : undefined,
  });
  if (!comment) return Response.json({ ok: false, error: "评论不存在" }, { status: 404 });
  return Response.json({ ok: true, comment });
}

/** 后台：删除评论 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await guardApi();
  if (denied) return denied;

  const { id } = await params;
  const removed = await removeComment(id);
  if (!removed) return Response.json({ ok: false, error: "评论不存在" }, { status: 404 });
  return Response.json({ ok: true });
}
