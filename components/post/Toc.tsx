"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 文章目录：滚动时高亮当前小节 */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const onScroll = () => {
      const offset = window.scrollY + 140;
      let current = headings[0].id;
      for (const h of headings) {
        if (h.offsetTop <= offset) current = h.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="文章目录" className="text-sm">
      <p className="text-muted mb-3 text-xs font-semibold tracking-widest uppercase">目录</p>
      <ul className="space-y-1 border-l border-white/30 dark:border-white/10">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1 leading-snug transition-all duration-200",
                item.depth === 3 ? "pl-6" : item.depth >= 4 ? "pl-9" : "pl-3",
                active === item.id
                  ? "border-brand-500 font-medium text-brand-600 dark:text-brand-300"
                  : "text-muted border-transparent hover:border-brand-300 hover:text-ink",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
