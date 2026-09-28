"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ExternalLink,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PenSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IconType } from "@/components/site/BrandIcons";

const ITEMS: { href: string; label: string; icon: IconType; exact?: boolean }[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
  { href: "/admin/posts", label: "文章管理", icon: FileText },
  { href: "/admin/editor", label: "写文章", icon: PenSquare },
  { href: "/admin/collections", label: "内容管理", icon: Layers },
  { href: "/admin/comments", label: "评论管理", icon: MessageSquare },
  { href: "/admin/settings", label: "站点设置", icon: Settings },
];

export function AdminSidebar({
  siteTitle,
  pendingComments = 0,
}: {
  siteTitle: string;
  pendingComments?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isActive = (item: (typeof ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="lg:sticky lg:top-5 lg:self-start">
      <div className="glass glass-sheen rounded-3xl p-4">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{siteTitle}</span>
            <span className="text-muted block text-[0.7rem]">管理控制台</span>
          </span>
        </Link>

        <nav className="mt-3 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible no-scrollbar">
          {ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                    : "text-soft hover:bg-white/45 dark:hover:bg-white/10",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
                {item.href === "/admin/comments" && pendingComments > 0 && (
                  <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                    {pendingComments}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 space-y-1 border-t border-white/25 pt-3 dark:border-white/10">
          <Link
            href="/"
            target="_blank"
            className="text-soft flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-white/45 dark:hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4" />
            查看博客
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/12 disabled:opacity-60 dark:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            {busy ? "退出中…" : "退出登录"}
          </button>
        </div>
      </div>
    </aside>
  );
}
