export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/;

/** 统计字数：中日韩按字计，英文按词计 */
export function countWords(text: string): number {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-|]/g, " ");
  const cjk = (plain.match(new RegExp(CJK, "g")) || []).length;
  const latin = (plain.replace(new RegExp(CJK, "g"), " ").match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + latin;
}

/** 预估阅读时长（分钟） */
export function readingTime(text: string): number {
  const words = countWords(text);
  return Math.max(1, Math.round(words / 320));
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateCN(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 相对时间：3 天前 / 刚刚 */
export function relativeTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  const diff = Date.now() - d.getTime();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} 个月前`;
  return `${Math.floor(diff / (365 * day))} 年前`;
}

/** 从正文中取纯文本摘要 */
export function makeExcerpt(markdown: string, length = 130): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, " ")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/[#*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

/** 取正文中第一张图片作为封面 */
export function firstImage(markdown: string): string | undefined {
  const md = markdown.match(/!\[[^\]]*\]\(([^)\s]+)/);
  if (md?.[1]) return md[1];
  const html = markdown.match(/<img[^>]+src=["']([^"']+)["']/i);
  return html?.[1];
}

/**
 * 生成标题锚点 id。
 * 与渲染正文时使用同一个函数，保证目录跳转一定对得上。
 */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    let base = text
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
    if (!base) base = "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

/** 把标题转成 URL 安全的文件名 */
export function toSafeSlug(input: string): string {
  return input
    .trim()
    .replace(/\.md$/i, "")
    .replace(/[\\/:*?"<>|#%{}^[\]`]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.\-]+|[.\-]+$/g, "")
    .slice(0, 100);
}

/**
 * 判断一个值是否已经是「完整的图片地址」。
 *
 * 用途：后台的图片输入框会实时渲染预览，如果用户正在一个字一个字地输入
 * 相对路径（如 uploads/xxx.jpg），每敲一个键都会触发一次 <img> 请求，
 * 于是产生 /u、/up、/upl、/uplo… 一连串 404。
 * 这里要求必须是 http(s):// 或 / 开头、且带常见图片扩展名，才渲染预览。
 */
export function isCompleteImageUrl(value: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (!/^(https?:\/\/|\/)/i.test(v)) return false;
  if (/\s/.test(v)) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(\?.*)?$/i.test(v);
}
