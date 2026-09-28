import type { Metadata } from "next";
import Link from "next/link";
import { PenSquare } from "lucide-react";
import { AdminPostList } from "@/components/admin/AdminPostList";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "文章管理" };

export default async function AdminPostsPage() {
  const posts = await listPosts({ includeDrafts: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">文章管理</h1>
          <p className="text-muted mt-1 text-sm">共 {posts.length} 篇文章，支持置顶、草稿切换与删除</p>
        </div>
        <Link
          href="/admin/editor"
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl"
        >
          <PenSquare className="h-4 w-4" />
          写新文章
        </Link>
      </div>
      <AdminPostList posts={posts} />
    </div>
  );
}
