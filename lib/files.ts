import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "./markdown";
import type { FileCategory, FileItem, FilesConfig } from "./types";

/**
 * 「文件」页的数据层。
 *
 * 谱面 / mod 这些压缩包动辄几十 MB，放本站会占满磁盘，
 * 所以文件本体全部托管在 OpenList 上，本站只同步文件名清单并缓存。
 * 前台点击文件名 → 新标签页打开 OpenList 对应文件的下载页。
 *
 * 注意：OpenList 多为 http 而本站是 https。普通 <a> 跳转不受混合内容限制
 * （只有图片/脚本/iframe 这类子资源才会被浏览器拦截），所以直接外链即可。
 */

export const defaultCategories: FileCategory[] = [
  {
    key: "charts",
    label: "谱面",
    path: "",
    icon: "gamepad-2",
    desc: "自制谱面（在后台把目录指向你的 OpenList 路径）",
    enabled: false,
  },
  {
    key: "mods",
    label: "实用mod",
    path: "",
    icon: "package",
    desc: "常用 mod 与工具",
    enabled: false,
  },
];

export const defaultFiles: FilesConfig = {
  // 全新部署时先关掉，去后台填好自己的 OpenList 地址与目录后再启用
  enabled: false,
  baseUrl: "",
  categories: defaultCategories,
  items: {},
  updatedAt: "",
  lastAttempt: "",
  lastError: "",
};

/** 缓存为空且上次失败时，5 分钟内不重复打 OpenList */
const RETRY_COOLDOWN_MS = 5 * 60_000;

export async function getFilesConfig(): Promise<FilesConfig> {
  try {
    const raw = await fs.readFile(paths.files, "utf8");
    const parsed = JSON.parse(raw) as Partial<FilesConfig>;
    return {
      ...defaultFiles,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : defaultCategories,
      items: parsed.items ?? {},
    };
  } catch {
    return defaultFiles;
  }
}

export async function saveFilesConfig(patch: Partial<FilesConfig>): Promise<FilesConfig> {
  const current = await getFilesConfig();
  const next: FilesConfig = { ...current, ...patch };
  await fs.mkdir(path.dirname(paths.files), { recursive: true });
  await fs.writeFile(paths.files, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

/** 目录路径 + 文件名 → OpenList 网页下载地址（逐段 URL 编码） */
export function filePageUrl(baseUrl: string, dirPath: string, filename: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const segments = [...dirPath.split("/").filter(Boolean), filename];
  return `${base}/${segments.map(encodeURIComponent).join("/")}`;
}

/** OpenList 目录页地址 */
export function dirPageUrl(baseUrl: string, dirPath: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const segments = dirPath.split("/").filter(Boolean);
  return `${base}/${segments.map(encodeURIComponent).join("/")}`;
}

export function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface OpenListEntry {
  name: string;
  size: number;
  is_dir: boolean;
}

interface OpenListResponse {
  code?: number;
  message?: string;
  data?: { content?: OpenListEntry[] };
}

/** 从 OpenList 拉取某个目录的清单 */
export async function fetchCategoryItems(baseUrl: string, dirPath: string): Promise<FileItem[]> {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    throw new Error("OpenList 地址必须以 http:// 或 https:// 开头");
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/fs/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: dirPath,
        password: "",
        page: 1,
        per_page: 0,
        refresh: false,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new Error("无法连接 OpenList，请检查地址与服务器网络");
  }
  if (!res.ok) throw new Error(`OpenList 返回 HTTP ${res.status}`);

  const data = (await res.json()) as OpenListResponse;
  if (data.code !== 200) {
    throw new Error(data.message || "目录不存在或需要密码");
  }

  return (data.data?.content ?? [])
    .filter((entry) => !entry.is_dir)
    .map((entry) => {
      const dot = entry.name.lastIndexOf(".");
      return {
        name: entry.name,
        title: dot > 0 ? entry.name.slice(0, dot) : entry.name,
        ext: dot > 0 ? entry.name.slice(dot + 1).toLowerCase() : "",
        size: entry.size ?? 0,
        url: filePageUrl(base, dirPath, entry.name),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
}

/**
 * 同步所有启用的分类。
 * 某个分类失败时保留它上一次的缓存，只把错误记下来。
 */
export async function refreshFiles(patch?: Partial<FilesConfig>): Promise<FilesConfig> {
  const current = patch ? await saveFilesConfig(patch) : await getFilesConfig();
  const attemptedAt = new Date().toISOString();
  const enabled = current.categories.filter((c) => c.enabled);

  const results = await Promise.all(
    enabled.map(async (category) => {
      try {
        return { key: category.key, items: await fetchCategoryItems(current.baseUrl, category.path), error: "" };
      } catch (error) {
        return {
          key: category.key,
          items: null,
          error: `「${category.label}」${error instanceof Error ? error.message : "拉取失败"}`,
        };
      }
    }),
  );

  // 只保留仍启用的分类，顺带丢掉被删掉的分类残留
  const items: Record<string, FileItem[]> = {};
  const errors: string[] = [];
  let anySuccess = false;

  for (const result of results) {
    if (result.items) {
      items[result.key] = result.items;
      anySuccess = true;
    } else {
      items[result.key] = current.items[result.key] ?? [];
      errors.push(result.error);
    }
  }

  return saveFilesConfig({
    items,
    updatedAt: anySuccess ? attemptedAt : current.updatedAt,
    lastAttempt: attemptedAt,
    lastError: errors.join("；"),
  });
}

let inflight: Promise<FilesConfig> | null = null;

/**
 * 前台读取：优先用缓存。
 * 只有所有分类的缓存都为空时才自动拉一次，避免每次请求都打 OpenList；
 * 失败后 5 分钟内不再重试。
 */
export async function getFiles(): Promise<FilesConfig> {
  const config = await getFilesConfig();
  if (!config.enabled) return config;

  const enabled = config.categories.filter((c) => c.enabled);
  const hasAny = enabled.some((c) => (config.items[c.key] ?? []).length > 0);
  if (hasAny) return config;

  const lastAttempt = config.lastAttempt ? new Date(config.lastAttempt).getTime() : 0;
  const cooling = config.lastError && Date.now() - lastAttempt < RETRY_COOLDOWN_MS;
  if (cooling) return config;

  if (!inflight) {
    inflight = refreshFiles().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
