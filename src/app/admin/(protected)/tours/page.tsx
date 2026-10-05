import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, Cell, ContentTable, EmptyContent, HeaderCell, StatusBadge, TableHead } from "@/components/admin/AdminContentUi";
import { listAuthorizedTours } from "@/lib/admin/content/service.server";

export default async function ToursPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; city?: string; status?: string }> }) {
  const query = await searchParams;
  const authorizedTours = await listAuthorizedTours();
  const tours = authorizedTours.filter((tour) =>
    (!query.q || `${tour.slug} ${tour.localizations.map(({ title }) => title).join(" ")}`.toLowerCase().includes(query.q.toLowerCase())) &&
    (!query.city || tour.city?.slug === query.city) &&
    (!query.status || tour.publicationStatus === query.status));
  const citySlugs = [...new Set(
    authorizedTours.flatMap(({ city }) => city ? [city.slug] : []),
  )].sort();

  return <section>
    <AdminPageHeader actionHref="/admin/tours/new" actionLabel="New tour" description="Manage curated editorial tours. Personalized AI Tour Builder routes remain separate." eyebrow="Content" title="Tours" />
    <AdminNotice error={query.error} />
    <form className="surface-card mt-6 grid gap-3 p-4 sm:grid-cols-4">
      <input aria-label="Search tours" className={inputClass} defaultValue={query.q} name="q" placeholder="Search tours" />
      <select aria-label="City filter" className={inputClass} defaultValue={query.city} name="city"><option value="">All cities</option>{citySlugs.map((slug) => <option key={slug}>{slug}</option>)}</select>
      <select aria-label="Publication filter" className={inputClass} defaultValue={query.status} name="status"><option value="">All publication states</option><option>draft</option><option>in_review</option><option>approved</option><option>published</option><option>archived</option></select>
      <button className="button-secondary min-h-11 px-4" type="submit">Filter</button>
    </form>
    {tours.length === 0 ? <EmptyContent>No matching curated tours.</EmptyContent> : <ContentTable>
      <TableHead><HeaderCell>Tour</HeaderCell><HeaderCell>City</HeaderCell><HeaderCell>Slug</HeaderCell><HeaderCell>Status</HeaderCell><HeaderCell>Stops</HeaderCell><HeaderCell>Duration</HeaderCell><HeaderCell>Action</HeaderCell></TableHead>
      <tbody>{tours.map((tour) => <tr key={tour.id}>
        <Cell><strong>{tour.localizations[0]?.title ?? tour.slug}</strong></Cell><Cell>{tour.city?.slug}</Cell><Cell>{tour.slug}</Cell><Cell><StatusBadge status={tour.publicationStatus} /></Cell><Cell>{tour.stops.length}</Cell><Cell>{tour.estimatedDurationMinutes ? `${tour.estimatedDurationMinutes} min` : "—"}</Cell><Cell><Link className="font-bold text-primary" href={`/admin/tours/${tour.id}`}>Edit</Link></Cell>
      </tr>)}</tbody>
    </ContentTable>}
  </section>;
}

const inputClass = "min-h-11 rounded-xl border border-border bg-white px-3 text-sm";
