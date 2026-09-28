import { guardApi } from "@/lib/auth";
import { getSite, saveSite } from "@/lib/site";
import type { SiteConfig } from "@/lib/types";

export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  return Response.json({ ok: true, site: await getSite() });
}

export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const patch = (await req.json().catch(() => null)) as Partial<SiteConfig> | null;
  if (!patch) return Response.json({ ok: false, error: "参数错误" }, { status: 400 });
  const site = await saveSite(patch);
  return Response.json({ ok: true, site });
}
