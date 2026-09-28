import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireAuth } from "@/lib/auth";
import { listAll } from "@/lib/comments";
import { getSite } from "@/lib/site";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAuth();
  const [site, comments] = await Promise.all([getSite(), listAll()]);
  const pendingComments = comments.filter((c) => !c.approved).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <AdminSidebar siteTitle={site.title} pendingComments={pendingComments} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
