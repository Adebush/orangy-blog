import { guardApi } from "@/lib/auth";
import { getAbout, saveAbout } from "@/lib/site";

export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  const { markdown } = await getAbout();
  return Response.json({ ok: true, markdown });
}

export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { markdown?: string };
  if (typeof body.markdown !== "string") {
    return Response.json({ ok: false, error: "参数错误" }, { status: 400 });
  }
  await saveAbout(body.markdown);
  return Response.json({ ok: true });
}
