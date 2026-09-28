import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, FolderGit2 } from "lucide-react";
import { GithubIcon } from "@/components/site/BrandIcons";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { SectionHeader } from "@/components/site/Cards";
import { getProjects } from "@/lib/site";
import type { Project } from "@/lib/types";

export const metadata: Metadata = {
  title: "项目",
  description: "做过的一些东西，开源的与不开源的都记在这里。",
};

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article
      className="glass glass-sheen glass-hover animate-fade-up group flex flex-col overflow-hidden rounded-3xl"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      {project.cover ? (
        <div className="relative h-40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover}
            alt={project.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="relative h-20 overflow-hidden border-b border-white/30 dark:border-white/8">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-100/80 via-white/50 to-brand-200/60 dark:from-brand-900/35 dark:via-transparent dark:to-brand-800/25" />
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--color-brand-300)_1px,transparent_1px)] [background-size:13px_13px] dark:opacity-40 dark:[background-image:radial-gradient(var(--color-brand-700)_1px,transparent_1px)]" />
          <span className="absolute right-3 -bottom-1 text-5xl font-black tracking-tight text-white/25 select-none">
            {project.name.slice(0, 1)}
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold tracking-tight">{project.name}</h2>
          {project.status && (
            <span className="glass-soft text-brand-600 dark:text-brand-300 shrink-0 rounded-full px-2.5 py-1 text-[0.68rem]">
              {project.status}
            </span>
          )}
        </div>

        <p className="text-soft mt-2 flex-1 text-sm leading-relaxed">{project.desc}</p>

        {project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span key={tag} className="glass-soft rounded-full px-2.5 py-1 text-[0.7rem]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {(project.url || project.repo) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer noopener"
                className="glass-soft glass-hover inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium hover:text-brand-500"
              >
                在线预览
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {project.repo && (
              <a
                href={project.repo}
                target="_blank"
                rel="noreferrer noopener"
                className="glass-soft glass-hover inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium hover:text-brand-500"
              >
                <GithubIcon className="h-3.5 w-3.5" />
                源码
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="项目"
        subtitle={projects.length > 0 ? `一共 ${projects.length} 个项目` : "做过的东西都会放在这里"}
      />

      {projects.length === 0 ? (
        <div className="glass glass-sheen animate-fade-up rounded-3xl p-10 text-center">
          <FolderGit2 className="text-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">还没有项目</p>
          <p className="text-muted mt-1 text-sm">折腾出来的东西，之后会陆续搬到这里</p>
          <Link
            href="/"
            className="glass glass-sheen glass-hover mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            回首页看看
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={`${project.name}-${i}`} project={project} index={i} />
          ))}
        </div>
      )}

      <CommentsSection
        target="projects"
        targetType="project"
        targetTitle="项目"
        targetUrl="/projects"
      />
    </div>
  );
}
