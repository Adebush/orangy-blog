import { guardApi } from "@/lib/auth";
import { pollQrLogin, startQrLogin } from "@/lib/netease";

/**
 * 扫码登录网易云。
 * 二维码在服务端生成 —— 登录码等同于凭据，绝不能交给第三方二维码图床。
 */

/** 第一步：取二维码 */
export async function POST() {
  const denied = await guardApi();
  if (denied) return denied;

  try {
    const { key, qr } = await startQrLogin();
    return Response.json({ ok: true, key, qr });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "获取二维码失败" },
      { status: 502 },
    );
  }
}

/** 第二步：轮询扫码状态 */
export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = (body.key ?? "").trim();
  if (!key) return Response.json({ ok: false, error: "缺少 key" }, { status: 400 });

  try {
    const result = await pollQrLogin(key);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      { ok: false, status: "error", error: error instanceof Error ? error.message : "轮询失败" },
      { status: 502 },
    );
  }
}
