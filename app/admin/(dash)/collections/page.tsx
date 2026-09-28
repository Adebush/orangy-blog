import type { Metadata } from "next";
import { CollectionsManager } from "@/components/admin/CollectionsManager";

export const metadata: Metadata = { title: "内容管理" };

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">内容管理</h1>
        <p className="text-muted mt-1 text-sm">
          管理说说、友链、项目、相册与时间线，支持直接上传图片
        </p>
      </div>
      <CollectionsManager initialType={type ?? "moments"} />
    </div>
  );
}
