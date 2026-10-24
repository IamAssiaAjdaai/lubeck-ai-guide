// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { configuration } from "./config";
import { ProjectStore } from "./store";
import { PackService } from "./packs";
import { createPackProvider, type PackProvider } from "./pack.provider";
const enabled = !!process.env.MARKETING_TEST_DATABASE_URL;
const cfg = enabled
  ? configuration({
      ...process.env,
      MARKETING_DATABASE_URL: process.env.MARKETING_TEST_DATABASE_URL,
      MARKETING_AUTH_SECRET: "synthetic-integration-secret-over-32-characters",
    })
  : null;
const pool = cfg
  ? new Pool({ connectionString: cfg.databaseUrl, max: 12 })
  : null;
async function fixture(confirmed = true) {
  const actor = { id: randomUUID() };
  await pool!.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [actor.id, "QA User", `pack-${actor.id}@example.test`],
  );
  const store = new ProjectStore(pool!);
  const project = await store.create(actor, "Glanz Pack QA");
  const context = await store.revise(actor, project.id, 0, {
    rawText: "Synthetic QA",
    identity: { name: "Glanz Pack QA" },
    facts: [
      { id: "office", statement: "Wir reinigen Büros in Düsseldorf." },
      { id: "unknown", statement: "Nicht bestätigte Fantasiepreise." },
    ],
  });
  if (confirmed) await store.confirm(actor, project.id, 1, ["office"]);
  const command = {
    expectedRevision: confirmed ? 2 : context.revision,
    goal: "mehr_anfragen",
    audience: "Büroleitungen in Düsseldorf",
    language: "de-DE",
    channels: ["linkedin"],
    idempotencyKey: randomUUID(),
  };
  return { actor, project, command };
}
function provider() {
  const p = createPackProvider(true);
  const generate = vi.fn(p.generate);
  return { p: { ...p, generate }, generate };
}
afterAll(async () => {
  await pool?.end();
});
describe.skipIf(!enabled)(
  "pack persistence, quota accounting and cross-tenant guards",
  () => {
    it("refuses unconfirmed facts before invoking provider", async () => {
      const f = await fixture(false),
        p = provider(),
        s = new PackService(pool!, true, () => p.p);
      await expect(
        s.generate(f.actor, f.project.id, f.command),
      ).rejects.toMatchObject({ code: "CONFIRMED_FACTS_REQUIRED" });
      expect(p.generate).not.toHaveBeenCalled();
      expect((await s.usage(f.actor, f.project.id)).used).toBe(0);
    });
    it("generates grounded copy, saves human versions and exports only authorized projects", async () => {
      const f = await fixture(),
        foreign = await fixture(),
        p = provider(),
        s = new PackService(pool!, true, () => p.p);
      const pack = await s.generate(f.actor, f.project.id, f.command);
      expect(pack.status).toBe("completed");
      expect(pack.versions[0].content.days).toHaveLength(7);
      expect(pack.versions[0].content.posts).toHaveLength(3);
      expect(JSON.stringify(pack.versions[0].content)).not.toContain(
        "Fantasiepreise",
      );
      expect(p.generate.mock.calls[0][0].facts.map((v) => v.id)).toEqual([
        "office",
      ]);
      expect((await s.generate(f.actor, f.project.id, f.command)).id).toBe(
        pack.id,
      );
      expect(p.generate).toHaveBeenCalledTimes(1);
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
      await expect(
        s.generate(f.actor, f.project.id, {
          ...f.command,
          audience: "Changed",
        }),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      const edited = await s.edit(f.actor, f.project.id, pack.id, {
        expectedVersion: 1,
        posts: ["Manuell A", "Manuell B", "Manuell C"],
        hooks: ["A", "B", "C"],
        cta: "Schreib uns.",
      });
      expect(edited.versions).toHaveLength(2);
      expect(edited.versions[0].content.editorialStatus).toBe("human_edited");
      await expect(
        s.edit(f.actor, f.project.id, pack.id, {
          expectedVersion: 1,
          posts: ["A", "B", "C"],
          hooks: ["A", "B", "C"],
          cta: "A",
        }),
      ).rejects.toMatchObject({ code: "STALE_VERSION" });
      const exported = await s.export(f.actor, f.project.id, pack.id, 2);
      expect(exported.markdown).toContain("Manuell A");
      expect(exported.markdown).toContain("DEMO");
      expect(exported.markdown).toContain("office");
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
      for (const fn of [
        () => s.read(foreign.actor, f.project.id, pack.id),
        () => s.generate(foreign.actor, f.project.id, foreign.command),
        () => s.export(foreign.actor, f.project.id, pack.id, 2),
        () =>
          s.edit(foreign.actor, f.project.id, pack.id, {
            expectedVersion: 2,
            posts: ["A", "B", "C"],
            hooks: ["A", "B", "C"],
            cta: "A",
          }),
      ])
        await expect(fn()).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    });
    it("atomically admits one provider call for simultaneous identical requests", async () => {
      const f = await fixture(),
        p = provider();
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      const started = vi.fn(
        async (input: Parameters<PackProvider["generate"]>[0]) => {
          await gate;
          return p.p.generate(input);
        },
      );
      const s = new PackService(pool!, true, () => ({
        ...p.p,
        generate: started,
      }));
      const first = s.generate(f.actor, f.project.id, f.command);
      await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(1));
      const second = await s.generate(f.actor, f.project.id, f.command);
      expect(second.status).toBe("running");
      release();
      expect((await first).id).toBe(second.id);
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
    });
    it("enforces hard monthly allocation under concurrent requests", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, true, () => p.p);
      for (let i = 0; i < 3; i++)
        await s.generate(f.actor, f.project.id, {
          ...f.command,
          idempotencyKey: randomUUID(),
        });
      const results = await Promise.allSettled(
        [1, 2, 3, 4].map(() =>
          s.generate(f.actor, f.project.id, {
            ...f.command,
            idempotencyKey: randomUUID(),
          }),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(p.generate).toHaveBeenCalledTimes(4);
      expect((await s.usage(f.actor, f.project.id)).remaining).toBe(0);
    });
    it("retains failed-attempt reservations and blocks cost exhaustion", async () => {
      const f = await fixture(),
        p = provider(),
        generate = vi.fn(async () => {
          throw new Error("Synthetic provider timeout");
        }),
        s = new PackService(pool!, false, () => ({
          ...p.p,
          name: "test",
          inputRate: 2,
          outputRate: 3,
          generate,
        }));
      const result = await s.generate(f.actor, f.project.id, f.command);
      expect(result.status).toBe("failed");
      expect(result.cost_kind).toBe("reserved_estimate");
      expect(Number(result.cost_micro_eur)).toBeGreaterThan(0);
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
      await pool!.query(
        "UPDATE mkt_usage_month SET cost_micro_eur=4999999 WHERE organization_id=$1",
        [f.project.organization_id],
      );
      try {
        await expect(
          s.generate(f.actor, f.project.id, {
            ...f.command,
            idempotencyKey: randomUUID(),
          }),
        ).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
        expect(generate).toHaveBeenCalledTimes(1);
      } finally {
        await pool!.query(
          "UPDATE mkt_usage_month SET cost_micro_eur=$2 WHERE organization_id=$1",
          [f.project.organization_id, result.cost_micro_eur],
        );
      }
    });
    it("blocks user rate limits and global cost ceiling before provider calls", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, true, () => p.p);
      await pool!.query(
        "UPDATE mkt_organizations SET plan='growth' WHERE id=$1",
        [f.project.organization_id],
      );
      for (let i = 0; i < 6; i++)
        await s.generate(f.actor, f.project.id, {
          ...f.command,
          idempotencyKey: randomUUID(),
        });
      await expect(
        s.generate(f.actor, f.project.id, {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "RATE_LIMITED" });
      expect(p.generate).toHaveBeenCalledTimes(6);
      const other = await fixture();
      const capped = new PackService(
        pool!,
        false,
        () => ({ ...p.p, inputRate: 1, outputRate: 1 }),
        0,
      );
      await expect(
        capped.generate(other.actor, other.project.id, other.command),
      ).rejects.toMatchObject({ code: "GLOBAL_BUDGET_EXHAUSTED" });
      expect(p.generate).toHaveBeenCalledTimes(6);
    });
    it("rejects unsupported provider fields and keeps charge accounting", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, true, () => ({
          ...p.p,
          async generate(input) {
            const result = await p.p.generate(input);
            return {
              ...result,
              selection: {
                ...(result.selection as object),
                inventedClaim: "Guaranteed 50% growth",
              },
            };
          },
        }));
      const result = await s.generate(f.actor, f.project.id, f.command);
      expect(result.status).toBe("failed");
      expect(result.versions).toEqual([]);
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
    });
  },
);
