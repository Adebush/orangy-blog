import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "页面走丢了",
  description: "这个页面不存在，或者已经被移动到别处了。",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass glass-sheen animate-fade-up w-full max-w-xl rounded-4xl p-9 text-center sm:p-14">
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 opacity-30 blur-xl" />
          <Compass className="animate-float text-brand-500 relative h-10 w-10" />
        </div>

        <p className="text-gradient mt-6 text-5xl font-black tracking-tight sm:text-6xl">404</p>
        <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">页面走丢了</h1>
        <p className="text-soft mx-auto mt-3 max-w-md text-sm leading-relaxed">
          你要找的页面可能被移动、删除，或者从来没有存在过。不如换条路走走？
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="glass glass-sheen glass-hover text-brand-600 dark:text-brand-300 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <Link
            href="/posts"
            className="glass-soft glass-hover text-soft inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            看看文章
          </Link>
        </div>
      </div>
    </div>
  );
}
