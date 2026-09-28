import { createSessionToken, setSessionCookie, verifyCredentials } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const result = await verifyCredentials(String(body.username ?? ""), String(body.password ?? ""));
  if (!result.ok) {
    return Response.json({ ok: false, error: result.reason ?? "登录失败" }, { status: 401 });
  }
  const token = await createSessionToken();
  if (!token) {
    return Response.json(
      { ok: false, error: "后台尚未初始化，请先运行 scripts/set-password.mjs" },
      { status: 500 },
    );
  }
  // Nginx 会带上 X-Forwarded-Proto；据此决定 Cookie 是否需要 Secure
  const forwarded = req.headers.get("x-forwarded-proto");
  const isHttps = forwarded
    ? forwarded.split(",")[0].trim() === "https"
    : new URL(req.url).protocol === "https:";
  await setSessionCookie(token, isHttps);
  return Response.json({ ok: true });
}
