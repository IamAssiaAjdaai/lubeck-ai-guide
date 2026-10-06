import { ArrowRight, Building2, Plus } from "lucide-react";
import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, EmptyContent, StatusBadge } from "@/components/admin/AdminContentUi";
import { listAuthorizedCities } from "@/lib/admin/content/service.server";

export default async function CitiesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const cities = await listAuthorizedCities();

  return (
    <section>
      <AdminPageHeader
        actionHref="/admin/cities/new"
        actionLabel="Add city"
        description="Choose a city first. Everything you manage in the CMS lives inside its city workspace."
        eyebrow="CITYWALK CMS"
        title="Cities"
      />
      <AdminNotice error={error} />

      {cities.length === 0 ? (
        <EmptyContent>No cities are available in your staff scope.</EmptyContent>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cities.map((city) => (
            <Link className="surface-card group p-6 transition hover:border-primary/30 hover:shadow-md" href={`/admin/cities/${city.id}`} key={city.id}>
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 aria-hidden="true" size={22} /></span>
                <StatusBadge status={city.publicationStatus} />
              </div>
              <h2 className="mt-5 text-xl font-extrabold">{city.localizations[0]?.name ?? city.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">{city.placeCount} places · {city.tourCount} walks · {city.localizations.length} languages</p>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-primary">Open workspace <ArrowRight aria-hidden="true" size={16} /></p>
            </Link>
          ))}
          <Link className="surface-card border-dashed p-6 transition hover:border-primary/30" href="/admin/cities/new">
            <Plus aria-hidden="true" className="text-primary" size={22} />
            <h2 className="mt-5 text-lg font-extrabold">Add another city</h2>
            <p className="mt-1 text-sm text-text-secondary">Create a new city workspace.</p>
          </Link>
        </div>
      )}
    </section>
  );
}
