// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
// Any accidental construction of the real SDK fails before it can capture a transport.
vi.mock("openai", () => ({
  default: class {
    constructor() {
      throw new Error("OFFLINE_REAL_SDK_FORBIDDEN");
    }
  },
}));
import net from "node:net";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { ProjectStore } from "../src/store";
import { PackService } from "../src/packs";
import { createPackProvider, type PackProvider } from "../src/pack.provider";
import { createApi } from "../src/server";
import { createSaasAuth } from "../src/auth";
import { configuration } from "../src/config";
const url = process.env.MARKETING_TEST_DATABASE_URL;
const enabled = !!url;
const pool = enabled ? new Pool({ connectionString: url, max: 12 }) : null;
beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("OFFLINE_FETCH_FORBIDDEN");
    }),
  );
  if (enabled) {
    const u = new URL(url!);
    expect(u.hostname).toBe("127.0.0.1");
    expect(u.port).not.toBe("5432");
    expect(u.pathname).toMatch(/^\/marketing_[a-z0-9_]+$/);
    const connect = net.Socket.prototype.connect;
    vi.spyOn(net.Socket.prototype, "connect").mockImplementation(function (
      this: net.Socket,
      ...args: unknown[]
    ) {
      const options =
        typeof args[0] === "object"
          ? (args[0] as { port?: number; host?: string })
          : { port: args[0], host: args[1] };
      if (Number(options.port) !== Number(u.port) || options.host !== "127.0.0.1")
        throw new Error("OFFLINE_ONLY_LOCAL_QA_DB_ALLOWED");
      return Reflect.apply(connect, this, args);
    });
  }
});
afterAll(async () => {
  await pool?.end();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function fixture(confirmed = true) {
  const actor = { id: randomUUID() };
  await pool!.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [
      actor.id,
      "Synthetic offline reviewer",
      `offline-${actor.id}@example.test`,
    ],
  );
  const store = new ProjectStore(pool!);
  const project = await store.create(actor, "Fiktiver QA-Betrieb");
  await store.revise(actor, project.id, 0, {
    rawText: "Synthetic offline acceptance",
    identity: { name: "Fiktiver QA-Betrieb" },
    facts: [
      { id: "service", statement: "Wir reinigen Büros in Düsseldorf." },
      {
        id: "rejected",
        statement: "Wir garantieren eine Verdopplung des Umsatzes.",
      },
    ],
  });
  if (confirmed) await store.confirm(actor, project.id, 1, ["service"]);
  const command = {
    expectedRevision: confirmed ? 2 : 1,
    goal: "mehr_anfragen",
    audience: "Synthetische Büroleitungen",
    language: "de-DE",
    channels: ["linkedin"],
    idempotencyKey: randomUUID(),
  };
  return { actor, project, command };
}
function provider() {
  const demo = createPackProvider(true, {});
  return {
    ...demo,
    name: "openai",
    model: "offline-mocked-model",
    inputRate: 1,
    outputRate: 6,
    generate: vi.fn(async (input: Parameters<PackProvider["generate"]>[0]) => ({
      ...(await demo.generate(input)),
      inputTokens: 100,
      outputTokens: 100,
    })),
  };
}
const period = () => new Date().toISOString().slice(0, 7);
describe.skipIf(!enabled)(
  "#416 local-only service admission, costs and HTTP review boundary",
  () => {
    it.each(["zero-confirmed-facts", "stale-revision"])(
      "blocks %s without a provider call or quota charge",
      async (kind) => {
        const f = await fixture(kind !== "zero-confirmed-facts"),
          p = provider(),
          s = new PackService(pool!, false, () => p);
        await expect(
          s.generate(f.actor, f.project.id, {
            ...f.command,
            ...(kind === "stale-revision" ? { expectedRevision: 1 } : {}),
          }),
        ).rejects.toMatchObject({
          code:
            kind === "stale-revision"
              ? "STALE_REVISION"
              : "CONFIRMED_FACTS_REQUIRED",
        });
        expect(p.generate).not.toHaveBeenCalled();
        expect((await s.usage(f.actor, f.project.id)).used).toBe(0);
      },
    );
    it("does not send rejected facts to an injected provider and rejects bad references after usage", async () => {
      const f = await fixture(),
        p = provider();
      const original = p.generate.getMockImplementation()!;
      p.generate.mockImplementation(async (i) => {
        expect(i.facts.map((x) => x.id)).toEqual(["service"]);
        const r = await original(i);
        return {
          ...r,
          selection: {
            ...(r.selection as object),
            posts: [0, 1, 2].map(() => ({
              channel: "linkedin",
              hook: "Ein klarer Blick auf dein nächstes Projekt.",
              factIds: ["rejected"],
            })),
          },
        };
      });
      const s = new PackService(pool!, false, () => p),
        r = await s.generate(f.actor, f.project.id, f.command);
      expect(r.status).toBe("failed");
      expect(r.versions).toHaveLength(0);
      expect(r.cost_kind).toBe("configured_rate_estimate");
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
    });
    it.each(["timeout", "uncertain-cost", "missing-output-usage"])(
      "retains full reservation/attempt for %s without retry",
      async (kind) => {
        const f = await fixture(),
          p = provider();
        p.generate.mockRejectedValue(new Error(kind));
        const s = new PackService(pool!, false, () => p),
          r = await s.generate(f.actor, f.project.id, f.command);
        expect(r.status).toBe("failed");
        expect(r.cost_kind).toBe("reserved_estimate");
        const record = (
          await pool!.query(
            "SELECT reserved_micro_eur,cost_micro_eur,retries FROM mkt_generations WHERE id=$1",
            [r.id],
          )
        ).rows[0];
        expect(Number(record.cost_micro_eur)).toBe(
          Number(record.reserved_micro_eur),
        );
        expect(Number(record.cost_micro_eur)).toBeGreaterThan(0);
        expect(record.retries).toBe(0);
        expect((await s.generate(f.actor, f.project.id, f.command)).id).toBe(
          r.id,
        );
        expect(p.generate).toHaveBeenCalledTimes(1);
        expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
      },
    );
    it.each([0, -1, Number.NaN])(
      "fails closed on missing/invalid input usage %s",
      async (tokens) => {
        const f = await fixture(),
          p = provider(),
          original = p.generate.getMockImplementation()!;
        p.generate.mockImplementation(async (i) => ({
          ...(await original(i)),
          inputTokens: tokens,
        }));
        const s = new PackService(pool!, false, () => p),
          r = await s.generate(f.actor, f.project.id, f.command);
        expect(r.status).toBe("failed");
        expect(r.cost_kind).toBe("reserved_estimate");
        expect(r.versions).toHaveLength(0);
        expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
      },
    );
    it.each(["too-many-facts", "too-long-fact"])(
      "rejects %s before generation or charging",
      async (kind) => {
        const f = await fixture(),
          p = provider(),
          s = new PackService(pool!, false, () => p),
          store = new ProjectStore(pool!);
        const facts = Array.from(
          { length: kind === "too-many-facts" ? 25 : 1 },
          (_, i) => ({
            id: `bounded-${i}`,
            statement:
              kind === "too-long-fact"
                ? "A".repeat(501)
                : `Synthetische Leistung ${i}.`,
          }),
        );
        await store.revise(f.actor, f.project.id, 2, {
          rawText: "Offline bounds probe",
          identity: { name: "Fiktiver QA-Betrieb" },
          facts,
        });
        await store.confirm(
          f.actor,
          f.project.id,
          3,
          facts.map((x) => x.id),
        );
        await expect(
          s.generate(f.actor, f.project.id, {
            ...f.command,
            expectedRevision: 4,
          }),
        ).rejects.toMatchObject({ code: "SHORTER_FACTS_REQUIRED" });
        expect(p.generate).not.toHaveBeenCalled();
        expect((await s.usage(f.actor, f.project.id)).used).toBe(0);
      },
    );
    it("refuses reservation > €0.75 before invocation", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, false, () => ({
          ...p,
          inputRate: 1000,
          outputRate: 1000,
        }));
      await expect(
        s.generate(f.actor, f.project.id, f.command),
      ).rejects.toMatchObject({ code: "PER_PACK_COST_LIMIT" });
      expect(p.generate).not.toHaveBeenCalled();
      expect((await s.usage(f.actor, f.project.id)).used).toBe(0);
    });
    it("blocks a shared stop-loss before provider admission", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, false, () => p, 0);
      await expect(
        s.generate(f.actor, f.project.id, f.command),
      ).rejects.toMatchObject({ code: "GLOBAL_BUDGET_EXHAUSTED" });
      expect(p.generate).not.toHaveBeenCalled();
      expect((await s.usage(f.actor, f.project.id)).used).toBe(0);
    });
    it("blocks exhausted Starter quota without another call", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, false, () => p);
      for (let i = 0; i < 4; i++)
        await s.generate(f.actor, f.project.id, {
          ...f.command,
          idempotencyKey: randomUUID(),
        });
      await expect(
        s.generate(f.actor, f.project.id, f.command),
      ).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
      expect(p.generate).toHaveBeenCalledTimes(4);
      expect((await s.usage(f.actor, f.project.id)).remaining).toBe(0);
    });
    it("holds two concurrent reservations, refuses a third and bills each admitted attempt once", async () => {
      const f = await fixture(),
        p = provider(),
        original = p.generate.getMockImplementation()!;
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      p.generate.mockImplementation(async (i) => {
        await gate;
        return original(i);
      });
      const s = new PackService(pool!, false, () => p);
      const jobs = [1, 2].map(() =>
        s.generate(f.actor, f.project.id, {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      );
      try {
        await vi.waitFor(() => expect(p.generate).toHaveBeenCalledTimes(2));
        await expect(
          s.generate(f.actor, f.project.id, f.command),
        ).rejects.toMatchObject({ code: "CONCURRENT_LIMIT" });
        expect((await s.usage(f.actor, f.project.id)).used).toBe(2);
      } finally {
        release();
        await Promise.all(jobs);
      }
      expect(p.generate).toHaveBeenCalledTimes(2);
    });
    it("deduplicates a running idempotency key and rejects changed-payload collision", async () => {
      const f = await fixture(),
        p = provider(),
        original = p.generate.getMockImplementation()!;
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      p.generate.mockImplementation(async (i) => {
        await gate;
        return original(i);
      });
      const s = new PackService(pool!, false, () => p),
        first = s.generate(f.actor, f.project.id, f.command);
      try {
        await vi.waitFor(() => expect(p.generate).toHaveBeenCalledTimes(1));
        const same = await s.generate(f.actor, f.project.id, f.command);
        expect(same.status).toBe("running");
        await expect(
          s.generate(f.actor, f.project.id, {
            ...f.command,
            audience: "Changed synthetic audience",
          }),
        ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      } finally {
        release();
        await first;
      }
      expect(p.generate).toHaveBeenCalledTimes(1);
      expect((await s.usage(f.actor, f.project.id)).used).toBe(1);
    });
    it("rejects unsupported commands before provider invocation", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, false, () => p);
      await expect(
        s.generate(f.actor, f.project.id, {
          ...f.command,
          channels: ["tiktok"],
        }),
      ).rejects.toThrow();
      expect(p.generate).not.toHaveBeenCalled();
      expect((await s.usage(f.actor, f.project.id)).used).toBe(0);
    });
    it("keeps immutable versions and enforces reviewed=true through the actual in-memory HTTP route", async () => {
      const f = await fixture(),
        p = provider(),
        s = new PackService(pool!, false, () => p),
        job = await s.generate(f.actor, f.project.id, f.command),
        original = structuredClone(job.versions[0].content);
      const cfg = configuration({
        MARKETING_DATABASE_URL: url,
        MARKETING_AUTH_SECRET:
          "synthetic-offline-review-gate-over-32-characters",
        MARKETING_DEMO_MODE: "true",
      });
      const auth = {
        api: {
          getSession: async () => ({
            user: { id: f.actor.id, emailVerified: true },
          }),
        },
        handler: async () => new Response(null, { status: 503 }),
      } as unknown as ReturnType<typeof createSaasAuth>;
      const api = createApi(pool!, cfg, auth);
      const request = (body: unknown) =>
        api(
          new Request(
            `${cfg.origin}/api/projects/${f.project.id}/packs/${job.id}/export`,
            {
              method: "POST",
              headers: {
                origin: cfg.origin,
                "content-type": "application/json",
              },
              body: JSON.stringify(body),
            },
          ),
        );
      expect(
        (await request({ expectedVersion: 1, reviewed: false })).status,
      ).toBe(400);
      expect((await request({ expectedVersion: 1 })).status).toBe(400);
      expect(
        (await request({ expectedVersion: 1, reviewed: true })).status,
      ).toBe(200);
      await s.edit(f.actor, f.project.id, job.id, {
        expectedVersion: 1,
        posts: ["Manuell 1", "Manuell 2", "Manuell 3"],
        hooks: ["A", "B", "C"],
        cta: "Manuelle CTA",
      });
      expect(
        (await request({ expectedVersion: 1, reviewed: true })).status,
      ).toBe(409);
      const current = await s.read(f.actor, f.project.id, job.id);
      expect(
        current.versions.find(
          (v: { version: number; content: unknown }) => v.version === 1,
        )?.content,
      ).toEqual(original);
      expect(current.versions[0].content.editorialStatus).toBe("human_edited");
      expect(
        (await request({ expectedVersion: 2, reviewed: true })).status,
      ).toBe(200);
      const events = (
        await pool!.query(
          "SELECT event FROM mkt_pack_events WHERE generation_id=$1",
          [job.id],
        )
      ).rows.map((r) => r.event);
      expect(
        events.every((x) => ["manual_edit", "manual_export"].includes(x)),
      ).toBe(true);
      expect(events).not.toContain("publish");
    });
    it("retains over-reservation cost and trips the shared operator stop until reconciliation", async () => {
      const f = await fixture(),
        p = provider(),
        original = p.generate.getMockImplementation()!;
      p.generate.mockImplementation(async (i) => ({
        ...(await original(i)),
        inputTokens: 1_000_000,
      }));
      const s = new PackService(pool!, false, () => p);
      try {
        const r = await s.generate(f.actor, f.project.id, f.command);
        expect(r.status).toBe("failed");
        expect(Number(r.cost_micro_eur)).toBeGreaterThan(750_000);
        expect(
          (
            await pool!.query(
              "SELECT blocked FROM mkt_global_usage WHERE month=$1",
              [period()],
            )
          ).rows[0].blocked,
        ).toBe(true);
        const next = await fixture();
        await expect(
          s.generate(next.actor, next.project.id, next.command),
        ).rejects.toMatchObject({ code: "GLOBAL_BUDGET_EXHAUSTED" });
      } finally {
        await pool!.query(
          "UPDATE mkt_global_usage SET blocked=false WHERE month=$1",
          [period()],
        );
      }
    });
  },
);
