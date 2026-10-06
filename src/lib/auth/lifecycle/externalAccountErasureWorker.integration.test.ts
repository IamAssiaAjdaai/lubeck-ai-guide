// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { externalAccountErasureJobs } from "@/db/authSchema";
import { closeDb, getDb } from "@/db/client";
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
        lastError: "temporary provider outage",
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
