import { Comments } from "./Comments";
import { loadComments } from "@/lib/comments";

/**
 * 服务端包装：自己去加载评论，页面里只要放一行即可。
 * 评论总开关关闭时直接不渲染。
 */
export async function CommentsSection({
  target,
  targetType,
  targetTitle,
  targetUrl,
  title,
  placeholder,
  emptyText,
}: {
  target: string;
  targetType: string;
  targetTitle: string;
  targetUrl: string;
  title?: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const { comments, total, requireApproval, enabled } = await loadComments(target);
  if (!enabled) return null;

  return (
    <Comments
      target={target}
      targetType={targetType}
      targetTitle={targetTitle}
      targetUrl={targetUrl}
      initialComments={comments}
      initialTotal={total}
      requireApproval={requireApproval}
      title={title}
      placeholder={placeholder}
      emptyText={emptyText}
    />
  );
}
