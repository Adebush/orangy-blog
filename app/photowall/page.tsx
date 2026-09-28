import type { Metadata } from "next";
import { SectionHeader } from "@/components/site/Cards";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { getPhotos } from "@/lib/site";
import { PhotoWallClient } from "./PhotoWallClient";

export const metadata: Metadata = {
  title: "相册",
  description: "用照片记录下来的生活切片。",
};

export default async function PhotoWallPage() {
  const photos = await getPhotos();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="相册"
        subtitle={photos.length > 0 ? `一共 ${photos.length} 张生活切片` : "生活切片"}
      />
      <PhotoWallClient photos={photos} />

      <CommentsSection
        target="photowall"
        targetType="photo"
        targetTitle="相册"
        targetUrl="/photowall"
      />
    </div>
  );
}
