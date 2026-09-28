import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";


// 站点地址在请求期才能拿到（环境变量或请求头），因此不做静态预渲染
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const SITE_URL = await getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
