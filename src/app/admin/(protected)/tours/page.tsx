import { ArrowRight, Plus, Route } from "lucide-react";
import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, EmptyContent, StatusBadge } from "@/components/admin/AdminContentUi";
import { listAuthorizedTours } from "@/lib/admin/content/service.server";

export default async function ToursPage({ searchParams }: { searchParams: Promise<{ error?: string; city?: string }> }) {
  const query = await searchParams;
  const authorizedTours = await listAuthorizedTours();
  const tours = authorizedTours.filter((tour) => !query.city || tour.city?.slug === query.city);
  const selectedCity = query.city ? authorizedTours.find((tour) => tour.city?.slug === query.city)?.city : undefined;
  const cityName = selectedCity?.slug ?? query.city;
  const newHref = query.city ? `/admin/tours/new?city=${query.city}` : "/admin/tours/new";

  return <section>
    <AdminPageHeader
      actionHref={newHref}
      actionLabel="Create walk"
      description={query.city ? `Curated walks for ${cityName}. Choose places, arrange the stops, then review and publish.` : "Browse curated walks across all cities. Open a city workspace for the simplest workflow."}
      eyebrow={query.city ? `${cityName} · City workspace` : "All cities"}
      title="Walks"
    />
    <AdminNotice error={query.error} />

    {tours.length === 0 ? (
      <div className="surface-card mt-6 p-7">
        <Route aria-hidden="true" className="text-primary" size={24} />
        <h2 className="mt-4 text-lg font-extrabold">No walks yet</h2>
        <p className="mt-2 text-sm text-text-secondary">Create a walk from trusted places in this city.</p>
        <Link className="button-primary mt-5 inline-flex min-h-11 items-center gap-2 px-4" href={newHref}><Plus size={16} /> Create walk</Link>
      </div>
    ) : (
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tours.map((tour) => (
          <Link className="surface-card group p-5 transition hover:border-primary/30 hover:shadow-md" href={`/admin/tours/${tour.id}`} key={tour.id}>
            <div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Route size={18} /></span><StatusBadge status={tour.publicationStatus} /></div>
            <h2 className="mt-4 text-lg font-extrabold">{tour.localizations[0]?.title ?? tour.slug}</h2>
            <p className="mt-1 text-sm text-text-secondary">{tour.stops.length} stops{tour.estimatedDurationMinutes ? ` · ${tour.estimatedDurationMinutes} min` : ""}{!query.city && tour.city ? ` · ${tour.city.slug}` : ""}</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Continue editing <ArrowRight className="transition group-hover:translate-x-1" size={16} /></p>
          </Link>
        ))}
      </div>
    )}
  </section>;
}
