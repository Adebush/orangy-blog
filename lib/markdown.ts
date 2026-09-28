import { promises as fs } from "node:fs";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { paths } from "./paths";
import { createSlugger } from "./utils";
import type { TocItem } from "./types";

// 保持原有对外接口：其它模块仍可从 markdown 引入 paths
export { paths };

/** rehype 插件：给 h1~h4 注入 id，同时收集目录 */
function rehypeHeadingsAndToc(options: { toc: TocItem[] }) {
  const slug = createSlugger();
  type Node = {
    type?: string;
    tagName?: string;
    value?: string;
    properties?: Record<string, unknown>;
    children?: Node[];
  };
  const textOf = (node: Node): string => {
    if (node.type === "text") return node.value ?? "";
    if (!node.children) return "";
    return node.children.map(textOf).join("");
  };
  const walk = (node: Node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "element" && /^h[1-4]$/.test(node.tagName ?? "")) {
      const text = textOf(node).trim();
      const id = slug(text);
      node.properties = { ...(node.properties ?? {}), id };
      options.toc.push({ id, text, depth: Number((node.tagName ?? "h2")[1]) });
    }
    node.children?.forEach(walk);
  };
  return (tree: Node) => walk(tree);
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
}

/** 把 Markdown 渲染为 HTML（含代码高亮、KaTeX 公式、标题锚点） */
export async function renderMarkdown(markdown: string): Promise<RenderResult> {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHeadingsAndToc, { toc })
    .use(rehypeKatex)
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return { html: String(file), toc };
}


export async function ensureDirs(): Promise<void> {
  await fs.mkdir(paths.posts, { recursive: true });
  await fs.mkdir(paths.uploads, { recursive: true });
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readText(file: string, fallback = ""): Promise<string> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return fallback;
  }
}
