import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "写新文章" };

export default function NewPostPage() {
  return <PostEditor />;
}
