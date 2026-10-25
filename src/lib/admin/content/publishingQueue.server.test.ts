import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { citiesTable, placesTable } from "@/db/schema";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => ({ execute: mocks.execute }) }));
vi.mock("@/lib/admin/authorization.server", () => ({ requireAdminCapability: mocks.authorize }));
import { listAuthorizedPublishingQueue, publishingQueuePredicate } from "./publishingQueue.server";

const staff = { membershipId: 1, userId: "reviewer", role: "reviewer_publisher", active: true, globalAccess: false, cityIds: [7] };
const row = { entity: "place", id: 10, cityId: 7, slug: "gate", cityName: "Lübeck", updatedAt: new Date(), publicationStatus: "in_review" };
const dialect = new PgDialect();

describe("publishing queue authorization and SQL boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ staff });
    mocks.execute.mockResolvedValue({ rows: [row] });
  });
  it("requires publishing review before any database access", async () => {
    mocks.authorize.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(listAuthorizedPublishingQueue()).rejects.toThrow("FORBIDDEN");
    expect(mocks.authorize).toHaveBeenCalledWith("publishing:review");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("pushes city scope and unpublished lifecycle states into SQL", async () => {
    expect((await listAuthorizedPublishingQueue()).items).toEqual([row]);
    const query = dialect.sqlToQuery(mocks.execute.mock.calls[0][0]);
    expect(query.params.filter((v: unknown) => v === 7)).toHaveLength(3);
    expect(query.params).toContain("in_review");
    expect(query.params).toContain("approved");
    expect(query.params).toContain("draft");
    expect(query.params).not.toContain("published");
    expect(query.params).not.toContain("archived");
    expect(query.params.at(-1)).toBe(101);
  });
  it("returns no other-city rows even if the repository returns one", async () => {
    mocks.execute.mockResolvedValue({ rows: [row, { ...row, cityId: 8, slug: "private" }] });
    expect((await listAuthorizedPublishingQueue()).items).toEqual([row]);
  });
  it("avoids queries for staff without city access", async () => {
    mocks.authorize.mockResolvedValue({ staff: { ...staff, cityIds: [] } });
    expect(await listAuthorizedPublishingQueue()).toEqual({ items: [], hasMore: false });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("supports explicit global staff scope without a city IN restriction", async () => {
    mocks.authorize.mockResolvedValue({ staff: { ...staff, globalAccess: true } });
    await listAuthorizedPublishingQueue();
    const query = dialect.sqlToQuery(mocks.execute.mock.calls[0][0]);
    expect(query.params).not.toContain(7);
  });
  it("fails closed for disallowed entity types and empty city scope", () => {
    for (const scope of [{ cityIds: [7], entities: [] }, { cityIds: [], entities: ["city" as const] }]) {
      expect(dialect.sqlToQuery(publishingQueuePredicate(scope, "city", citiesTable.id, citiesTable.publicationStatus)).sql).toBe("false");
    }
  });
  it("bounds the result and signals additional work", async () => {
    mocks.execute.mockResolvedValue({ rows: Array.from({ length: 101 }, (_, i) => ({ ...row, id: i })) });
    const result = await listAuthorizedPublishingQueue();
    expect(result.items).toHaveLength(100);
    expect(result.hasMore).toBe(true);
  });
  it("qualifies place city and state predicates for joined queries", () => {
    const query = dialect.sqlToQuery(publishingQueuePredicate({ cityIds: [7], entities: ["place"] }, "place", placesTable.cityId, placesTable.publicationStatus));
    expect(query.sql).toContain('"places"."city_id"');
    expect(query.sql).toContain('"places"."publication_status"');
  });
});
