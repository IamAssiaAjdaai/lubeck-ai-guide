import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, Cell, ContentTable, EmptyContent, HeaderCell, StatusBadge, TableHead } from "@/components/admin/AdminContentUi";
import { listAuthorizedPlaces } from "@/lib/admin/content/service.server";

export default async function PlacesPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; category?: string; status?: string; city?: string }> }) {
  const query = await searchParams;
  const authorizedPlaces = await listAuthorizedPlaces();
  const places = authorizedPlaces.filter((place) =>
    (!query.q || `${place.slug} ${place.localizations.map(({ name }) => name).join(" ")}`.toLowerCase().includes(query.q.toLowerCase())) &&
    (!query.category || place.category === query.category) &&
    (!query.status || place.publicationStatus === query.status) &&
    (!query.city || place.city?.slug === query.city));
  const citySlugs = [...new Set(
    authorizedPlaces.flatMap(({ city }) => city ? [city.slug] : []),
  )].sort();
  return <section>
    <AdminPageHeader actionHref="/admin/places/new" actionLabel="New place" description="Search and manage place metadata, authored content, operational status, and normalized tags." eyebrow="Content" title="Places" />
    <AdminNotice error={query.error} />
    <form className="surface-card mt-6 grid gap-3 p-4 sm:grid-cols-5">
      <input aria-label="Search places" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.q} name="q" placeholder="Search" />
      <select aria-label="City filter" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.city} name="city"><option value="">All cities</option>{citySlugs.map((slug) => <option key={slug}>{slug}</option>)}</select>
      <select aria-label="Category filter" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.category} name="category"><option value="">All categories</option><option>see</option><option>eat</option><option>fun</option></select>
      <select aria-label="Publication filter" className="min-h-11 rounded-xl border border-border px-3" defaultValue={query.status} name="status"><option value="">All publication states</option><option>draft</option><option>published</option><option>archived</option></select>
      <button className="button-secondary min-h-11 px-4" type="submit">Filter</button>
    </form>
    {places.length === 0 ? <EmptyContent>No matching places.</EmptyContent> : <ContentTable>
      <TableHead><HeaderCell>Place</HeaderCell><HeaderCell>City</HeaderCell><HeaderCell>Category</HeaderCell><HeaderCell>Publication</HeaderCell><HeaderCell>Operational</HeaderCell><HeaderCell>Tags</HeaderCell><HeaderCell>Action</HeaderCell></TableHead>
      <tbody>{places.map((place) => <tr key={place.id}>
        <Cell><strong>{place.localizations[0]?.name ?? place.slug}</strong><span className="mt-1 block text-xs text-text-secondary">{place.slug}</span></Cell><Cell>{place.city?.slug}</Cell><Cell>{place.category}</Cell><Cell><StatusBadge status={place.publicationStatus} /></Cell><Cell>{place.status ? <StatusBadge status={place.status} /> : "—"}</Cell><Cell>{place.tags.some(({ slug }) => slug === "hidden-gem") ? <strong>Hidden Gem</strong> : place.tags.slice(0, 2).map(({ label }) => label).join(", ")}</Cell><Cell><Link className="font-bold text-primary" href={`/admin/places/${place.id}`}>Edit</Link></Cell>
      </tr>)}</tbody>
    </ContentTable>}
  </section>;
}
