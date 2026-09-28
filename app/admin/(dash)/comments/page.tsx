import type { Metadata } from "next";
import { CommentModeration } from "@/components/admin/CommentModeration";
import { getSettings, listAll } from "@/lib/comments";

export const metadata: Metadata = { title: "评论管理" };

export default async function AdminCommentsPage() {
  const [comments, settings] = await Promise.all([listAll(), getSettings()]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">评论管理</h1>
        <p className="text-muted mt-1 text-sm">
          审核各页面的评论；主页留言可以勾选「展示到主页」，以弹幕形式飘过
        </p>
      </div>
      <CommentModeration initialComments={comments} initialSettings={settings} />
    </div>
  );
}
