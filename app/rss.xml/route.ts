import { listPosts } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";
import { getSite } from "@/lib/site";


// 内容随时可能被改动，RSS 每次都读最新的文章列表
export const dynamic = "force-dynamic";

/** XML 特殊字符转义 */
function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 转成 RFC 822 时间（pubDate 要求） */
function toRfc822(input: string): string {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export async function GET(): Promise<Response> {
  const SITE_URL = await getSiteUrl();
  const [site, posts] = await Promise.all([getSite(), listPosts()]);
  const latest = posts.slice(0, 20);
  const lastBuildDate = toRfc822(latest[0]?.date ?? new Date().toISOString());

  const items = latest
    .map((post) => {
      const url = `${SITE_URL}/posts/${encodeURIComponent(post.slug)}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${toRfc822(post.date)}</pubDate>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(site.title)}</title>`,
    `    <link>${escapeXml(SITE_URL)}</link>`,
    `    <description>${escapeXml(site.description)}</description>`,
    "    <language>zh-CN</language>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800",
    },
  });
}
