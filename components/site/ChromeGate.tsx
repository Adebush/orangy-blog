"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * 前台显示导航 / 页脚 / 音乐播放器，后台（/admin）只保留纯内容区域。
 * navbar / footer 由服务端布局渲染后作为 props 传入。
 */
export function ChromeGate({
  navbar,
  footer,
  backToTop,
  children,
}: {
  navbar: ReactNode;
  footer: ReactNode;
  backToTop: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  return (
    <>
      {!isAdmin && navbar}
      <main
        className={
          isAdmin
            ? "mx-auto w-full max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6"
            : "mx-auto w-full max-w-6xl px-3 pt-6 pb-4 sm:px-5 sm:pt-8"
        }
      >
        {children}
      </main>
      {!isAdmin && footer}
      {!isAdmin && backToTop}
    </>
  );
}
