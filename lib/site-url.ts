import { headers } from "next/headers";

/**
 * 站点的对外地址（用于 RSS / sitemap 里的绝对链接）。
 *
 * 优先级：
 *   1. 环境变量 ORANGY_SITE_URL（部署时显式指定，最稳）
 *   2. 从请求头推导（Nginx 反代会带上 X-Forwarded-Proto / X-Forwarded-Host）
 *   3. 本地开发兜底
 *
 * 这样代码里不需要硬编码任何域名，别人部署到自己的域名也能直接用。
 */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.ORANGY_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
      return `${proto}://${host}`;
    }
  } catch {
    // 不在请求上下文里（例如构建期），走下面的兜底
  }

  return "http://localhost:3100";
}
