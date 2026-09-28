"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  FolderGit2,
  FolderOpen,
  Gamepad2,
  Home,
  Images,
  Link as LinkIcon,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import type { IconType } from "./BrandIcons";

const ICONS: Record<string, IconType> = {
  home: Home,
  "file-text": FileText,
  "folder-open": FolderOpen,
  "gamepad-2": Gamepad2,
  "message-circle": MessageCircle,
  "calendar-days": CalendarDays,
  "folder-git-2": FolderGit2,
  images: Images,
  link: LinkIcon,
  user: User,
};

export function Navbar({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        className={cn(
          "glass-sheen mx-auto flex max-w-6xl items-center gap-2 rounded-2xl px-3 py-2 transition-all duration-500 sm:rounded-full sm:px-4",
          scrolled ? "glass-strong" : "glass",
        )}
      >
        {/* 站点名 */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-full px-2 py-1"
          aria-label={title}
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-[1.05rem] font-bold tracking-tight">
            <span className="text-gradient">{title}</span>
          </span>
        </Link>

        {/* 桌面端导航 */}
        <ul className="mx-auto hidden items-center gap-0.5 lg:flex">
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? Home;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.desc}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300",
                    active
                      ? "glass-soft text-brand-600 dark:text-brand-300"
                      : "text-soft hover:bg-white/40 hover:text-ink dark:hover:bg-white/10",
                  )}
                >
                  <Icon className="h-[0.95rem] w-[0.95rem]" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 右侧操作 */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <Link
            href="/posts"
            aria-label="搜索文章"
            title="搜索文章"
            className="glass glass-sheen glass-hover hidden h-9 w-9 place-items-center rounded-full sm:grid"
          >
            <Search className="h-[1.05rem] w-[1.05rem]" />
          </Link>
          <ThemeToggle />
          <Link
            href="/admin"
            aria-label="后台管理"
            title="后台管理"
            className="glass glass-sheen glass-hover hidden h-9 w-9 place-items-center rounded-full sm:grid"
          >
            <Settings className="h-[1.05rem] w-[1.05rem]" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="打开导航菜单"
            aria-expanded={open}
            className="glass glass-sheen grid h-9 w-9 place-items-center rounded-full lg:hidden"
          >
            {open ? <X className="h-[1.05rem] w-[1.05rem]" /> : <Menu className="h-[1.05rem] w-[1.05rem]" />}
          </button>
        </div>
      </nav>

      {/* 移动端下拉面板 */}
      <div
        className={cn(
          "mx-auto mt-2 max-w-6xl overflow-hidden transition-all duration-400 lg:hidden",
          open ? "max-h-[32rem] opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <ul className="glass-strong grid grid-cols-2 gap-1.5 rounded-2xl p-2.5 sm:grid-cols-3">
          {items.map((item, i) => {
            const Icon = ICONS[item.icon] ?? Home;
            const active = isActive(item.href);
            return (
              <li key={item.href} style={{ animationDelay: `${i * 28}ms` }} className={open ? "animate-fade-up" : ""}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                      : "text-soft hover:bg-white/45 dark:hover:bg-white/10",
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span className="text-muted block truncate text-[0.68rem] font-normal">
                      {item.desc}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="col-span-full mt-1 border-t border-white/25 pt-2 dark:border-white/10">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-soft hover:bg-white/45 dark:hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
              后台管理
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
