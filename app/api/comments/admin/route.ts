import { guardApi } from "@/lib/auth";
import { listAll } from "@/lib/comments";

/** 后台：读取全部评论（含待审核） */
export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  return Response.json({ ok: true, comments: await listAll() });
}
