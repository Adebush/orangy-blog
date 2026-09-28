import Link from "next/link";
import type { SiteConfig } from "@/lib/types";
import { SOCIAL_ICONS } from "./BrandIcons";

export function Footer({ site, tags }: { site: SiteConfig; tags: { tag: string; count: number }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 px-3 pb-8 sm:px-5">
      <div className="glass glass-sheen mx-auto max-w-6xl rounded-3xl p-6 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-bold">
              <span className="text-gradient">{site.title}</span>
            </h3>
            <p className="text-soft mt-2 max-w-sm text-sm leading-relaxed">{site.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {site.socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.icon] ?? SOCIAL_ICONS.globe;
                return (
                  <a
                    key={`${s.label}-${s.href}`}
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer noopener"
                    title={s.label}
                    aria-label={s.label}
                    className="glass-soft glass-hover grid h-9 w-9 place-items-center rounded-full"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide uppercase opacity-70">导航</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { label: "文章", href: "/posts" },
                { label: "说说", href: "/moments" },
                { label: "归档", href: "/timeline" },
                { label: "相册", href: "/photowall" },
                { label: "友链", href: "/friends" },
                { label: "关于", href: "/about" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-soft transition-colors hover:text-brand-500">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide uppercase opacity-70">标签</h4>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 10).map((t) => (
                <Link
                  key={t.tag}
                  href={`/posts?tag=${encodeURIComponent(t.tag)}`}
                  className="glass-soft rounded-full px-2.5 py-1 text-xs transition-colors hover:text-brand-500"
                >
                  {t.tag}
                </Link>
              ))}
              {tags.length === 0 && <span className="text-muted text-sm">暂无标签</span>}
            </div>
          </div>
        </div>

        <div className="text-muted mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/25 pt-5 text-xs sm:flex-row dark:border-white/10">
          <p>
            © {site.startYear > 0 && site.startYear < year ? `${site.startYear} – ${year}` : year}{" "}
            {site.author || site.title}. All rights reserved.
          </p>
          <p className="flex items-center gap-3">
            {site.icp && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-brand-500"
              >
                {site.icp}
              </a>
            )}
            <span>{site.footerText}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
