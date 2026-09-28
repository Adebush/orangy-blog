import { Sparkles } from "lucide-react";
import { Comments } from "@/components/comment/Comments";
import { Danmaku } from "@/components/comment/Danmaku";
import { getSettings, listApproved, listFeatured, publicComment } from "@/lib/comments";

/**
 * 主页留言板：
 * 上半部分是「弹幕屏」——只显示后台人工挑中的留言；
 * 下半部分是留言表单与已通过的留言列表。
 */
export async function Guestbook() {
  const [settings, featured, approved] = await Promise.all([
    getSettings(),
    listFeatured(),
    listApproved("home", { limit: 20 }),
  ]);

  if (!settings.enabled) return null;

  return (
    // 桌面并排：左边弹幕屏，右边留言表单，页面更短
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="glass-strong glass-sheen animate-fade-up relative overflow-hidden rounded-4xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-brand-300/25 blur-3xl" />
        <div className="relative">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Sparkles className="text-brand-500 h-4 w-4" />
            留言板
            <span className="text-muted text-sm font-normal">
              {featured.length > 0 ? `精选 ${featured.length} 条` : ""}
            </span>
          </h2>
          <p className="text-muted mt-1.5 text-sm">
            这里飘过的每一条，都是我从留言里挑出来的。
          </p>
          <div className="mt-4">
            <Danmaku
              messages={featured.map((c) => ({
                id: c.id,
                author: c.author,
                content: c.content,
              }))}
            />
          </div>
        </div>
      </section>

      <Comments
        target="home"
        targetType="home"
        targetTitle="主页留言板"
        targetUrl="/"
        initialComments={approved.items.map(publicComment)}
        initialTotal={approved.total}
        requireApproval={settings.requireApproval}
        title="给我留言"
        placeholder="想说什么都可以，我每一条都会看…"
        emptyText="还没有留言，来做第一个吧～"
        variant="guestbook"
      />
    </div>
  );
}
