import { guardApi } from "@/lib/auth";
import { createPost, listPosts } from "@/lib/posts";
import type { PostInput } from "@/lib/posts";

export async function GET() {
  const denied = await guardApi();
  if (denied) return denied;
  const posts = await listPosts({ includeDrafts: true });
  return Response.json({ ok: true, posts });
}

export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;
  const input = (await req.json().catch(() => null)) as PostInput | null;
  if (!input?.title && !input?.content) {
    return Response.json({ ok: false, error: "标题和正文不能同时为空" }, { status: 400 });
  }
  try {
    const post = await createPost(input);
    return Response.json({ ok: true, post });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 },
    );
  }
}
