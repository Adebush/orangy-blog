import type { Metadata } from "next";
import { Info } from "lucide-react";
import { FilesExplorer } from "@/components/file/FilesExplorer";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { SectionHeader } from "@/components/site/Cards";
import { getFiles } from "@/lib/files";

export const metadata: Metadata = {
  title: "文件",
  description: "冰与火之舞自制谱面与实用 mod 下载。",
};

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [params, config] = await Promise.all([searchParams, getFiles()]);

  return (
    <div className="space-y-6">
      <SectionHeader title="文件" subtitle="自制谱面与实用 mod，按分类整理" />

      <div className="glass glass-sheen animate-fade-up flex items-start gap-2.5 rounded-2xl px-5 py-4">
        <Info className="text-brand-500 mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-soft text-sm leading-relaxed">
          这些压缩包体积较大，托管在独立的 <span className="font-medium">OpenList</span> 文件服务上，
          没有放在本站。点击文件名会<b>在新标签页打开对应的下载页</b>；上方可切换分类。
        </p>
      </div>

      <FilesExplorer
        categories={config.categories}
        items={config.items}
        initialTab={params.tab}
        lastError={config.lastError}
      />

      <CommentsSection
        target="files"
        targetType="file"
        targetTitle="文件"
        targetUrl="/files"
      />
    </div>
  );
}
