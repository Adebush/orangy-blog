import { guardApi } from "@/lib/auth";
import { deletePost, getPost, updatePost } from "@/lib/posts";
import type { PostInput } from "@/lib/posts";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await guardApi();
  if (denied) return denied;
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug), { includeDrafts: true });
  if (!post) return Response.json({ ok: false, error: "文章不存在" }, { status: 404 });
  return Response.json({ ok: true, post });
}

export async function PUT(req: Request, { params }: Ctx) {
  const denied = await guardApi();
  if (denied) return denied;
  const { slug } = await params;
  const input = (await req.json().catch(() => null)) as PostInput | null;
  if (!input) return Response.json({ ok: false, error: "参数错误" }, { status: 400 });
  try {
    const post = await updatePost(decodeURIComponent(slug), input);
    return Response.json({ ok: true, post });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await guardApi();
  if (denied) return denied;
  const { slug } = await params;
  try {
    await deletePost(decodeURIComponent(slug));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
