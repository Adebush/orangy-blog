import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { categoryIcon } from "@/components/file/categoryIcons";

/**
 * 首页的「这个站都有什么」引导区。
 * 目的：新访客一眼看懂每个板块装的是什么、想找东西该点哪里。
 */
export function SiteGuide({ items }: { items: NavItem[] }) {
  // 「首页」是当前页，不列进来
  const list = items.filter((item) => item.href !== "/");

  return (
    <section
      id="site-guide"
      className="glass glass-sheen animate-fade-up scroll-mt-24 rounded-3xl p-6 sm:p-7"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Compass className="text-brand-500 h-4 w-4" />
        这个站都有什么
      </h2>
      <p className="text-muted mt-1.5 text-sm">
        第一次来？下面是每个板块的内容，点一下就能进去。
      </p>

      <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => {
          const Icon = categoryIcon(item.icon);
          const isAbout = item.href === "/about";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isAbout
                  ? "group flex items-start gap-2.5 rounded-2xl border border-brand-400/40 bg-brand-500/10 px-3.5 py-2.5 transition-all hover:bg-brand-500/18"
                  : "glass-soft group flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 transition-all hover:bg-brand-500/12"
              }
            >
              <span className="bg-brand-500/15 text-brand-600 dark:text-brand-300 grid h-7 w-7 shrink-0 place-items-center rounded-lg">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300">
                  {item.label}
                </span>
                <span className="text-muted mt-0.5 block text-xs leading-relaxed">
                  {item.desc}
                </span>
              </span>
              <ArrowRight className="text-muted mt-1 h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </Link>
          );
        })}
      </div>

      <div className="text-muted mt-3.5 grid gap-1.5 border-t border-white/30 pt-3.5 text-xs leading-relaxed sm:grid-cols-3 sm:gap-4 dark:border-white/10">
        <p>
          想了解我本人、看联系方式 → 点上面的
          <Link href="/about" className="text-brand-600 dark:text-brand-300 mx-1 font-medium hover:underline">
            关于
          </Link>
        </p>
        <p>想下载自制谱面或 mod → 点「文件」，里面分「谱面」和「实用mod」</p>
        <p>想留言 → 拉到页面底部「给我留言」，精选的会在留言板以弹幕飘过</p>
      </div>
    </section>
  );
}
