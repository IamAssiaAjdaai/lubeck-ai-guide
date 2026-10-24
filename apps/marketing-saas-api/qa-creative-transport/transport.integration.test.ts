// @vitest-environment node
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { Pool } from "pg";
import { configuration } from "../src/config";
import { ProjectStore } from "../src/store";
import { PackService } from "../src/packs";
import { CreativeService } from "../src/creative/service";
import * as rendering from "../src/creative/provider";
import { PrivateMedia } from "../src/creative/storage";
import { createOpenAIHttpProvider } from "../src/creative/openai-http";

const url = process.env.MARKETING_CREATIVE_TEST_DATABASE_URL;
const config = url
  ? configuration({
      MARKETING_DATABASE_URL: url,
      MARKETING_AUTH_SECRET: "synthetic-audit-secret-at-least-32-characters",
      MARKETING_DEMO_MODE: "true",
      MARKETING_CREATIVE_QA_ENABLED: "true",
    })
  : null;
const pool = config
  ? new Pool({ connectionString: config.databaseUrl, max: 8 })
  : null;
const directories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await pool?.end();
  for (const dir of directories)
    await rm(dir, { recursive: true, force: true });
});
async function fixture() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("OFFLINE_AUDIT_FETCH_BLOCKED");
    }),
  );
  const actor = { id: randomUUID() };
  await pool!.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [
      actor.id,
      "Synthetic independent acceptance",
      `independent-${actor.id}@example.test`,
    ],
  );
  const store = new ProjectStore(pool!),
    packs = new PackService(pool!, true);
  async function project() {
    const p = await store.create(actor, "Fiktive Büroreinigung QA");
    await store.revise(actor, p.id, 0, {
      rawText: "Synthetic acceptance only",
      identity: { name: "Fiktive Büroreinigung" },
      facts: [{ id: "office", statement: "Wir reinigen Büros in Düsseldorf." }],
    });
    await store.confirm(actor, p.id, 1, ["office"]);
    const pack = await packs.generate(actor, p.id, {
      expectedRevision: 2,
      goal: "mehr_anfragen",
      audience: "Büroleitungen",
      language: "de-DE",
      channels: ["linkedin"],
      idempotencyKey: randomUUID(),
    });
    return { p, pack };
  }
  const first = await project(),
    dir = await mkdtemp(join(tmpdir(), "creative-01a-"));
  directories.push(dir);
  let time = Date.now();
  const media = new PrivateMedia(dir);
  const service = new CreativeService(pool!, media, () => new Date(time));
  const command = (generationId = first.pack.id) => ({
    generationId,
    expectedVersion: 1,
    postIndex: 0,
    objective: "leistung_erklaeren",
    ratio: "4:5",
    idempotencyKey: randomUUID(),
  });
  return {
    actor,
    media,
    dir,
    store,
    packs,
    project,
    ...first,
    service,
    command,
    advance: (ms: number) => {
      time += ms;
    },
  };
}
const transport = (fetcher: typeof fetch) =>
  createOpenAIHttpProvider(
    {
      enabled: () => true,
      killSwitch: () => false,
      spendApproved: () => true,
      priceBoundVerified: () => true,
      secret: () => "synthetic-transport-contract-only",
    },
    fetcher,
  );
