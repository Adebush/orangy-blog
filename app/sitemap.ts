import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/posts";


const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/posts", priority: 0.9, changeFrequency: "daily" },
  { path: "/moments", priority: 0.7, changeFrequency: "weekly" },
  { path: "/timeline", priority: 0.6, changeFrequency: "weekly" },
  { path: "/projects", priority: 0.6, changeFrequency: "monthly" },
  { path: "/photowall", priority: 0.6, changeFrequency: "weekly" },
  { path: "/friends", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
];

// 站点地址在请求期才能拿到（环境变量或请求头），因此不做静态预渲染
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = await getSiteUrl();
  const posts = await listPosts();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: route.path === "/" ? SITE_URL : `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${encodeURIComponent(post.slug)}`,
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...postEntries];
}
