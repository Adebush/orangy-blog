import { changePassword, guardApi } from "@/lib/auth";

export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    current?: string;
    next?: string;
  };
  const result = await changePassword(String(body.current ?? ""), String(body.next ?? ""));
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
