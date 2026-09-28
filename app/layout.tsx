import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

import { Background } from "@/components/site/Background";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { ChromeGate } from "@/components/site/ChromeGate";
import { ThemeScript } from "@/components/site/ThemeToggle";
import { activeTracks, getMusicConfig } from "@/lib/music";
import { getTags } from "@/lib/posts";
import { getSite } from "@/lib/site";
import { NAV_ITEMS } from "@/lib/nav";

// 内容随时可能被后台改动，全部走动态渲染，避免发完文章还要重新构建
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: {
      default: `${site.title} · ${site.subtitle}`,
      template: `%s · ${site.title}`,
    },
    description: site.description,
    keywords: [site.title, site.author, "博客", "blog", ...site.heroTags],
    authors: [{ name: site.author }],
    openGraph: {
      title: `${site.title} · ${site.subtitle}`,
      description: site.description,
      type: "website",
      locale: "zh_CN",
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "32x32" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [site, tags, music] = await Promise.all([getSite(), getTags(), getMusicConfig()]);

  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
        <Background />
        <ChromeGate
          navbar={<Navbar title={site.title} items={NAV_ITEMS} />}
          footer={<Footer site={site} tags={tags} />}
          backToTop={<BackToTop />}
        >
          {children}
        </ChromeGate>
      </body>
    </html>
  );
}
