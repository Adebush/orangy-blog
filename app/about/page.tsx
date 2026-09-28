import type { Metadata } from "next";
import { ProfileCard, SectionHeader } from "@/components/site/Cards";
import { getAbout, getSite } from "@/lib/site";

export const metadata: Metadata = {
  title: "关于",
  description: "关于这个站点和写下这些文字的人。",
};

export default async function AboutPage() {
  const [about, site] = await Promise.all([getAbout(), getSite()]);

  return (
    <div className="space-y-6">
      <SectionHeader title="关于" subtitle={`关于 ${site.author || site.title} 的一点介绍`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <article className="glass glass-sheen animate-fade-up rounded-4xl p-6 sm:p-8">
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{ __html: about.html }}
            />
          </article>
        </div>

        <aside className="space-y-6">
          <ProfileCard site={site} />
        </aside>
      </div>
    </div>
  );
}
