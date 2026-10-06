import { ArrowRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, EmptyContent, StatusBadge } from "@/components/admin/AdminContentUi";
import { listAuthorizedPlaces } from "@/lib/admin/content/service.server";

export default async function PlacesPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; category?: string; status?: string; city?: string }> }) {
  const query = await searchParams;
  const authorizedPlaces = await listAuthorizedPlaces();
  const places = authorizedPlaces.filter((place) =>
    (!query.q || `${place.slug} ${place.localizations.map(({ name }) => name).join(" ")}`.toLowerCase().includes(query.q.toLowerCase())) &&
    (!query.category || place.category === query.category) &&
    (!query.status || place.publicationStatus === query.status) &&
    (!query.city || place.city?.slug === query.city));
  const selectedCity = query.city ? authorizedPlaces.find((place) => place.city?.slug === query.city)?.city : undefined;
  const cityName = selectedCity?.slug ?? query.city;
  const newHref = query.city ? `/admin/places/new?city=${query.city}` : "/admin/places/new";

  return <section>
    <AdminPageHeader
      actionHref={newHref}
      actionLabel="Add place"
      description={query.city ? `Places travelers can discover in ${cityName}. Open a place to continue its content, media, and publishing workflow.` : "Browse places across all cities. Open a city workspace for the simplest editing flow."}
      eyebrow={query.city ? `${cityName} · City workspace` : "All cities"}
      title="Places"
    />
    <AdminNotice error={query.error} />

    {!query.city ? (
      <form className="surface-card mt-6 grid gap-3 p-4 sm:grid-cols-4">
        <input aria-label="Search places" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.q} name="q" placeholder="Search places" />
        <select aria-label="Category filter" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.category} name="category"><option value="">All categories</option><option>see</option><option>eat</option><option>fun</option></select>
        <select aria-label="Publication filter" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.status} name="status"><option value="">Any status</option><option>draft</option><option>published</option><option>archived</option></select>
        <button className="button-secondary min-h-11 px-4" type="submit">Filter</button>
      </form>
    ) : null}

    {places.length === 0 ? (
      <div className="surface-card mt-6 p-7">
        <MapPin aria-hidden="true" className="text-primary" size={24} />
        <h2 className="mt-4 text-lg font-extrabold">No places yet</h2>
        <p className="mt-2 text-sm text-text-secondary">Add the first place travelers should discover here.</p>
        <Link className="button-primary mt-5 inline-flex min-h-11 items-center gap-2 px-4" href={newHref}><Plus size={16} /> Add place</Link>
      </div>
    ) : (
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {places.map((place) => (
          <Link className="surface-card group p-5 transition hover:border-primary/30 hover:shadow-md" href={`/admin/places/${place.id}`} key={place.id}>
            <div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><MapPin size={18} /></span><StatusBadge status={place.publicationStatus} /></div>
            <h2 className="mt-4 text-lg font-extrabold">{place.localizations[0]?.name ?? place.slug}</h2>
            <p className="mt-1 text-sm capitalize text-text-secondary">{place.category}{!query.city && place.city ? ` · ${place.city.slug}` : ""}</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Continue editing <ArrowRight className="transition group-hover:translate-x-1" size={16} /></p>
          </Link>
        ))}
      </div>
    )}
  </section>;
}
