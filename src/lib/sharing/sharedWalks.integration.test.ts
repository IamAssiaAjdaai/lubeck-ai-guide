// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";

vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth/server", () => ({
  getAuth: () => ({
    api: {
      getSession: async () => auth.userId
        ? { user: { id: auth.userId } } : null,
    },
  }),
}));

import { getDb, closeDb } from "@/db/client";
import { user } from "@/db/authSchema";
import { sharedWalkLinks } from "@/db/travelerSchema";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { POST } from "@/app/api/shared-walks/route";
import { GET } from "@/app/api/shared-walks/[id]/route";

const ownerId = randomUUID();
const otherId = randomUUID();
const privateOrigin = { lat: 51.111111, lng: 7.222222 };
const privateFinish = { lat: 51.333333, lng: 7.444444 };
const route = {
  citySlug: "lubeck",
  stopSlugs: ["holstentor"],
  settings: {
    minutes: 90,
    start: privateOrigin,
    walking: "balanced",
    interests: ["history"],
    deadline: 1790000000000,
    finish: privateFinish,
  },
  finish: privateFinish,
  ownerId: otherId,
  visited: ["secret-progress"],
  historyDistance: 99999,
};

const api = "https://preview.example.test/api/shared-walks";
const post = (body: unknown = route, expectedOwner = auth.userId, headers: Record<string, string> = {}) =>
  POST(new Request(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Citywalk-Account": expectedOwner,
      ...headers,
    },
    body: JSON.stringify(body),
  }));
const get = (id: string) => GET(
  new Request(api + "/" + id),
  { params: Promise.resolve({ id }) },
);

describe.runIf(process.env.SHARED_WALK_DB_INTEGRATION === "1")(
  "public share API on an isolated PostgreSQL CI database",
  () => {
    let firstLinkId: string | undefined;

    beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (process.env.GITHUB_ACTIONS !== "true" ||
          !["localhost", "127.0.0.1"].includes(url.hostname) ||
          url.port !== "5432" || url.pathname !== "/citywalk") {
        throw new Error("Only disposable CI PostgreSQL is allowed");
      }
      await getDb().insert(user).values([
        { id: ownerId, name: "Sharing owner", email: ownerId + "@example.test" },
        { id: otherId, name: "Other account", email: otherId + "@example.test" },
      ]);
    });
    afterEach(() => { auth.userId = ""; });
    afterAll(async () => {
      await getDb().delete(sharedWalkLinks).where(eq(sharedWalkLinks.ownerId, ownerId));
      await getDb().delete(user).where(eq(user.id, ownerId));
      await getDb().delete(user).where(eq(user.id, otherId));
      await closeDb();
    });

    it("requires a valid session and matching owner header", async () => {
      expect((await post()).status).toBe(401);
      auth.userId = ownerId;
      expect((await post(route, otherId)).status).toBe(401);
    });

    it("creates a public replayable route, canonicalizing private start/finish on the server", async () => {
      auth.userId = ownerId;
      const created = await post();
      expect(created.status).toBe(201);
      expect(created.headers.get("Cache-Control")).toBe("no-store");
      const json = await created.json();
      expect(json.id).toMatch(/^[0-9a-f-]{36}$/i);
      firstLinkId = json.id;

      auth.userId = "";
      const publicResponse = await get(json.id);
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.headers.get("Cache-Control")).toBe("no-store");
      const publicBody = await publicResponse.json();
      expect(publicBody.version).toBe(1);
      expect(publicBody.route.citySlug).toBe("lubeck");
      expect(publicBody.route.stopSlugs).toEqual(["holstentor"]);
      const snapshot = await getPublicCitySnapshot("lubeck");
      const landmark = snapshot.places.find(place => place.slug === "holstentor");
      expect(landmark).toBeDefined();
      expect(publicBody.route.settings.start).toEqual(landmark?.coordinates);
      expect(publicBody.route.finish).toBeUndefined();
      expect(publicBody.route.settings.finish).toBeUndefined();
      const serialized = JSON.stringify(publicBody);
      for (const secret of [
        ownerId, otherId, "51.111111", "7.222222", "51.333333", "7.444444",
        "secret-progress", "historyDistance", "visited", "deadline",
      ]) expect(serialized).not.toContain(secret);
    });

    it("rejects invalid, cross-site and unpublished routes without inserting data", async () => {
      auth.userId = ownerId;
      const countBefore = (await getDb().select({ id: sharedWalkLinks.id })
        .from(sharedWalkLinks).where(eq(sharedWalkLinks.ownerId, ownerId))).length;
      expect((await post({ ...route, stopSlugs: ["not-published-here"] })).status).toBe(400);
      expect((await post(route, ownerId, { Origin: "https://evil.example" })).status).toBe(403);
      expect((await post(route, ownerId, { "Sec-Fetch-Site": "cross-site" })).status).toBe(403);
      const countAfter = (await getDb().select({ id: sharedWalkLinks.id })
        .from(sharedWalkLinks).where(eq(sharedWalkLinks.ownerId, ownerId))).length;
      expect(countAfter).toBe(countBefore);
    });

    it("refuses unknown or revoked links for anonymous readers", async () => {
      expect((await get(randomUUID())).status).toBe(404);
      expect(firstLinkId).toBeDefined();
      await getDb().update(sharedWalkLinks)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(sharedWalkLinks.id, firstLinkId!),
          eq(sharedWalkLinks.ownerId, ownerId),
        ));
      expect((await get(firstLinkId!)).status).toBe(404);
    });
  },
);
