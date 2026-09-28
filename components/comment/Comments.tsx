"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2, MessageSquare, Send } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";

export interface PublicComment {
  id: string;
  author: string;
  website: string;
  content: string;
  createdAt: string;
  /** 仅前端本地使用：刚提交、还没通过审核 */
  pending?: boolean;
}

const inputCls =
  "glass-soft w-full rounded-2xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--ink-muted)]";

function CommentItem({ comment }: { comment: PublicComment }) {
  return (
    <li className="glass-soft rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <span className="bg-brand-500/15 text-brand-700 dark:text-brand-300 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold">
          {comment.author.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          {comment.website ? (
            <a
              href={comment.website}
              target="_blank"
              rel="noreferrer noopener nofollow"
              className="hover:text-brand-600 dark:hover:text-brand-300 block truncate text-sm font-medium transition-colors"
            >
              {comment.author}
            </a>
          ) : (
            <span className="block truncate text-sm font-medium">{comment.author}</span>
          )}
        </span>
        {comment.pending && (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.68rem] text-amber-700 dark:text-amber-400">
            待审核
          </span>
        )}
        <time className="text-muted shrink-0 text-[0.7rem]" dateTime={comment.createdAt}>
          {relativeTime(comment.createdAt)}
        </time>
      </div>
      <p className="text-soft mt-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {comment.content}
      </p>
    </li>
  );
}

export function Comments({
  target,
  targetType,
  targetTitle,
  targetUrl,
  initialComments,
  initialTotal,
  requireApproval = true,
  title = "评论",
  placeholder = "说点什么…",
  emptyText = "还没有评论，来抢沙发～",
  /** 主页留言用：换一套文案 */
  variant = "default",
}: {
  target: string;
  targetType: string;
  targetTitle: string;
  targetUrl: string;
  initialComments: PublicComment[];
  initialTotal?: number;
  requireApproval?: boolean;
  title?: string;
  placeholder?: string;
  emptyText?: string;
  variant?: "default" | "guestbook";
}) {
  const [comments, setComments] = useState<PublicComment[]>(initialComments);
  const [total, setTotal] = useState(initialTotal ?? initialComments.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    // 自己校验，保证失败时一定有肉眼可见的提示
    const name = author.trim() || "匿名";
    if (!content.trim()) {
      setMessage({ type: "err", text: "请先填写内容再提交" });
      return;
    }
    if (content.trim().length < 2) {
      setMessage({ type: "err", text: "内容太短了，至少写两个字吧" });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          targetType,
          targetTitle,
          targetUrl,
          author: name,
          email,
          website,
          content,
          honeypot,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        pending?: boolean;
        comment?: PublicComment;
      };
      if (!data.ok) {
        setMessage({ type: "err", text: data.error ?? "提交失败" });
        return;
      }
      setAuthor("");
      setEmail("");
      setWebsite("");
      setContent("");
      if (data.pending) {
        // 立刻把自己这条显示出来（标为待审核），给出明确的「提交成功了」的反馈
        if (data.comment) {
          setComments((list) => [{ ...data.comment!, pending: true }, ...list]);
          setTotal((n) => n + 1);
        }
        setMessage({
          type: "ok",
          text:
            variant === "guestbook"
              ? "留言已提交 ✅ 已显示在下面并标记为「待审核」，站长挑选后会以弹幕出现"
              : "评论已提交 ✅ 已显示在下面并标记为「待审核」，站长审核后所有人可见",
        });
      } else {
        if (data.comment) {
          setComments((list) => [data.comment!, ...list]);
          setTotal((n) => n + 1);
        }
        setMessage({ type: "ok", text: "发布成功" });
      }
    } catch {
      setMessage({ type: "err", text: "网络错误，请稍后再试" });
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/comments?target=${encodeURIComponent(target)}&offset=${comments.length}`,
      );
      const data = (await res.json()) as {
        ok: boolean;
        comments?: PublicComment[];
        total?: number;
      };
      if (data.ok && data.comments) {
        setComments((list) => [...list, ...data.comments!]);
        if (typeof data.total === "number") setTotal(data.total);
      }
    } catch {
      /* 忽略，用户可以再点一次 */
    } finally {
      setLoadingMore(false);
    }
  }

  const isGuestbook = variant === "guestbook";

  return (
    <section className="glass glass-sheen animate-fade-up rounded-3xl p-6 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <MessageSquare className="text-brand-500 h-4 w-4" />
        {title}
        <span className="text-muted text-sm font-normal">{total}</span>
      </h2>

      {isGuestbook && (
        <p className="text-muted mt-2 text-sm leading-relaxed">
          在这里给我留言。留言会先到我这里，我会把有意思的挑出来，
          <b>以弹幕的形式在主页上方飘过</b>；其余的也会保留下来。
        </p>
      )}

      {/* 表单 */}
      {/* noValidate：不用浏览器原生校验 —— 它失败时只在字段旁弹个很小的提示，
            如果用户已经滚到底部点按钮，看起来就像「点了没反应」。
            这里改成用页面内明显的提示条反馈。 */}
      <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="昵称（留空则显示为「匿名」）"
            maxLength={40}
            aria-label="昵称"
            className={inputCls}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱（不公开，可选）"
            type="email"
            maxLength={120}
            aria-label="邮箱"
            className={inputCls}
          />
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="网站（可选）"
            maxLength={200}
            aria-label="网站"
            className={inputCls}
          />
        </div>

        {/* 蜜罐：正常用户看不见，填了就当作机器人 */}
        <input
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          name="company"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={1000}
          aria-label="评论内容"
          className={cn(inputCls, "resize-y")}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? "提交中…" : isGuestbook ? "发送留言" : "发表评论"}
          </button>
          <span className="text-muted text-xs">
            {requireApproval ? "提交后需站长审核通过才会公开显示" : "提交后立即显示"}
          </span>
        </div>

        {message && (
          <p
            className={cn(
              "flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm",
              message.type === "ok"
                ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/12 text-red-600 dark:text-red-400",
            )}
          >
            {message.type === "ok" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </p>
        )}
      </form>

      {/* 列表 */}
      <ul className="mt-5 space-y-2.5">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
        {comments.length === 0 && (
          <li className="text-muted py-6 text-center text-sm">{emptyText}</li>
        )}
      </ul>

      {comments.length < total && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="glass-soft hover:text-brand-600 dark:hover:text-brand-300 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loadingMore ? "加载中…" : `加载更多（还有 ${total - comments.length} 条）`}
          </button>
        </div>
      )}

      {isGuestbook && (
        <p className="text-muted mt-4 text-xs">
          提示：本站的
          <Link href="/friends" className="text-brand-600 dark:text-brand-300 hover:underline">
            友链页
          </Link>
          也可以留言交换友链。
        </p>
      )}
    </section>
  );
}
