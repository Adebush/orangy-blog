import { guardApi } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/comments";

/** 后台：读取评论设置 */
export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  return Response.json({ ok: true, settings: await getSettings() });
}

/** 后台：保存评论设置 */
export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    requireApproval?: boolean;
    perPage?: number;
  };
  const patch: Record<string, boolean | number> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.requireApproval === "boolean") patch.requireApproval = body.requireApproval;
  if (typeof body.perPage === "number" && body.perPage > 0) patch.perPage = body.perPage;

  return Response.json({ ok: true, settings: await saveSettings(patch) });
}
