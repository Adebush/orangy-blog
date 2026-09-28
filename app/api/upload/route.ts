import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { guardApi } from "@/lib/auth";
import { ensureDirs, paths } from "@/lib/markdown";

const MAX_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/avif", ".avif"],
  ["image/bmp", ".bmp"],
  ["image/x-icon", ".ico"],
]);

export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "没有收到文件" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "文件超过 12MB 限制" }, { status: 413 });
  }

  let ext = ALLOWED.get(file.type);
  if (!ext) {
    const fromName = path.extname(file.name).toLowerCase();
    if (![...ALLOWED.values()].includes(fromName)) {
      return Response.json(
        { ok: false, error: `不支持的文件类型：${file.type || fromName || "未知"}` },
        { status: 415 },
      );
    }
    ext = fromName;
  }

  await ensureDirs();
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}${ext}`;
  await fs.writeFile(path.join(paths.uploads, name), Buffer.from(await file.arrayBuffer()));

  return Response.json({
    ok: true,
    url: `/uploads/${name}`,
    name: file.name,
    size: file.size,
  });
}
