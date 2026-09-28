import { guardApi } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";

/** 服务端渲染 Markdown 预览，保证与文章页最终渲染完全一致 */
export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const { html, toc } = await renderMarkdown(String(body.content ?? ""));
  return Response.json({ ok: true, html, toc });
}
