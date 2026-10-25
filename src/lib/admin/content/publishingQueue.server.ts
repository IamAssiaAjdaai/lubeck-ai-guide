import "server-only";

import { and, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { citiesTable, placesTable, toursTable } from "@/db/schema";
import { requireAdminCapability } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability, hasCityCapability } from "@/lib/admin/permissions";

export type PublishingEntity = "city" | "place" | "tour";
export type PublishingQueueItem = {
  entity: PublishingEntity;
  id: number;
  cityId: number;
  slug: string;
  cityName: string;
  updatedAt: Date;
  publicationStatus: "draft" | "in_review" | "approved";
};
export const PUBLISHING_QUEUE_LIMIT = 100;
const capabilities = { city: "cities:view", place: "places:view", tour: "tours:view" } as const;

type QueueScope = Readonly<{ cityIds: readonly number[] | null; entities: readonly PublishingEntity[] }>;

/** Unpublished work is never an assertion that publishing checks passed. */
export function publishingQueuePredicate(
  scope: QueueScope,
  entity: PublishingEntity,
  cityColumn: AnyPgColumn,
  statusColumn: AnyPgColumn,
): SQL {
  if (!scope.entities.includes(entity) || scope.cityIds?.length === 0) return sql`false`;
  return and(
    inArray(statusColumn, ["draft", "in_review", "approved"]),
    scope.cityIds === null ? undefined : inArray(cityColumn, [...scope.cityIds]),
  )!;
}

export async function listPublishingCandidates(scope: QueueScope): Promise<PublishingQueueItem[]> {
  if (scope.entities.length === 0 || scope.cityIds?.length === 0) return [];
  const cityPredicate = publishingQueuePredicate(scope, "city", citiesTable.id, citiesTable.publicationStatus);
  const placePredicate = publishingQueuePredicate(scope, "place", placesTable.cityId, placesTable.publicationStatus);
  const tourPredicate = publishingQueuePredicate(scope, "tour", toursTable.cityId, toursTable.publicationStatus);
  const result = await getDb().execute<PublishingQueueItem>(sql`
    select 'city' as entity, id, id as "cityId", slug, name as "cityName", updated_at as "updatedAt", publication_status as "publicationStatus"
    from ${citiesTable} where ${cityPredicate}
    union all
    select 'place' as entity, places.id, places.city_id as "cityId", places.slug, cities.name as "cityName", places.updated_at as "updatedAt", places.publication_status as "publicationStatus"
    from ${placesTable} join ${citiesTable} on cities.id = places.city_id
    where ${placePredicate}
    union all
    select 'tour' as entity, tours.id, tours.city_id as "cityId", tours.slug, cities.name as "cityName", tours.updated_at as "updatedAt", tours.publication_status as "publicationStatus"
    from ${toursTable} join ${citiesTable} on cities.id = tours.city_id
    where ${tourPredicate}
    order by "updatedAt" asc, entity asc, id asc
    limit ${PUBLISHING_QUEUE_LIMIT + 1}
  `);
  return result.rows.map(row => ({ ...row, updatedAt: new Date(row.updatedAt) }));
}

export async function listAuthorizedPublishingQueue() {
  const { staff } = await requireAdminCapability("publishing:review");
  const entities = (Object.keys(capabilities) as PublishingEntity[])
    .filter(entity => hasActiveStaffCapability(staff, capabilities[entity]));
  const cityIds = staff.role === "super_admin" || staff.globalAccess ? null : staff.cityIds;
  const rows = await listPublishingCandidates({ cityIds, entities });
  // Defense in depth: never return a row outside the current server-derived scope.
  const authorized = rows.filter(row => entities.includes(row.entity) &&
    hasCityCapability(staff, row.cityId, capabilities[row.entity]));
  return { items: authorized.slice(0, PUBLISHING_QUEUE_LIMIT), hasMore: authorized.length > PUBLISHING_QUEUE_LIMIT };
}
