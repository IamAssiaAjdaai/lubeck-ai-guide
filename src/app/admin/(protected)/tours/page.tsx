import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, Cell, ContentTable, EmptyContent, HeaderCell, StatusBadge, TableHead } from "@/components/admin/AdminContentUi";
import { listAuthorizedTours } from "@/lib/admin/content/service.server";

export default async function ToursPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const tours = await listAuthorizedTours();
  return <section>
    <AdminPageHeader actionHref="/admin/tours/new" actionLabel="New tour" description="Manage curated editorial tours. Personalized AI Tour Builder routes remain separate." eyebrow="Content" title="Tours" />
    <AdminNotice error={error} />
    {tours.length === 0 ? <EmptyContent>No curated tours are available in your staff scope.</EmptyContent> : <ContentTable>
      <TableHead><HeaderCell>Tour</HeaderCell><HeaderCell>City</HeaderCell><HeaderCell>Slug</HeaderCell><HeaderCell>Status</HeaderCell><HeaderCell>Stops</HeaderCell><HeaderCell>Duration</HeaderCell><HeaderCell>Action</HeaderCell></TableHead>
      <tbody>{tours.map((tour) => <tr key={tour.id}>
        <Cell><strong>{tour.localizations[0]?.title ?? tour.slug}</strong></Cell><Cell>{tour.city?.slug}</Cell><Cell>{tour.slug}</Cell><Cell><StatusBadge status={tour.publicationStatus} /></Cell><Cell>{tour.stops.length}</Cell><Cell>{tour.estimatedDurationMinutes ? `${tour.estimatedDurationMinutes} min` : "—"}</Cell><Cell><Link className="font-bold text-primary" href={`/admin/tours/${tour.id}`}>Edit</Link></Cell>
      </tr>)}</tbody>
    </ContentTable>}
  </section>;
}
