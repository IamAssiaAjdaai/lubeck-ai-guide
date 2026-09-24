import { Construction } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { getAdminCapabilityOutcome } from "@/lib/admin/authorization.server";
import { getAdminSection } from "@/lib/admin/navigation";

export default async function AdminSectionPage({
  params,
}: Readonly<{ params: Promise<{ section: string }> }>) {
  const { section: sectionId } = await params;
  const section = getAdminSection(sectionId);

  if (!section || section.id === "dashboard") {
    notFound();
  }

  const access = await getAdminCapabilityOutcome(section.capability);

  if (access.kind === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.kind === "forbidden") {
    redirect("/admin/unauthorized?reason=capability");
  }

  return (
    <section>
      <p className="eyebrow">Admin section</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
        {section.label}
      </h1>
      <div className="surface-card mt-7 p-7">
        <Construction aria-hidden="true" className="text-primary" size={28} />
        <h2 className="mt-5 text-lg font-bold">Protected placeholder</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
          Your role permits access to this area. Content-management actions
          will be implemented in the relevant follow-up CMS ticket.
        </p>
      </div>
    </section>
  );
}
