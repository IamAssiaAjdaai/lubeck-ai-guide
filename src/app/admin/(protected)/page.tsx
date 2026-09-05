import { CheckCircle2, Database, Globe2, Layers3 } from "lucide-react";
import { redirect } from "next/navigation";

import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";
import { getVisibleAdminSections } from "@/lib/admin/navigation";

export const metadata = { title: "Dashboard | CITYWALK Admin" };

export default async function AdminDashboardPage() {
  const access = await getAdminAccessOutcome();

  if (access.kind === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.kind === "forbidden") {
    redirect("/admin/unauthorized");
  }

  const { staff } = access.context;
  const sectionCount = getVisibleAdminSections(staff).length;
  const cards = [
    {
      title: "Current role",
      value: staff.role.replaceAll("_", " "),
      icon: CheckCircle2,
    },
    {
      title: "Accessible cities",
      value:
        staff.role === "super_admin" || staff.globalAccess
          ? "All cities"
          : `${staff.cityIds.length} scoped`,
      icon: Globe2,
    },
    {
      title: "Content areas",
      value: `${sectionCount} available`,
      icon: Layers3,
    },
    {
      title: "Auth & database",
      value: "Connected",
      icon: Database,
    },
  ];

  return (
    <section>
      <p className="eyebrow">Operations</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Admin dashboard
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Secure foundation for CITYWALK content operations. Editing and
        publishing workflows arrive in later CMS tickets.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, title, value }) => (
          <article className="surface-card p-5" key={title}>
            <Icon aria-hidden="true" className="text-primary" size={21} />
            <p className="mt-5 text-xs font-semibold text-text-secondary">
              {title}
            </p>
            <p className="mt-1 font-bold capitalize">{value}</p>
          </article>
        ))}
      </div>
      <div className="surface-card mt-6 p-6">
        <h2 className="text-lg font-bold">CMS foundation ready</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          The console currently provides authenticated, role-filtered
          navigation only. No public content can be changed from this shell.
        </p>
      </div>
    </section>
  );
}
