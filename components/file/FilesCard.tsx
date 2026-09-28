import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { FileCategory, FileItem } from "@/lib/types";
import { categoryIcon } from "./categoryIcons";

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 首页侧栏：某个文件分类的最近文件，点击直接跳 OpenList 下载页。
 * 每个启用的分类渲染一张卡片。
 */
export function FilesCard({
  category,
  items,
  limit = 5,
}: {
  category: FileCategory;
  items: FileItem[];
  limit?: number;
}) {
  if (items.length === 0) return null;
  const Icon = categoryIcon(category.icon);

  return (
    <div className="glass glass-sheen animate-fade-up rounded-3xl p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase opacity-70">
        <Icon className="h-4 w-4" />
        {category.label}
      </h3>

      <ul className="mt-4 space-y-2.5">
        {items.slice(0, limit).map((file) => (
          <li key={file.name}>
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer noopener"
              title={`在 OpenList 打开：${file.name}`}
              className="group flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300">
                  {file.title}
                </span>
                <span className="text-muted block text-[0.7rem]">
                  {file.ext ? file.ext.toUpperCase() : "文件"} · {formatSize(file.size)}
                </span>
              </span>
              <ExternalLink className="text-muted h-3.5 w-3.5 shrink-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </a>
          </li>
        ))}
      </ul>

      <Link
        href={`/files?tab=${encodeURIComponent(category.key)}`}
        className="text-brand-600 dark:text-brand-300 mt-4 inline-flex items-center gap-1 text-xs font-medium transition-all hover:gap-2"
      >
        查看全部 {items.length} 个 <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
