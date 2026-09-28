import { paths, readJson, readText, renderMarkdown, writeJson } from "./markdown";
import type {
  Friend,
  Moment,
  Photo,
  Project,
  SiteConfig,
  TimelineItem,
} from "./types";

export const defaultSite: SiteConfig = {
  // 以下是全新部署时的占位内容，请在「后台 → 站点设置」里改成你自己的
  title: "我的博客",
  subtitle: "记录、思考与生活",
  description: "一个毛玻璃风格的个人博客，写点代码、写点生活。",
  author: "",
  avatar: "/avatar.svg",
  bio: "这里是我的数字花园，记录技术与生活。",
  location: "",
  email: "",
  startYear: new Date().getFullYear(),
  icp: "",
  announcement: "",
  footerText: "Powered by Next.js · Designed with Glassmorphism",
  friendsDesc: "",
  heroTags: ["开发者", "记录生活", "终身学习"],
  socials: [
    { label: "GitHub", href: "https://github.com", icon: "github" },
    { label: "Email", href: "mailto:you@example.com", icon: "mail" },
    { label: "RSS", href: "/rss.xml", icon: "rss" },
  ],
};

export async function getSite(): Promise<SiteConfig> {
  const saved = await readJson<Partial<SiteConfig>>(paths.site, {});
  return {
    ...defaultSite,
    ...saved,
    socials: saved.socials?.length ? saved.socials : defaultSite.socials,
    heroTags: saved.heroTags?.length ? saved.heroTags : defaultSite.heroTags,
  };
}

export async function saveSite(patch: Partial<SiteConfig>): Promise<SiteConfig> {
  const current = await getSite();
  const next: SiteConfig = { ...current, ...patch };
  await writeJson(paths.site, next);
  return next;
}

export async function getMoments(): Promise<Moment[]> {
  const list = await readJson<Moment[]>(paths.moments, []);
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveMoments(list: Moment[]): Promise<void> {
  await writeJson(paths.moments, list);
}

export async function getFriends(): Promise<Friend[]> {
  return readJson<Friend[]>(paths.friends, []);
}

export async function saveFriends(list: Friend[]): Promise<void> {
  await writeJson(paths.friends, list);
}

export async function getProjects(): Promise<Project[]> {
  return readJson<Project[]>(paths.projects, []);
}

export async function saveProjects(list: Project[]): Promise<void> {
  await writeJson(paths.projects, list);
}

export async function getPhotos(): Promise<Photo[]> {
  return readJson<Photo[]>(paths.photos, []);
}

export async function savePhotos(list: Photo[]): Promise<void> {
  await writeJson(paths.photos, list);
}

export async function getTimeline(): Promise<TimelineItem[]> {
  const list = await readJson<TimelineItem[]>(paths.timeline, []);
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveTimeline(list: TimelineItem[]): Promise<void> {
  await writeJson(paths.timeline, list);
}

export async function getAbout(): Promise<{ markdown: string; html: string }> {
  const markdown = await readText(paths.about, "# 关于\n\n这个人很懒，什么都没写。");
  const { html } = await renderMarkdown(markdown);
  return { markdown, html };
}

export async function saveAbout(markdown: string): Promise<void> {
  const { promises: fs } = await import("node:fs");
  await fs.writeFile(paths.about, markdown, "utf8");
}