async function payload() {
  return Response.json({
    data: [
      {
        b64_json: (
          await sharp({
            create: {
              width: 1024,
              height: 1280,
              channels: 3,
              background: "#C8BCEE",
            },
          })
            .png()
            .toBuffer()
        ).toString("base64"),
      },
    ],
    output_format: "png",
    size: "1024x1280",
  });
}
async function charge(id: string) {
  return (
    await pool!.query(
      "SELECT uncertain,active,finalized_micro_eur FROM mkt_creative_charges WHERE id=$1",
      [id],
    )
  ).rows[0];
}
const creative = {
  operation: "generate" as const,
  referenceIds: [] as string[],
  style: "abstrakt" as const,
  outputFormat: "png" as const,
};
async function admit(
  service: CreativeService,
  f: Awaited<ReturnType<typeof fixture>>,
) {
  const command = { ...f.command(), creative };
  const preview = await service.previewBrief(f.actor, f.p.id, command);
  return service.enqueue(f.actor, f.p.id, "image", {
    ...command,
    reviewedBriefHash: preview.briefHash,
  });
}
const describeDb = config ? describe : describe.skip;
describeDb(
  "Creative-04 database + intercepted HTTP boundary (no external generation)",
  () => {
    it("runs exact-version review, attachment and export with one dispatch under duplicate execution; unknown costs stay reserved", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
        }),
        cmd = { ...f.command(), creative, reviewedBriefHash: "0".repeat(64) };
      cmd.reviewedBriefHash = (
        await service.previewBrief(f.actor, f.p.id, cmd)
      ).briefHash;
      const j = await service.enqueue(f.actor, f.p.id, "image", cmd);
      expect((await service.enqueue(f.actor, f.p.id, "image", cmd)).id).toBe(
        j.id,
      );
      await Promise.all([
        service.processImage(f.actor, f.p.id, j.id),
        service.processImage(f.actor, f.p.id, j.id),
      ]);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const job = (await service.read(f.actor, f.p.id)).jobs[0];
      expect(job).toMatchObject({
        provider: "openai",
        state: "completed",
        disclosureVersion: 3,
        providerPending: true,
      });
      await expect(
        service.output(f.actor, f.p.id, j.id, true),
      ).rejects.toMatchObject({ code: "CREATIVE_REVIEW_REQUIRED" });
      await expect(
        service.review(f.actor, f.p.id, j.id, {
          outputHash: "0".repeat(64),
          imageReviewed: true,
          textReviewed: true,
          syntheticAcknowledged: true,
        }),
      ).rejects.toThrow();
      await service.review(f.actor, f.p.id, j.id, {
        outputHash: job.outputHash,
        imageReviewed: true,
        textReviewed: true,
        syntheticAcknowledged: true,
      });
      await service.attach(f.actor, f.p.id, j.id);
      const out = await service.output(f.actor, f.p.id, j.id, true);
      expect(out.metadata).toMatchObject({
        provider: "openai",
        generationMethod: "ai_generated",
        providerModel: "gpt-image-2.5-flare-2026-09-08",
        disclosure: "KI – SYNTHETISCHE ILLUSTRATION",
        notDocumentaryEvidence: true,
      });
      expect(JSON.stringify(out.metadata)).not.toContain(
        "synthetic-transport-contract-only",
      );
      expect(JSON.stringify(out.metadata)).not.toContain(f.actor.id);
      expect(out.metadata.providerOutputHash).toHaveLength(64);
      expect(await charge(j.id)).toEqual({
        uncertain: true,
        active: true,
        finalized_micro_eur: null,
      });
      await service.processImage(f.actor, f.p.id, j.id);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it("holds costs on HTTP rejection, never repeats an ambiguous job", async () => {
      const f = await fixture(),
        fetcher = vi.fn(
          async () => new Response("synthetic vendor error", { status: 400 }),
        ),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
        });
      const j = await admit(service, f);
      await service.processImage(f.actor, f.p.id, j.id);
      await service.processImage(f.actor, f.p.id, j.id);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await charge(j.id)).toEqual({
        uncertain: true,
        active: true,
        finalized_micro_eur: null,
      });
      expect((await service.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
        state: "failed",
        error: "IMAGE_REQUEST_REJECTED",
      });
    });
    it("bounds HTTP timeout and does not allow a subsequent process request to retry", async () => {
      const f = await fixture(),
        fetcher = vi.fn(
          async (_u: Parameters<typeof fetch>[0], init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) =>
              init?.signal?.addEventListener(
                "abort",
                () => reject(Error("abort")),
                { once: true },
              ),
            ),
        ),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
          timeoutMs: 15,
        });
      const j = await admit(service, f);
      await service.processImage(f.actor, f.p.id, j.id);
      await service.processImage(f.actor, f.p.id, j.id);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await charge(j.id)).toMatchObject({
        uncertain: true,
        active: true,
      });
    });
    it.each(["cancel", "kill", "expiry", "stale"])(
      "late successful response after %s does not zero the vendor reservation or expose output",
      async (mode) => {
        const f = await fixture();
        let release!: () => void,
          started!: () => void,
          kill = false,
          time = Date.now();
        const ready = new Promise<void>((r) => {
            started = r;
          }),
          wait = new Promise<void>((r) => {
            release = r;
          });
        const fetcher = vi.fn(async () => {
          started();
          await wait;
          return payload();
        });
        const service = new CreativeService(
          pool!,
          f.media,
          () => new Date(time),
          { provider: transport(fetcher), killSwitch: () => kill },
        );
        const j = await admit(service, f),
          work = service.processImage(f.actor, f.p.id, j.id);
        await ready;
        if (mode === "cancel") await service.cancel(f.actor, f.p.id, j.id);
        if (mode === "kill") kill = true;
        if (mode === "expiry") time += 25 * 60 * 60 * 1000;
        if (mode === "stale")
          await f.store.revise(f.actor, f.p.id, 2, {
            rawText: "New synthetic facts",
            identity: { name: "New QA" },
            facts: [{ id: "new", statement: "Andere bestätigte Grundlage." }],
          });
        release();
        await work;
        expect(await charge(j.id)).toEqual({
          uncertain: true,
          active: true,
          finalized_micro_eur: null,
        });
        await expect(service.output(f.actor, f.p.id, j.id)).rejects.toThrow();
        expect(fetcher).toHaveBeenCalledTimes(1);
      },
    );
    it("default-off provider returns known zero before dispatch, releasing only a provably undispatched reservation", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload),
        provider = createOpenAIHttpProvider(
          {
            enabled: () => false,
            killSwitch: () => false,
            spendApproved: () => false,
            priceBoundVerified: () => false,
            secret: () => {
              throw Error("SECRET_MUST_NOT_BE_READ");
            },
          },
          fetcher,
        ),
        service = new CreativeService(pool!, f.media, undefined, { provider });
      const j = await admit(service, f);
      await service.processImage(f.actor, f.p.id, j.id);
      expect(fetcher).not.toHaveBeenCalled();
      expect(await charge(j.id)).toEqual({
        uncertain: false,
        active: false,
        finalized_micro_eur: 0,
      });
    });
    it("prevents cross-tenant job execution before transport and preserves global holds", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
          global: { attempts: 1000, concurrent: 1, budget: 100000 },
        });
      // Earlier cases keep intentional uncertain holds; this global admission must remain closed.
      await expect(admit(service, f)).rejects.toMatchObject({
        code: "CREATIVE_GLOBAL_LIMIT",
      });
      const other = await fixture(),
        j = await other.service.enqueue(
          other.actor,
          other.p.id,
          "image",
          other.command(),
        );
      await expect(
        service.processImage(f.actor, other.p.id, j.id),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    });
    it("recovers a storage interruption without retrying dispatch or releasing the unknown charge", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload);
      let time = Date.now();
      const service = new CreativeService(
        pool!,
        f.media,
        () => new Date(time),
        { provider: transport(fetcher) },
      );
      const j = await admit(service, f);
      const fault = vi
        .spyOn(f.media, "write")
        .mockRejectedValueOnce(Error("synthetic storage failure"));
      await expect(service.processImage(f.actor, f.p.id, j.id)).rejects.toThrow(
        "synthetic storage failure",
      );
      fault.mockRestore();
      time += 16 * 60 * 1000;
      expect(await service.recoverInterrupted(f.actor, f.p.id)).toEqual({
        interrupted: 1,
      });
      expect(await service.recoverInterrupted(f.actor, f.p.id)).toEqual({
        interrupted: 0,
      });
      await service.processImage(f.actor, f.p.id, j.id);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await charge(j.id)).toEqual({
        uncertain: true,
        active: true,
        finalized_micro_eur: null,
      });
    });
    it("composition failure after dispatch is never described or settled as a free mock failure", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
        }),
        j = await admit(service, f);
      vi.spyOn(rendering, "compose").mockRejectedValueOnce(
        Error("synthetic composition failure"),
      );
      await service.processImage(f.actor, f.p.id, j.id);
      expect((await service.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
        state: "failed",
        error: "IMAGE_COMPOSITION_FAILED",
        providerPending: true,
      });
      expect(await charge(j.id)).toEqual({
        uncertain: true,
        active: true,
        finalized_micro_eur: null,
      });
    });
    it("requires an exact human-reviewed text-only brief before reserving any real-request quota", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
        });
      await expect(
        service.enqueue(f.actor, f.p.id, "image", f.command()),
      ).rejects.toMatchObject({ code: "LIVE_IMAGE_TEXT_ONLY_PNG_REQUIRED" });
      await expect(
        service.enqueue(f.actor, f.p.id, "image", {
          ...f.command(),
          creative,
          reviewedBriefHash: "0".repeat(64),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_BRIEF_REVIEW_REQUIRED" });
      expect(
        (
          await pool!.query(
            "SELECT count(*)::int AS n FROM mkt_creative_charges WHERE project_id=$1",
            [f.p.id],
          )
        ).rows[0].n,
      ).toBe(0);
      expect(fetcher).not.toHaveBeenCalled();
    });
    it("stale confirmed facts fail before any HTTP dispatch", async () => {
      const f = await fixture(),
        fetcher = vi.fn(payload),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: transport(fetcher),
        }),
        j = await admit(service, f);
      await f.store.revise(f.actor, f.p.id, 2, {
        rawText: "Updated QA",
        identity: { name: "Fiktive Änderung" },
        facts: [{ id: "new", statement: "Neue Information." }],
      });
      await service.processImage(f.actor, f.p.id, j.id);
      expect(fetcher).not.toHaveBeenCalled();
      expect(await charge(j.id)).toMatchObject({
        uncertain: false,
        finalized_micro_eur: 0,
      });
    });
  },
);
