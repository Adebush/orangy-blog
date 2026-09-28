#!/usr/bin/env node
/**
 * 命令行同步 OpenList 文件清单（不依赖后台登录，适合放 cron）。
 *
 *   node scripts/refresh-files.mjs
 *
 * 会遍历 content/files.json 里所有启用的分类，重新列出对应 OpenList 目录：
 * 新增的文件会出现，删掉的会消失。某个分类失败时保留它上一次的缓存。
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const contentDir = process.env.ORANGY_CONTENT_DIR ?? path.join(projectRoot, "content");
const filesFile = path.join(contentDir, "files.json");

// 全新部署时的占位分类：请在后台「站点设置 → 文件」里改成自己的 OpenList 目录
const DEFAULT_CATEGORIES = [
  { key: "charts", label: "谱面", path: "", icon: "gamepad-2", desc: "", enabled: false },
  { key: "mods", label: "实用mod", path: "", icon: "package", desc: "", enabled: false },
];

async function readConfig() {
  try {
    const cfg = JSON.parse(await fs.readFile(filesFile, "utf8"));
    return {
      enabled: cfg.enabled !== false,
      baseUrl: cfg.baseUrl ?? "",
      categories: cfg.categories?.length ? cfg.categories : DEFAULT_CATEGORIES,
      items: cfg.items ?? {},
      updatedAt: cfg.updatedAt ?? "",
      lastAttempt: cfg.lastAttempt ?? "",
      lastError: cfg.lastError ?? "",
    };
  } catch {
    return {
      enabled: true,
      baseUrl: "",
      categories: DEFAULT_CATEGORIES,
      items: {},
      updatedAt: "",
      lastAttempt: "",
      lastError: "",
    };
  }
}

function filePageUrl(baseUrl, dirPath, filename) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const segments = [...dirPath.split("/").filter(Boolean), filename];
  return `${base}/${segments.map(encodeURIComponent).join("/")}`;
}

async function fetchItems(baseUrl, dirPath) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    throw new Error("还没配置 OpenList 地址，请先在后台「站点设置 → 文件」里填写");
  }

  const res = await fetch(`${base}/api/fs/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: dirPath, password: "", page: 1, per_page: 0, refresh: false }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`OpenList 返回 HTTP ${res.status}`);

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || "目录不存在或需要密码");

  return (data.data?.content ?? [])
    .filter((e) => !e.is_dir)
    .map((e) => {
      const dot = e.name.lastIndexOf(".");
      return {
        name: e.name,
        title: dot > 0 ? e.name.slice(0, dot) : e.name,
        ext: dot > 0 ? e.name.slice(dot + 1).toLowerCase() : "",
        size: e.size ?? 0,
        url: filePageUrl(base, dirPath, e.name),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
}

async function main() {
  const config = await readConfig();
  const enabled = config.categories.filter((c) => c.enabled);
  if (enabled.length === 0) {
    console.log("· 没有启用的分类，跳过");
    return;
  }

  console.log(`▸ OpenList: ${config.baseUrl}`);
  const attemptedAt = new Date().toISOString();
  const items = {};
  const errors = [];
  let anySuccess = false;

  for (const category of enabled) {
    try {
      const list = await fetchItems(config.baseUrl, category.path);
      const before = (config.items[category.key] ?? []).map((i) => i.name);
      const after = list.map((i) => i.name);
      const added = after.filter((n) => !before.includes(n));
      const removed = before.filter((n) => !after.includes(n));

      items[category.key] = list;
      anySuccess = true;

      const total = list.reduce((s, f) => s + (f.size || 0), 0);
      console.log(
        `  ✓ ${category.label}（${category.path}）：${list.length} 个，${(total / 1024 / 1024).toFixed(1)} MB` +
          (added.length || removed.length ? `  +${added.length}/-${removed.length}` : ""),
      );
      added.forEach((n) => console.log(`      + ${n}`));
      removed.forEach((n) => console.log(`      - ${n}`));
    } catch (error) {
      items[category.key] = config.items[category.key] ?? [];
      errors.push(`「${category.label}」${error.message}`);
      console.log(`  ✗ ${category.label}（${category.path}）：${error.message}（保留上次缓存）`);
    }
  }

  const next = {
    ...config,
    items,
    updatedAt: anySuccess ? attemptedAt : config.updatedAt,
    lastAttempt: attemptedAt,
    lastError: errors.join("；"),
  };
  await fs.mkdir(contentDir, { recursive: true });
  await fs.writeFile(filesFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`✓ 已写入 ${filesFile}`);

  if (errors.length) process.exit(1);
}

main().catch(async (error) => {
  console.error(`✗ ${error.message}`);
  try {
    const config = await readConfig();
    await fs.writeFile(
      filesFile,
      `${JSON.stringify({ ...config, lastAttempt: new Date().toISOString(), lastError: error.message }, null, 2)}\n`,
      "utf8",
    );
  } catch {
    /* ignore */
  }
  process.exit(1);
});
