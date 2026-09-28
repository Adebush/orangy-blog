import type { ComponentType } from "react";
import { Globe, Mail, Rss } from "lucide-react";

/** lucide-react v1 不再导出 LucideIcon 类型，这里自定义一个 */
export type IconType = ComponentType<{ className?: string }>;

export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

export function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  );
}

export function BilibiliIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.997h1.42a4.1 4.1 0 0 1 4.1 4.1v6.5a4.1 4.1 0 0 1-4.1 4.1H5.5a4.1 4.1 0 0 1-4.1-4.1v-6.5a4.1 4.1 0 0 1 4.1-4.1h1.42L5.777 4.854A1.25 1.25 0 1 1 7.545 3.086L10.46 5.997h3.08l2.915-2.911a1.25 1.25 0 0 1 1.768 0ZM19.5 8.497h-15a1.6 1.6 0 0 0-1.6 1.6v6.5a1.6 1.6 0 0 0 1.6 1.6h15a1.6 1.6 0 0 0 1.6-1.6v-6.5a1.6 1.6 0 0 0-1.6-1.6ZM8.75 11.247a1.25 1.25 0 0 1 1.25 1.25v1.5a1.25 1.25 0 1 1-2.5 0v-1.5a1.25 1.25 0 0 1 1.25-1.25Zm6.5 0a1.25 1.25 0 0 1 1.25 1.25v1.5a1.25 1.25 0 1 1-2.5 0v-1.5a1.25 1.25 0 0 1 1.25-1.25Z" />
    </svg>
  );
}

/** 社交图标映射：配置里写 icon 名称即可 */
export const SOCIAL_ICONS: Record<string, IconType> = {
  github: GithubIcon,
  mail: Mail,
  email: Mail,
  rss: Rss,
  twitter: XIcon,
  x: XIcon,
  youtube: YoutubeIcon,
  bilibili: BilibiliIcon,
  globe: Globe,
};
