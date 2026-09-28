import { guardApi } from "@/lib/auth";
import { getFilesConfig, saveFilesConfig } from "@/lib/files";
import type { FileCategory, FilesConfig } from "@/lib/types";

/** 公开：给前台「文件」页读取各分类清单 */
export async function GET() {
  const config = await getFilesConfig();
  return Response.json({
    ok: true,
    files: {
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      categories: config.categories,
      items: config.items,
      updatedAt: config.updatedAt,
      lastError: config.lastError,
    },
  });
}

/** 后台：保存开关、OpenList 地址与分类配置 */
export async function PUT(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Partial<FilesConfig>;
  const patch: Partial<FilesConfig> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    patch.baseUrl = body.baseUrl.trim();
  }
  if (Array.isArray(body.categories)) {
    patch.categories = body.categories
      .filter((c): c is FileCategory => Boolean(c) && typeof c.key === "string")
      .map((c) => ({
        key: String(c.key).trim() || `cat-${Date.now()}`,
        label: String(c.label ?? "").trim() || "未命名",
        path: String(c.path ?? "").trim().startsWith("/")
          ? String(c.path).trim()
          : `/${String(c.path ?? "").trim()}`,
        icon: String(c.icon ?? "folder-open"),
        desc: String(c.desc ?? ""),
        enabled: c.enabled !== false,
      }));
  }

  const files = await saveFilesConfig(patch);
  return Response.json({ ok: true, files });
}
