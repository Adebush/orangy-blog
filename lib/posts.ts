import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ensureDirs, paths, renderMarkdown } from "./markdown";
import {
  countWords,
  firstImage,
  formatDate,
  makeExcerpt,
  readingTime,
  toSafeSlug,
} from "./utils";
import type { Post, PostMeta } from "./types";

interface Frontmatter {
  title?: string;
  date?: string | Date;
  updated?: string | Date;
  tags?: string[] | string;
  category?: string;
  cover?: string;
  excerpt?: string;
  draft?: boolean;
  pinned?: boolean;
}

function normalizeTags(input: Frontmatter["tags"]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean);
  return String(input)
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function toIso(value: string | Date | undefined, fallback: string): string {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

/** 把文章写回磁盘（frontmatter 手动序列化，JSON 字符串在 YAML 中同样合法） */
function stringifyPost(meta: Record<string, unknown>, content: string): string {
  const q = (v: unknown) => JSON.stringify(String(v ?? ""));
  const lines = [
    "---",
    `title: ${q(meta.title)}`,
    `date: ${q(meta.date)}`,
  ];
  if (meta.updated) lines.push(`updated: ${q(meta.updated)}`);
  lines.push(
    `tags: [${(meta.tags as string[]).map(q).join(", ")}]`,
    `category: ${q(meta.category)}`,
  );
  if (meta.cover) lines.push(`cover: ${q(meta.cover)}`);
  lines.push(
    `excerpt: ${q(meta.excerpt)}`,
    `draft: ${meta.draft ? "true" : "false"}`,
    `pinned: ${meta.pinned ? "true" : "false"}`,
    "---",
    "",
    content.trim(),
    "",
  );
  return lines.join("\n");
}

function parseFile(slug: string, raw: string): { meta: PostMeta; content: string } {
  const { data, content } = matter(raw);
  const fm = data as Frontmatter;
  const stat = { mtime: new Date().toISOString() };
  const date = toIso(fm.date, stat.mtime);
  const words = countWords(content);
  return {
    meta: {
      slug,
      title: fm.title?.trim() || slug,
      date,
      updated: fm.updated ? toIso(fm.updated, date) : undefined,
      tags: normalizeTags(fm.tags),
      category: fm.category?.trim() || "未分类",
      cover: fm.cover?.trim() || firstImage(content),
      excerpt: fm.excerpt?.trim() || makeExcerpt(content),
      draft: Boolean(fm.draft),
      pinned: Boolean(fm.pinned),
      words,
      readingTime: readingTime(content),
    },
    content,
  };
}

async function readPostFiles(): Promise<string[]> {
  await ensureDirs();
  const entries = await fs.readdir(paths.posts, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
    .map((e) => e.name);
}

/** 文章列表（默认不含草稿），置顶优先，其次按时间倒序 */
export async function listPosts(options: { includeDrafts?: boolean } = {}): Promise<PostMeta[]> {
  const files = await readPostFiles();
  const posts = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.md$/i, "");
      const raw = await fs.readFile(path.join(paths.posts, file), "utf8");
      return parseFile(slug, raw).meta;
    }),
  );
  return posts
    .filter((p) => options.includeDrafts || !p.draft)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export async function getPost(
  slug: string,
  options: { includeDrafts?: boolean } = {},
): Promise<Post | null> {
  const safe = toSafeSlug(slug);
  if (!safe) return null;
  let raw: string;
  try {
    raw = await fs.readFile(path.join(paths.posts, `${safe}.md`), "utf8");
  } catch {
    return null;
  }
  const { meta, content } = parseFile(safe, raw);
  if (meta.draft && !options.includeDrafts) return null;
  const { html, toc } = await renderMarkdown(content);
  return { ...meta, content, html, toc };
}

export async function postExists(slug: string): Promise<boolean> {
  const safe = toSafeSlug(slug);
  if (!safe) return false;
  try {
    await fs.access(path.join(paths.posts, `${safe}.md`));
    return true;
  } catch {
    return false;
  }
}

export interface PostInput {
  slug?: string;
  title: string;
  date?: string;
  tags?: string[];
  category?: string;
  cover?: string;
  excerpt?: string;
  draft?: boolean;
  pinned?: boolean;
  content: string;
}

export async function createPost(input: PostInput): Promise<PostMeta> {
  await ensureDirs();
  const base = toSafeSlug(input.slug || input.title) || `post-${Date.now()}`;
  let slug = base;
  let i = 1;
  while (await postExists(slug)) slug = `${base}-${++i}`;

  const date = toIso(input.date, new Date().toISOString());
  const meta = {
    title: input.title.trim() || slug,
    date,
    tags: input.tags ?? [],
    category: input.category?.trim() || "未分类",
    cover: input.cover?.trim() || "",
    excerpt: input.excerpt?.trim() || makeExcerpt(input.content),
    draft: Boolean(input.draft),
    pinned: Boolean(input.pinned),
  };
  await fs.writeFile(
    path.join(paths.posts, `${slug}.md`),
    stringifyPost(meta, input.content),
    "utf8",
  );
  return parseFile(slug, stringifyPost(meta, input.content)).meta;
}

export async function updatePost(slug: string, input: PostInput): Promise<PostMeta> {
  const safe = toSafeSlug(slug);
  if (!(await postExists(safe))) throw new Error(`文章不存在: ${safe}`);
  const date = toIso(input.date, new Date().toISOString());
  const meta = {
    title: input.title.trim() || safe,
    date,
    updated: new Date().toISOString(),
    tags: input.tags ?? [],
    category: input.category?.trim() || "未分类",
    cover: input.cover?.trim() || "",
    excerpt: input.excerpt?.trim() || makeExcerpt(input.content),
    draft: Boolean(input.draft),
    pinned: Boolean(input.pinned),
  };
  const raw = stringifyPost(meta, input.content);
  await fs.writeFile(path.join(paths.posts, `${safe}.md`), raw, "utf8");
  return parseFile(safe, raw).meta;
}

export async function deletePost(slug: string): Promise<void> {
  const safe = toSafeSlug(slug);
  if (!safe) throw new Error("非法 slug");
  await fs.unlink(path.join(paths.posts, `${safe}.md`));
}

/** 相邻文章，用于上一篇 / 下一篇 */
export async function getAdjacentPosts(slug: string): Promise<{
  prev: PostMeta | null;
  next: PostMeta | null;
}> {
  const posts = await listPosts();
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: posts[idx + 1] ?? null,
    next: posts[idx - 1] ?? null,
  };
}

export interface TagStat {
  tag: string;
  count: number;
}

export async function getTags(): Promise<TagStat[]> {
  const posts = await listPosts();
  const map = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function getCategories(): Promise<TagStat[]> {
  const posts = await listPosts();
  const map = new Map<string, number>();
  for (const p of posts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/** 归档：按年份分组 */
export async function getArchive(): Promise<{ year: string; posts: PostMeta[] }[]> {
  const posts = await listPosts();
  const map = new Map<string, PostMeta[]>();
  for (const p of posts) {
    const year = formatDate(p.date).slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(p);
  }
  return [...map.entries()]
    .map(([year, list]) => ({ year, posts: list }))
    .sort((a, b) => Number(b.year) - Number(a.year));
}

export function searchPosts(posts: PostMeta[], query: string): PostMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((p) =>
    [p.title, p.excerpt, p.category, p.tags.join(" ")].join(" ").toLowerCase().includes(q),
  );
}
