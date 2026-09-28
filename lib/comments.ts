import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { paths } from "./paths";
import type { Comment, CommentSettings, CommentsStore } from "./types";

/**
 * 评论与主页留言。
 *
 * 存储：content/comments.json —— 和项目其它数据一样是纯 JSON，
 * 整个 content/ 目录仍是完整备份，不需要数据库。
 *
 * 并发：应用是单进程（next start），这里用一条 Promise 串行化写入，
 * 避免两个评论同时提交时互相覆盖。
 */

export const defaultCommentSettings: CommentSettings = {
  enabled: true,
  // 默认需要审核：公开站点如果不审核，很容易被垃圾评论淹没
  requireApproval: true,
  perPage: 20,
};

/** 评论 / 留言的长度限制 */
export const MAX_AUTHOR = 40;
export const MAX_CONTENT = 1000;
export const MAX_WEBSITE = 200;
export const MAX_EMAIL = 120;

/** 限流：同一 IP 在窗口内最多发几条 */
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 10;

const emptyStore: CommentsStore = { settings: defaultCommentSettings, items: [] };

export async function readStore(): Promise<CommentsStore> {
  try {
    const raw = await fs.readFile(paths.comments, "utf8");
    const parsed = JSON.parse(raw) as Partial<CommentsStore>;
    return {
      settings: { ...defaultCommentSettings, ...(parsed.settings ?? {}) },
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { ...emptyStore, items: [] };
  }
}

// ---- 串行化写入，避免并发覆盖 ----
let writeChain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => undefined);
  return next;
}

