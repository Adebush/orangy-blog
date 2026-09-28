import { guardApi } from "@/lib/auth";
import { getFilesConfig, refreshFiles } from "@/lib/files";
import type { FilesConfig } from "@/lib/types";

/**
 * 后台：重新从 OpenList 同步所有启用分类的文件清单。
 * OpenList 上新增 / 删除文件后，点一次这个接口就会同步过来。
 */
export async function POST(req: Request) {
  const denied = await guardApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    baseUrl?: string;
    categories?: FilesConfig["categories"];
  };

  const patch: Partial<FilesConfig> = {};
  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    patch.baseUrl = body.baseUrl.trim();
  }
  if (Array.isArray(body.categories)) {
    patch.categories = body.categories;
  }

  // 先记下更新前的清单，用来算「新增 / 移除」
  const before = (await getFilesConfig()).items;

  const files = await refreshFiles(Object.keys(patch).length ? patch : undefined);

  const changes: Record<string, { added: string[]; removed: string[] }> = {};
  for (const category of files.categories) {
    const prev = (before[category.key] ?? []).map((i) => i.name);
    const next = (files.items[category.key] ?? []).map((i) => i.name);
    changes[category.key] = {
      added: next.filter((n) => !prev.includes(n)),
      removed: prev.filter((n) => !next.includes(n)),
    };
  }

  if (files.lastError) {
    return Response.json({ ok: false, error: files.lastError, files, changes }, { status: 502 });
  }
  return Response.json({ ok: true, files, changes });
}
