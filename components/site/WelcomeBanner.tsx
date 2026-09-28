"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Hand, X } from "lucide-react";

const SEEN_KEY = "orangy-welcomed";

/**
 * 首次访问的欢迎提示条（可关闭，关掉后不再出现）。
 * 只加不减：老访客看不到，新访客能一眼知道该往哪走。
 */
export function WelcomeBanner() {
  const [show, setShow] = useState(false);

  // 在 effect 里读取，保证服务端与首次客户端渲染一致，不会水合不匹配
  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(SEEN_KEY));
    } catch {
      /* 隐私模式忽略 */
    }
    if (!seen) setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;

  return (
    <div className="glass-strong glass-sheen animate-fade-up relative overflow-hidden rounded-3xl px-5 py-4">
      <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-3">
        <span className="bg-brand-500/15 text-brand-600 dark:text-brand-300 grid h-9 w-9 shrink-0 place-items-center rounded-xl">
          <Hand className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed">
          <span className="font-semibold">第一次来？</span>
          <span className="text-soft">
            {" "}
            这里有文章、自制谱面、实用 mod、相册和我的日常记录。
          </span>
          <a
            href="#site-guide"
            className="text-brand-600 dark:text-brand-300 ml-1 inline-flex items-center gap-0.5 font-medium hover:underline"
          >
            看看每个板块都是什么
            <ArrowRight className="h-3 w-3" />
          </a>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="glass-soft hover:text-brand-500 flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          知道了
        </button>
      </div>
    </div>
  );
}
