// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { externalAccountErasureJobs } from "@/db/authSchema";
import { closeDb, getDb } from "@/db/client";
import { createRevenueCatCustomerEraser } from "@/lib/commerce/revenueCatCustomerErasure.server";
import { createAppleTokenRevocationEraser, sealAppleRevocationToken } from "./appleTokenRevocation.server";
import { processExternalAccountErasureJobs } from "./externalAccountErasureWorker.server";

describe.runIf(process.env.LIFECYCLE_DB_INTEGRATION === "1")(
  "external account erasure worker",
  () => {
    beforeAll(() => {
      const target = new URL(process.env.DATABASE_URL!);
      if (target.hostname !== "127.0.0.1" || !/^\/cw_lifecycle_\d+$/.test(target.pathname)) {
        throw new Error("Disposable loopback database required");
      }
    });

    beforeEach(async () => {
      await getDb().delete(externalAccountErasureJobs);
    });

    afterAll(async () => {
      await closeDb();
    });

    it("leaves unconfigured and unknown-provider history untouched without starving configured jobs", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values([
        { provider: "apple", externalCustomerId: "historical-encrypted-envelope", attempts: 8, lastError: "historical-error-preserved", nextAttemptAt: new Date(0) },
        { provider: "unknown-provider", externalCustomerId: "historical-unknown", nextAttemptAt: new Date(0) },
      ]);
      const historical = await getDb().select().from(externalAccountErasureJobs);
      await getDb().insert(externalAccountErasureJobs).values({ provider: "revenuecat", externalCustomerId: "ready-customer", nextAttemptAt: now });
      const erase = vi.fn().mockResolvedValue("erased");
      expect(await processExternalAccountErasureJobs({ erasers: [{ provider: "revenuecat", erase }], batchSize: 1, now: () => now }))
        .toEqual({ claimed: 1, completed: 1, failed: 0, lostLeases: 0 });
      expect(erase).toHaveBeenCalledWith({ userId: "ready-customer" });
      const after = await getDb().select().from(externalAccountErasureJobs);
      expect(after.filter(row => row.provider !== "revenuecat")).toEqual(historical);
    });

    it("does not touch pending rows with an empty provider list", async () => {
      await getDb().insert(externalAccountErasureJobs).values({ provider: "revenuecat", externalCustomerId: "untouched" });
      const before = await getDb().select().from(externalAccountErasureJobs);
      expect(await processExternalAccountErasureJobs({ erasers: [] })).toEqual({ claimed: 0, completed: 0, failed: 0, lostLeases: 0 });
      expect(await getDb().select().from(externalAccountErasureJobs)).toEqual(before);
    });

    it("revokes Apple tokens with a mock transport while RevenueCat fails and later retries to not-found", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      const secret = "synthetic-envelope-key-at-least-32-characters";
      const token = "synthetic-sensitive-apple-token";
      const envelope = sealAppleRevocationToken({ token, tokenTypeHint: "refresh_token" }, secret);
      await getDb().insert(externalAccountErasureJobs).values([
        { provider: "revenuecat", externalCustomerId: "synthetic-customer", nextAttemptAt: now },
        { provider: "apple", externalCustomerId: envelope, nextAttemptAt: now },
      ]);
      const rcFetch = vi.fn().mockResolvedValueOnce(new Response("private-provider-body", { status: 503 })).mockResolvedValue(new Response(null, { status: 404 }));
      const appleFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const erasers = [
        createRevenueCatCustomerEraser({ apiKey: "synthetic-api-secret", fetchImpl: rcFetch }),
        createAppleTokenRevocationEraser({ secret, fetchImpl: appleFetch, getProvider: async () => ({ clientId: "synthetic", clientSecret: "synthetic-jwt" }) }),
      ];
      expect(await processExternalAccountErasureJobs({ erasers, batchSize: 2, now: () => now })).toEqual({ claimed: 2, completed: 1, failed: 1, lostLeases: 0 });
      expect(appleFetch.mock.calls[0][1].body.get("token")).toBe(token);
      const rows = await getDb().select().from(externalAccountErasureJobs);
      expect(rows.find(row => row.provider === "apple")).toMatchObject({ completedAt: now, externalCustomerId: envelope });
      expect(rows.find(row => row.provider === "revenuecat")).toMatchObject({ completedAt: null, attempts: 1, lastError: "REQUEST_FAILED", nextAttemptAt: new Date(now.getTime() + 60000) });
      expect(JSON.stringify(rows)).not.toMatch(/private-provider-body|synthetic-sensitive-apple-token|synthetic-api-secret|synthetic-jwt/);
      expect(await processExternalAccountErasureJobs({ erasers, now: () => new Date(now.getTime() + 60000) })).toEqual({ claimed: 1, completed: 1, failed: 0, lostLeases: 0 });
      expect(appleFetch).toHaveBeenCalledOnce();
      expect(rcFetch).toHaveBeenCalledTimes(2);
    });

    it("retains invalid Apple payloads for recovery and never sends them to a provider", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values({ provider: "apple", externalCustomerId: "invalid-historical-payload", nextAttemptAt: now });
      const fetchImpl = vi.fn();
      const eraser = createAppleTokenRevocationEraser({ secret: "synthetic-secret", fetchImpl, getProvider: async () => ({ clientId: "synthetic", clientSecret: "synthetic" }) });
      expect(await processExternalAccountErasureJobs({ erasers: [eraser], now: () => now })).toEqual({ claimed: 1, completed: 0, failed: 1, lostLeases: 0 });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect((await getDb().select().from(externalAccountErasureJobs))[0]).toMatchObject({ externalCustomerId: "invalid-historical-payload", completedAt: null, attempts: 1, lastError: "INVALID_PAYLOAD" });
    });

    it("caps retries at one hour without retrying early or storing arbitrary exceptions", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values({ provider: "revenuecat", externalCustomerId: "retry-cap", attempts: 12, nextAttemptAt: now });
      const erase = vi.fn().mockRejectedValue({ code: "private-secret", message: "user@example token-secret", toString: () => { throw new Error("must not stringify"); } });
      await processExternalAccountErasureJobs({ erasers: [{ provider: "revenuecat", erase }], now: () => now });
      expect((await getDb().select().from(externalAccountErasureJobs))[0]).toMatchObject({ completedAt: null, attempts: 13, lastError: "ERASURE_FAILED", nextAttemptAt: new Date(now.getTime() + 3600000) });
      expect(await processExternalAccountErasureJobs({ erasers: [{ provider: "revenuecat", erase }], now: () => new Date(now.getTime() + 3599999) })).toMatchObject({ claimed: 0 });
      expect(erase).toHaveBeenCalledOnce();
    });

    it("reclaims an abandoned expired lease but leaves a live lease alone", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values([
        { provider: "revenuecat", externalCustomerId: "active-lease", nextAttemptAt: now, leaseExpiresAt: new Date(now.getTime() + 1000) },
        { provider: "revenuecat", externalCustomerId: "expired-lease", nextAttemptAt: now, leaseExpiresAt: new Date(now.getTime() - 1) },
      ]);
      const erase = vi.fn().mockResolvedValue("erased");
      expect(await processExternalAccountErasureJobs({ erasers: [{ provider: "revenuecat", erase }], now: () => now })).toMatchObject({ claimed: 1, completed: 1 });
      expect(erase).toHaveBeenCalledWith({ userId: "expired-lease" });
      expect((await getDb().select().from(externalAccountErasureJobs)).find(row => row.externalCustomerId === "active-lease")).toMatchObject({ completedAt: null, attempts: 0 });
    });

    it.each([false, true])("fences a stale worker after lease ownership changes (failure=%s)", async failure => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      const replacement = new Date(now.getTime() + 600000);
      const [job] = await getDb().insert(externalAccountErasureJobs).values({ provider: "revenuecat", externalCustomerId: "lease-fence", nextAttemptAt: now }).returning();
      const erase = vi.fn(async () => {
        await getDb().update(externalAccountErasureJobs).set({ leaseExpiresAt: replacement }).where(eq(externalAccountErasureJobs.id, job.id));
        if (failure) throw new Error("sensitive-provider-error");
        return "erased" as const;
      });
      expect(await processExternalAccountErasureJobs({ erasers: [{ provider: "revenuecat", erase }], batchSize: 1, now: () => now })).toEqual({ claimed: 1, completed: 0, failed: 0, lostLeases: 1 });
      expect((await getDb().select().from(externalAccountErasureJobs))[0]).toMatchObject({ leaseExpiresAt: replacement, attempts: 0, completedAt: null, lastError: null });
    });

    it("does not mark an unrecognized provider outcome complete", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values({ provider: "revenuecat", externalCustomerId: "invalid-outcome", nextAttemptAt: now });
      const erase = vi.fn().mockResolvedValue(undefined);
      expect(await processExternalAccountErasureJobs({ erasers: [{ provider: "revenuecat", erase }], now: () => now })).toMatchObject({ failed: 1, completed: 0 });
      expect((await getDb().select().from(externalAccountErasureJobs))[0]).toMatchObject({ completedAt: null, attempts: 1, lastError: "ERASURE_FAILED" });
    });

    it("completes a claimed erasure job exactly once", async () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values({
        provider: "revenuecat",
        externalCustomerId: "worker-success",
        nextAttemptAt: now,
      });
      const erase = vi.fn().mockResolvedValue("erased" as const);

      const [first, second] = await Promise.all([
        processExternalAccountErasureJobs({
          erasers: [{ provider: "revenuecat", erase }],
          batchSize: 1,
          now: () => now,
        }),
        processExternalAccountErasureJobs({
          erasers: [{ provider: "revenuecat", erase }],
          batchSize: 1,
          now: () => now,
        }),
      ]);

      expect(first.claimed + second.claimed).toBe(1);
      expect(first.completed + second.completed).toBe(1);
      expect(erase).toHaveBeenCalledTimes(1);
      const [row] = await getDb()
        .select()
        .from(externalAccountErasureJobs)
        .where(eq(externalAccountErasureJobs.externalCustomerId, "worker-success"));
      expect(row).toMatchObject({ attempts: 0, leaseExpiresAt: null, lastError: null });
      expect(row.completedAt?.toISOString()).toBe(now.toISOString());
    });

    it("releases failed jobs with exponential retry timing", async () => {
      const now = new Date("2026-10-06T13:00:00.000Z");
      await getDb().insert(externalAccountErasureJobs).values({
        provider: "revenuecat",
        externalCustomerId: "worker-retry",
        nextAttemptAt: now,
      });
      const erase = vi.fn().mockRejectedValue(new Error("temporary provider outage"));

      await expect(processExternalAccountErasureJobs({
        erasers: [{ provider: "revenuecat", erase }],
        batchSize: 1,
        now: () => now,
      })).resolves.toEqual({ claimed: 1, completed: 0, failed: 1, lostLeases: 0 });

      const [row] = await getDb()
        .select()
        .from(externalAccountErasureJobs)
        .where(eq(externalAccountErasureJobs.externalCustomerId, "worker-retry"));
      expect(row).toMatchObject({
        attempts: 1,
        leaseExpiresAt: null,
        completedAt: null,
        lastError: "ERASURE_FAILED",
      });
      expect(row.nextAttemptAt.toISOString()).toBe("2026-10-06T13:01:00.000Z");

      await expect(processExternalAccountErasureJobs({
        erasers: [{ provider: "revenuecat", erase }],
        batchSize: 1,
        now: () => now,
      })).resolves.toEqual({ claimed: 0, completed: 0, failed: 0, lostLeases: 0 });
      expect(erase).toHaveBeenCalledTimes(1);
    });
  },
);
