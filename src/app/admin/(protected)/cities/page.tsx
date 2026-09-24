import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, Cell, ContentTable, EmptyContent, HeaderCell, StatusBadge, TableHead } from "@/components/admin/AdminContentUi";
import { listAuthorizedCities } from "@/lib/admin/content/service.server";

export default async function CitiesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const cities = await listAuthorizedCities();
  return <section>
    <AdminPageHeader actionHref="/admin/cities/new" actionLabel="New city" description="Manage city identity, authored localizations, and publication." eyebrow="Content" title="Cities" />
    <AdminNotice error={error} />
    {cities.length === 0 ? <EmptyContent>No cities are available in your staff scope.</EmptyContent> : <ContentTable>
      <TableHead><HeaderCell>City</HeaderCell><HeaderCell>Slug</HeaderCell><HeaderCell>Status</HeaderCell><HeaderCell>Places</HeaderCell><HeaderCell>Tours</HeaderCell><HeaderCell>Action</HeaderCell></TableHead>
      <tbody>{cities.map((city) => <tr key={city.id}>
        <Cell><strong>{city.localizations[0]?.name ?? city.name}</strong><span className="mt-1 block text-xs text-text-secondary">{city.localizations.length} authored locale(s)</span></Cell>
        <Cell>{city.slug}</Cell><Cell><StatusBadge status={city.publicationStatus} /></Cell><Cell>{city.placeCount}</Cell><Cell>{city.tourCount}</Cell><Cell><Link className="font-bold text-primary" href={`/admin/cities/${city.id}`}>Edit</Link></Cell>
      </tr>)}</tbody>
    </ContentTable>}
  </section>;
}
