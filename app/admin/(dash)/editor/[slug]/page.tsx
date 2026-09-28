import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { getPost } from "@/lib/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug), { includeDrafts: true });
  return { title: post ? `编辑：${post.title}` : "编辑文章" };
}

export default async function EditPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug), { includeDrafts: true });
  if (!post) notFound();

  return (
    <PostEditor
      initial={{
        slug: post.slug,
        title: post.title,
        date: post.date,
        category: post.category,
        tags: post.tags,
        cover: post.cover ?? "",
        excerpt: post.excerpt,
        draft: post.draft,
        pinned: post.pinned,
        content: post.content,
      }}
    />
  );
}
