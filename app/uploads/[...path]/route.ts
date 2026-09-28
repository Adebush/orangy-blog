import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "@/lib/markdown";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

/**
 * 后台上传的图片走这里返回。
 * 不使用 public/ 目录，因为 `next start` 在启动时就把 public/ 的文件清单缓存住了，
 * 运行期新上传的文件不会被静态服务命中（会 404）。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const rel = (segments ?? []).join("/");

  // 防目录穿越
  if (!rel || rel.includes("..") || rel.includes("\0") || rel.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  const root = path.resolve(paths.uploads);
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
