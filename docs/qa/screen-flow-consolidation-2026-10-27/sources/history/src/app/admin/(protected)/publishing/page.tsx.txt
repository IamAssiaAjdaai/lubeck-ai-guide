import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader, Cell, ContentTable, EmptyContent, HeaderCell, StatusBadge, TableHead } from "@/components/admin/AdminContentUi";
import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import { listAuthorizedPublishingQueue, type PublishingEntity } from "@/lib/admin/content/publishingQueue.server";

const sections: Record<PublishingEntity, string> = { city: "cities", place: "places", tour: "tours" };

export default async function PublishingPage() {
  const queue = await listAuthorizedPublishingQueue().catch(error => {
    if (error instanceof AdminAuthorizationError) {
      redirect(error.status === 401 ? "/admin/login" : "/admin/unauthorized?reason=capability");
    }
    throw error;
  });

  return <section>
    <AdminPageHeader eyebrow="Editorial review" title="Publishing" description="Review unpublished cities, places and tours in your assigned cities, oldest update first. Open each record to check its content and use the existing publication workflow. A draft may still have a published place revision available to travelers." />
    <p className="mt-4 text-sm text-text-secondary">Draft, waiting-for-review and approved content appears here. Source, translation, media and publication checks still apply before publishing.</p>
    {queue.items.length === 0 ? <EmptyContent>No unpublished content to review in your assigned cities.</EmptyContent> : <ContentTable>
      <TableHead><HeaderCell>Content</HeaderCell><HeaderCell>Type</HeaderCell><HeaderCell>City</HeaderCell><HeaderCell>Status</HeaderCell><HeaderCell>Last updated</HeaderCell><HeaderCell>Review</HeaderCell></TableHead>
      <tbody>{queue.items.map(item => <tr key={`${item.entity}:${item.id}`}>
        <Cell>{item.slug}</Cell><Cell>{item.entity}</Cell><Cell>{item.cityName}</Cell><Cell><StatusBadge status={item.publicationStatus} /></Cell>
        <Cell><time dateTime={item.updatedAt.toISOString()}>{item.updatedAt.toISOString().slice(0, 10)}</time></Cell>
        <Cell><Link className="font-bold text-primary underline underline-offset-4" href={`/admin/${sections[item.entity]}/${item.id}`}>Review {item.slug}</Link></Cell>
      </tr>)}</tbody>
    </ContentTable>}
    {queue.hasMore ? <p className="mt-4 text-sm text-text-secondary">Showing the 100 oldest records. Additional records will appear as these are published or archived. You can also open the city workspace to review its content.</p> : null}
  </section>;
}
