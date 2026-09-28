import type { Metadata } from "next";
import { PostsExplorer } from "@/components/post/PostsExplorer";
import { SectionHeader } from "@/components/site/Cards";
import { getTags, listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "文章",
  description: "全部文章，支持关键词搜索与标签筛选。",
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const [params, posts, tags] = await Promise.all([searchParams, listPosts(), getTags()]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="全部文章"
        subtitle="记录技术、生活与那些一闪而过的念头"
      />
      <PostsExplorer
        posts={posts}
        tags={tags}
        initialQuery={params.q ?? ""}
        initialTag={params.tag ?? ""}
      />
    </div>
  );
}
