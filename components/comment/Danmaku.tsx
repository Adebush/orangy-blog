"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DanmakuMessage {
  id: string;
  author: string;
  content: string;
}

const LANES = 8;
const LANE_HEIGHT = 44;

/** 由字符串算一个稳定的散列，保证服务端/客户端渲染一致（不能用 Math.random） */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * 主页弹幕：后台人工挑选的留言从右往左划过。
 * 位置/速度都由 id 推导，保证每次渲染一致，不会出现水合不匹配。
 */
export function Danmaku({ messages }: { messages: DanmakuMessage[] }) {
  const [paused, setPaused] = useState(false);

  if (messages.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 text-center dark:border-white/10">
        <MessageCircle className="text-muted h-6 w-6" />
        <p className="text-muted mt-2 text-sm">还没有被选中的留言</p>
        <p className="text-muted mt-1 text-xs">在下面留言，站长觉得有意思就会让它从这里飘过</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        paused && "danmaku-paused",
      )}
      style={{ height: `${Math.max(1, Math.min(LANES, messages.length)) * LANE_HEIGHT}px` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused((v) => !v)}
      aria-label="精选留言弹幕"
    >
      {messages.map((message, index) => {
        const h = hash(message.id);
        const lane = index % Math.min(LANES, messages.length);
        // 内容越长给它越多时间，观感更自然
        const duration = 16 + (message.content.length % 12) + (h % 5);
        // 负延时让弹幕一开始就散布在轨道各处，而不是一起冲出来
        const delay = -((index * 2.7 + (h % 7)) % duration);

        return (
          <span
            key={message.id}
            className="danmaku-item"
            style={{
              top: `${lane * LANE_HEIGHT + 8}px`,
              animation: `danmaku-fly ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            <span className="glass-soft inline-flex max-w-[70vw] items-center gap-2 rounded-full px-3.5 py-1.5 text-sm">
              <span className="text-brand-600 dark:text-brand-300 shrink-0 font-medium">
                {message.author}
              </span>
              <span className="text-soft truncate">{message.content}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