async function writeStore(store: CommentsStore): Promise<void> {
  await fs.mkdir(path.dirname(paths.comments), { recursive: true });
  const tmp = `${paths.comments}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await fs.rename(tmp, paths.comments);
}

export async function getSettings(): Promise<CommentSettings> {
  return (await readStore()).settings;
}

export async function saveSettings(patch: Partial<CommentSettings>): Promise<CommentSettings> {
  return serialize(async () => {
    const store = await readStore();
    store.settings = { ...store.settings, ...patch };
    await writeStore(store);
    return store.settings;
  });
}

// ---- 简易限流（单进程内存即可） ----
const recent = new Map<string, number[]>();

/** 返回 0 表示未被限流；否则返回还需等待的秒数 */
function rateLimited(ip: string): number {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    recent.set(ip, list);
    const oldest = Math.min(...list);
    return Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
  }
  list.push(now);
  recent.set(ip, list);
  // 顺手清理过期键，避免内存无限增长
  if (recent.size > 5000) {
    for (const [key, times] of recent) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) recent.delete(key);
    }
  }
  return 0;
}

export interface NewCommentInput {
  target: string;
  targetType: string;
  targetTitle: string;
  targetUrl: string;
  author: string;
  email?: string;
  website?: string;
  content: string;
  ip?: string;
  /** 蜜罐字段：正常用户看不到，填了就当作机器人 */
  honeypot?: string;
}

export interface AddCommentResult {
  ok: boolean;
  error?: string;
  comment?: Comment;
  /** 是否进入了待审核状态 */
  pending?: boolean;
}

/** 截断并去空白；容忍 undefined / null，避免调用方漏传字段就 500 */
const clip = (value: string | undefined | null, max: number): string =>
  (value ?? "").trim().slice(0, max);

export async function addComment(input: NewCommentInput): Promise<AddCommentResult> {
  // 蜜罐命中：假装成功，但不写入
  if (input.honeypot && input.honeypot.trim()) {
    return { ok: true, pending: true };
  }

  const store = await readStore();
  if (!store.settings.enabled) {
    return { ok: false, error: "评论功能已关闭" };
  }

  const author = clip(input.author ?? "", MAX_AUTHOR);
  const content = clip(input.content ?? "", MAX_CONTENT);
  if (!author) return { ok: false, error: "请填写昵称" };
  if (!content) return { ok: false, error: "评论内容不能为空" };
  if (content.length < 2) return { ok: false, error: "评论内容太短了" };

  const ip = input.ip ?? "";
  if (ip) {
    const wait = rateLimited(ip);
    if (wait > 0) {
      const mins = Math.floor(wait / 60);
      const secs = wait % 60;
      const human = mins > 0 ? `${mins} 分 ${secs} 秒` : `${secs} 秒`;
      return { ok: false, error: `提交太频繁了，请等 ${human} 后再试` };
    }
  }

  const comment: Comment = {
    id: randomBytes(6).toString("hex"),
    target: clip(input.target, 200) || "home",
    targetType: clip(input.targetType, 40) || "page",
    targetTitle: clip(input.targetTitle, 120),
    targetUrl: clip(input.targetUrl, 300),
    author,
    email: clip(input.email ?? "", MAX_EMAIL),
    website: clip(input.website ?? "", MAX_WEBSITE),
    content,
    createdAt: new Date().toISOString(),
    approved: !store.settings.requireApproval,
    featured: false,
    ip,
  };

  await serialize(async () => {
    const fresh = await readStore();
    fresh.settings = { ...defaultCommentSettings, ...fresh.settings };
    fresh.items.push(comment);
    await writeStore(fresh);
  });

  return { ok: true, comment, pending: !comment.approved };
}

/** 对外输出时去掉邮箱 / IP 等隐私字段 */
export function publicComment(comment: Comment) {
  return {
    id: comment.id,
    author: comment.author,
    website: comment.website,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

/** 某个目标下已通过审核的评论（新的在前），支持分页 */
export async function listApproved(
  target: string,
  options?: { limit?: number; offset?: number },
): Promise<{ items: Comment[]; total: number }> {
  const store = await readStore();
  const all = store.items
    .filter((c) => c.target === target && c.approved)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const offset = Math.max(0, options?.offset ?? 0);
  const limit = options?.limit ?? 0;
  const items = limit > 0 ? all.slice(offset, offset + limit) : all.slice(offset);
  return { items, total: all.length };
}

/** 后台：全部评论（新的在前） */
export async function listAll(): Promise<Comment[]> {
  const store = await readStore();
  return [...store.items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** 主页弹幕：被人工选中展示的留言 */
export async function listFeatured(limit = 40): Promise<Comment[]> {
  const store = await readStore();
  return store.items
    .filter((c) => c.targetType === "home" && c.featured)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-limit);
}

export async function moderate(
  id: string,
  patch: { approved?: boolean; featured?: boolean },
): Promise<Comment | null> {
  return serialize(async () => {
    const store = await readStore();
    const index = store.items.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const next = { ...store.items[index] };
    if (typeof patch.approved === "boolean") next.approved = patch.approved;
    if (typeof patch.featured === "boolean") next.featured = patch.featured;
    // 只有通过审核的留言才可能出现在弹幕里
    if (!next.approved) next.featured = false;
    store.items[index] = next;
    await writeStore(store);
    return next;
  });
}

export async function removeComment(id: string): Promise<boolean> {
  return serialize(async () => {
    const store = await readStore();
    const before = store.items.length;
    store.items = store.items.filter((c) => c.id !== id);
    if (store.items.length === before) return false;
    await writeStore(store);
    return true;
  });
}

/**
 * 页面加载评论的便捷封装：
 * 一次拿到「首屏评论 + 总数 + 是否需要审核 + 总开关」，
 * 首屏条数用后台配置的 perPage，剩下的由前端「加载更多」按需拉取。
 */
export async function loadComments(target: string) {
  const settings = await getSettings();
  const { items, total } = await listApproved(target, { limit: settings.perPage });
  return {
    comments: items.map(publicComment),
    total,
    perPage: settings.perPage,
    requireApproval: settings.requireApproval,
    enabled: settings.enabled,
  };
}
