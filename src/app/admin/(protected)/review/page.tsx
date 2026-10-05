import Link from "next/link";

import {
  AdminPageHeader,
  Cell,
  ContentTable,
  EmptyContent,
  HeaderCell,
  StatusBadge,
  TableHead,
} from "@/components/admin/AdminContentUi";
import { requireAdminCapability } from "@/lib/admin/authorization.server";
import {
  listAuthorizedCities,
  listAuthorizedPlaces,
  listAuthorizedTours,
} from "@/lib/admin/content/service.server";
import { listMarketingReviewQueue } from "@/lib/admin/marketing/workflow.server";

export const metadata = { title: "Review queue | CITYWALK Control Center" };

export default async function ReviewQueuePage() {
  await requireAdminCapability("publishing:review");
  const [cities, places, tours, marketingItems] = await Promise.all([
    listAuthorizedCities(),
    listAuthorizedPlaces(),
    listAuthorizedTours(),
    listMarketingReviewQueue(),
  ]);

  const reviewCities = cities.filter(
    ({ publicationStatus }) => publicationStatus === "in_review",
  );
  const reviewPlaces = places.filter(
    ({ publicationStatus }) => publicationStatus === "in_review",
  );
  const reviewTours = tours.filter(
    ({ publicationStatus }) => publicationStatus === "in_review",
  );
  const itemCount =
    reviewCities.length +
    reviewPlaces.length +
    reviewTours.length +
    marketingItems.length;

  return (
    <section>
      <AdminPageHeader
        description="One queue for editorial content and Marketing drafts that are ready for a review decision."
        eyebrow="Publishing"
        title="Review queue"
      />
      <p className="mt-4 text-sm text-text-secondary">
        {itemCount} item{itemCount === 1 ? "" : "s"} waiting for review.
      </p>

      {itemCount === 0 ? (
        <EmptyContent>Nothing is waiting for review.</EmptyContent>
      ) : (
        <ContentTable>
          <TableHead>
            <HeaderCell>Type</HeaderCell>
            <HeaderCell>Content</HeaderCell>
            <HeaderCell>City</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Action</HeaderCell>
          </TableHead>
          <tbody>
            {reviewCities.map((city) => (
              <tr key={`city-${city.id}`}>
                <Cell>City</Cell>
                <Cell>
                  <strong>{city.localizations[0]?.name ?? city.name}</strong>
                </Cell>
                <Cell>{city.slug}</Cell>
                <Cell>
                  <StatusBadge status={city.publicationStatus} />
                </Cell>
                <Cell>
                  <Link
                    className="font-bold text-primary"
                    href={`/admin/cities/${city.id}`}
                  >
                    Review
                  </Link>
                </Cell>
              </tr>
            ))}
            {reviewPlaces.map((place) => (
              <tr key={`place-${place.id}`}>
                <Cell>Place</Cell>
                <Cell>
                  <strong>{place.localizations[0]?.name ?? place.slug}</strong>
                </Cell>
                <Cell>{place.city?.slug ?? "—"}</Cell>
                <Cell>
                  <StatusBadge status={place.publicationStatus} />
                </Cell>
                <Cell>
                  <Link
                    className="font-bold text-primary"
                    href={`/admin/places/${place.id}`}
                  >
                    Review
                  </Link>
                </Cell>
              </tr>
            ))}
            {reviewTours.map((tour) => (
              <tr key={`tour-${tour.id}`}>
                <Cell>Tour</Cell>
                <Cell>
                  <strong>{tour.localizations[0]?.title ?? tour.slug}</strong>
                </Cell>
                <Cell>{tour.city?.slug ?? "—"}</Cell>
                <Cell>
                  <StatusBadge status={tour.publicationStatus} />
                </Cell>
                <Cell>
                  <Link
                    className="font-bold text-primary"
                    href={`/admin/tours/${tour.id}`}
                  >
                    Review
                  </Link>
                </Cell>
              </tr>
            ))}
            {marketingItems.map((item) => (
              <tr key={`marketing-${item.type}-${item.id}`}>
                <Cell>{item.type}</Cell>
                <Cell>
                  <strong>{item.title}</strong>
                </Cell>
                <Cell>{item.cityName}</Cell>
                <Cell>
                  <StatusBadge status={item.status} />
                </Cell>
                <Cell>
                  <Link className="font-bold text-primary" href={item.href}>
                    Review
                  </Link>
                </Cell>
              </tr>
            ))}
          </tbody>
        </ContentTable>
      )}
    </section>
  );
}
