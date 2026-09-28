"use client";

import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "orangy-theme";

/**
 * 主题切换：直接切换 <html> 上的 .dark 类。
 * 两个图标都渲染，靠 CSS 控制显隐，这样服务端与客户端输出一致，不会出现水合闪烁。
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* 隐私模式下忽略 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换深色 / 浅色主题"
      title="切换主题"
      className={`glass glass-sheen glass-hover grid h-9 w-9 place-items-center rounded-full ${className}`}
    >
      <Sun className="hidden h-[1.05rem] w-[1.05rem] dark:block" />
      <Moon className="block h-[1.05rem] w-[1.05rem] dark:hidden" />
    </button>
  );
}

/** 在页面绘制前恢复主题，避免闪白 */
export function ThemeScript() {
  const code = `(function(){try{var k="${STORAGE_KEY}",s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
