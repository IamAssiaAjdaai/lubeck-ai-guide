// @vitest-environment node
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { Pool } from "pg";
import { configuration } from "../src/config";
import { ProjectStore } from "../src/store";
import { PackService } from "../src/packs";
import { CreativeService } from "../src/creative/service";
import { PrivateMedia } from "../src/creative/storage";
import { openAIContractFixtureProvider } from "../src/creative/image-adapter";
import { initialState } from "../src/creative/contract";

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
const png = (color = "#D0EB8D") =>
  sharp({ create: { width: 64, height: 64, channels: 4, background: color } })
    .png()
    .toBuffer();

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
async function source(f: Awaited<ReturnType<typeof fixture>>) {
  let a = await f.service.upload(f.actor, f.p.id, await png(), "image/png");
  a = await f.service.metadata(f.actor, f.p.id, a.id, {
    expectedRevision: a.revision,
    name: "Synthetic source",
    alt: "QA square",
    role: "logo",
  });
  a = await f.service.approveAsset(f.actor, f.p.id, a.id, {
    expectedRevision: a.revision,
    rightsConfirmed: true,
    sourceConfirmed: true,
  });
  const { revision: _, ...kit } = initialState().kit;
  void _;
  await f.service.saveKit(f.actor, f.p.id, {
    ...kit,
    logoId: a.id,
    expectedRevision: 0,
  });
  return a;
}
async function completed(f: Awaited<ReturnType<typeof fixture>>) {
  const j = await f.service.enqueue(f.actor, f.p.id, "image", f.command());
  await f.service.processImage(f.actor, f.p.id, j.id);
  const view = (await f.service.read(f.actor, f.p.id)).jobs[0];
  await f.service.review(f.actor, f.p.id, j.id, {
    outputHash: view.outputHash,
    imageReviewed: true,
    textReviewed: true,
    syntheticAcknowledged: true,
  });
  await f.service.attach(f.actor, f.p.id, j.id);
  return j;
}
async function raw(f: Awaited<ReturnType<typeof fixture>>) {
  return (
    await pool!.query(
      "SELECT state FROM mkt_creative_projects WHERE project_id=$1",
      [f.p.id],
    )
  ).rows[0].state;
}
const creative = {
  style: "editorial",
  operation: "generate",
  referenceIds: [],
  outputFormat: "png",
};
async function enhanced(f: Awaited<ReturnType<typeof fixture>>, extra = {}) {
  const command = { ...f.command(), creative, ...extra };
  const preview = await f.service.previewBrief(f.actor, f.p.id, command);
  return { ...command, reviewedBriefHash: preview.briefHash };
}
describe.skipIf(!pool)(
  "Creative-03 integration: privacy, provider and budget controls",
  () => {
    it("previews without quota and binds the exact facts/kit/selected references before reservation", async () => {
      const f = await fixture(),
        cmd = await enhanced(f);
      expect((await f.service.read(f.actor, f.p.id)).usage.entries).toEqual([]);
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", {
          ...cmd,
          reviewedBriefHash: "0".repeat(64),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_BRIEF_REVIEW_REQUIRED" });
      const j = await f.service.enqueue(f.actor, f.p.id, "image", cmd);
      await f.service.processImage(f.actor, f.p.id, j.id);
      expect((await f.service.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
        state: "completed",
        provider: "mock",
        brief: { creative: { style: "editorial" } },
      });
    });
    it("rejects foreign, unapproved and changed reference bytes before quota", async () => {
      const f = await fixture(),
        other = await fixture(),
        foreign = await source(other);
      const options = {
        ...creative,
        operation: "edit",
        referenceIds: [foreign.id],
      };
      await expect(
        f.service.previewBrief(f.actor, f.p.id, {
          ...f.command(),
          creative: options,
        }),
      ).rejects.toMatchObject({ code: "APPROVED_ASSET_REQUIRED" });
      let a = await f.service.upload(f.actor, f.p.id, await png(), "image/png");
      await expect(
        f.service.saveKit(f.actor, f.p.id, {
          ...initialState().kit,
          expectedRevision: 0,
          photoIds: [a.id],
        }),
      ).rejects.toThrow();
      a = await f.service.metadata(f.actor, f.p.id, a.id, {
        expectedRevision: a.revision,
        name: "Synthetic reference",
        alt: "Synthetic square",
        role: "business_photo",
      });
      a = await f.service.approveAsset(f.actor, f.p.id, a.id, {
        expectedRevision: a.revision,
        rightsConfirmed: true,
        sourceConfirmed: true,
      });
      const { revision: _, ...kit } = initialState().kit;
      void _;
      await f.service.saveKit(f.actor, f.p.id, {
        ...kit,
        expectedRevision: 0,
        photoIds: [a.id],
      });
      const cmd = await enhanced(f, {
        creative: { ...options, referenceIds: [a.id] },
      });
      await writeFile(join(f.dir, a.id), await png("red"));
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", cmd),
      ).rejects.toMatchObject({ code: "ASSET_INTEGRITY_FAILED" });
      expect((await f.service.read(f.actor, f.p.id)).usage.entries).toEqual([]);
    });
    it("completes the enhanced reference-mock journey with exact source and review binding", async () => {
      const f = await fixture();
      let a = await f.service.upload(f.actor, f.p.id, await png(), "image/png");
      a = await f.service.metadata(f.actor, f.p.id, a.id, {
        expectedRevision: a.revision,
        name: "Synthetic photo",
        alt: "QA square, not real premises",
        role: "business_photo",
      });
      a = await f.service.approveAsset(f.actor, f.p.id, a.id, {
        expectedRevision: a.revision,
        rightsConfirmed: true,
        sourceConfirmed: true,
      });
      const { revision: _, ...kit } = initialState().kit;
      void _;
      await f.service.saveKit(f.actor, f.p.id, {
        ...kit,
        expectedRevision: 0,
        photoIds: [a.id],
      });
      const cmd = await enhanced(f, {
          creative: { ...creative, operation: "edit", referenceIds: [a.id] },
        }),
        j = await f.service.enqueue(f.actor, f.p.id, "image", cmd);
      await f.service.processImage(f.actor, f.p.id, j.id);
      const view = (await f.service.read(f.actor, f.p.id)).jobs[0];
      await expect(
        f.service.output(f.actor, f.p.id, j.id, true),
      ).rejects.toMatchObject({ code: "CREATIVE_REVIEW_REQUIRED" });
      await f.service.review(f.actor, f.p.id, j.id, {
        outputHash: view.outputHash,
        imageReviewed: true,
        textReviewed: true,
        syntheticAcknowledged: true,
      });
      await f.service.attach(f.actor, f.p.id, j.id);
      expect(
        (await f.service.output(f.actor, f.p.id, j.id, true)).metadata
          .sourceHashes,
      ).toEqual([a.hash]);
      expect(fetch).not.toHaveBeenCalled();
    });
    it.each(["generate", "edit"] as const)(
      "runs an authored %s wire fixture through the existing review, attachment and export workflow",
      async (operation) => {
        const f = await fixture();
        let refs: string[] = [];
        if (operation === "edit") {
          let a = await f.service.upload(
            f.actor,
            f.p.id,
            await png(),
            "image/png",
          );
          a = await f.service.metadata(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
            name: "Synthetic reference",
            alt: "Authored geometry, not premises",
            role: "business_photo",
          });
          a = await f.service.approveAsset(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
            rightsConfirmed: true,
            sourceConfirmed: true,
          });
          const { revision: _, ...kit } = initialState().kit;
          void _;
          await f.service.saveKit(f.actor, f.p.id, {
            ...kit,
            expectedRevision: 0,
            photoIds: [a.id],
          });
          refs = [a.id];
        }
        const service = new CreativeService(pool!, f.media, undefined, {
          provider: openAIContractFixtureProvider({
            data: [{ b64_json: (await png()).toString("base64") }],
            output_format: "png",
          }),
        });
        const cmd = await enhanced(f, {
            creative: { ...creative, operation, referenceIds: refs },
          }),
          j = await service.enqueue(f.actor, f.p.id, "image", cmd);
        await service.processImage(f.actor, f.p.id, j.id);
        const view = (await service.read(f.actor, f.p.id)).jobs[0];
        await service.review(f.actor, f.p.id, j.id, {
          outputHash: view.outputHash,
          imageReviewed: true,
          textReviewed: true,
          syntheticAcknowledged: true,
        });
        await service.attach(f.actor, f.p.id, j.id);
        expect(
          (await service.output(f.actor, f.p.id, j.id, true)).metadata,
        ).toMatchObject({
          provider: "mock",
          demo: true,
          synthetic: true,
          disclosure: "MOCK – OHNE KI GENERIERT",
        });
        expect(fetch).not.toHaveBeenCalled();
      },
    );
    it("requires an owner and exact revision; erases historical metadata without altering v1 or cost usage", async () => {
      const f = await fixture(),
        a = await source(f),
        j = await completed(f),
        before = await f.service.read(f.actor, f.p.id);
      const packBefore = (
        await pool!.query(
          "SELECT content FROM mkt_pack_versions WHERE generation_id=$1",
          [f.pack.id],
        )
      ).rows;
      const cmd = {
        expectedRevision: before.revision,
        idempotencyKey: randomUUID(),
        confirmation: "CREATIVE_QA_LOESCHEN",
      };
      await expect(
        f.service.eraseCreative({ id: randomUUID() }, f.p.id, cmd),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        f.service.eraseCreative(f.actor, f.p.id, {
          ...cmd,
          expectedRevision: before.revision - 1,
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_REVISION_STALE" });
      expect(await f.service.eraseCreative(f.actor, f.p.id, cmd)).toMatchObject(
        { erased: true, pendingFiles: 0 },
      );
      expect(await f.service.eraseCreative(f.actor, f.p.id, cmd)).toMatchObject(
        { erased: true, pendingFiles: 0 },
      );
      const after = await f.service.read(f.actor, f.p.id);
      expect(after.assets).toEqual([]);
      expect(after.jobs).toEqual([]);
      expect(after.usage).toEqual(before.usage);
      expect(
        (
          await pool!.query(
            "SELECT * FROM mkt_creative_versions WHERE project_id=$1",
            [f.p.id],
          )
        ).rowCount,
      ).toBe(0);
      const remaining = JSON.stringify(await raw(f));
      expect(remaining).not.toContain(a.id);
      expect(remaining).not.toContain(f.actor.id);
      expect(remaining).not.toContain("Düsseldorf");
      await expect(
        f.service.assetBytes(f.actor, f.p.id, a.id),
      ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
      await expect(
        f.service.output(f.actor, f.p.id, j.id),
      ).rejects.toMatchObject({ code: "CREATIVE_NOT_FOUND" });
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", f.command()),
      ).rejects.toMatchObject({ code: "CREATIVE_ERASED" });
      expect(
        (
          await pool!.query(
            "SELECT content FROM mkt_pack_versions WHERE generation_id=$1",
            [f.pack.id],
          )
        ).rows,
      ).toEqual(packBefore);
    });
    it("denies a same-tenant editor and viewer erasure rights", async () => {
      const f = await fixture();
      await source(f);
      const v = await f.service.read(f.actor, f.p.id);
      await expect(
        f.service.retainMetadata({ id: randomUUID() }, f.p.id),
      ).rejects.toMatchObject({ status: 404 });
      for (const role of ["editor", "viewer"]) {
        const actor = { id: randomUUID() };
        await pool!.query(
          'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [actor.id, "Synthetic member", actor.id + "@example.test"],
        );
        await pool!.query(
          "INSERT INTO mkt_memberships(organization_id,user_id,role) VALUES($1,$2,$3)",
          [f.p.organization_id, actor.id, role],
        );
        await expect(
          f.service.retainMetadata(actor, f.p.id),
        ).rejects.toMatchObject({ status: 403 });
        await expect(
          f.service.eraseCreative(actor, f.p.id, {
            expectedRevision: v.revision,
            idempotencyKey: randomUUID(),
            confirmation: "CREATIVE_QA_LOESCHEN",
          }),
        ).rejects.toMatchObject({ status: 403 });
      }
    });
    it("revokes immediately despite failed erasure unlink, then recovers with the original command", async () => {
      const f = await fixture();
      await source(f);
      await completed(f);
      const v = await f.service.read(f.actor, f.p.id),
        cmd = {
          expectedRevision: v.revision,
          idempotencyKey: randomUUID(),
          confirmation: "CREATIVE_QA_LOESCHEN",
        };
      const remove = f.media.remove.bind(f.media),
        fault = vi
          .spyOn(f.media, "remove")
          .mockRejectedValue(new Error("disk unavailable"));
      expect(
        (await f.service.eraseCreative(f.actor, f.p.id, cmd)).pendingFiles,
      ).toBeGreaterThan(0);
      expect((await f.service.read(f.actor, f.p.id)).jobs).toEqual([]);
      expect((await raw(f)).erasure.completedAt).toBeUndefined();
      fault.mockImplementation(remove);
      expect(
        (await f.service.eraseCreative(f.actor, f.p.id, cmd)).pendingFiles,
      ).toBe(0);
      expect((await raw(f)).erasure.completedAt).toBeDefined();
      await expect(
        f.service.eraseCreative(f.actor, f.p.id, {
          ...cmd,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    });
    it("rolls back metadata erasure on database failure without deleting source files", async () => {
      const f = await fixture(),
        a = await source(f),
        v = await f.service.read(f.actor, f.p.id);
      // Transaction-level fault: existing PK rejects receipt insertion, so prior deletes must roll back.
      await pool!.query(
        "ALTER TABLE mkt_creative_erasures ADD CONSTRAINT qa_force_erasure_failure CHECK (erased_assets<0) NOT VALID",
      );
      try {
        await expect(
          f.service.eraseCreative(f.actor, f.p.id, {
            expectedRevision: v.revision,
            idempotencyKey: randomUUID(),
            confirmation: "CREATIVE_QA_LOESCHEN",
          }),
        ).rejects.toThrow();
      } finally {
        await pool!.query(
          "ALTER TABLE mkt_creative_erasures DROP CONSTRAINT qa_force_erasure_failure",
        );
      }
      expect(await f.media.read(a.id)).toBeDefined();
      expect((await f.service.read(f.actor, f.p.id)).assets).toHaveLength(1);
      expect((await raw(f)).erasure).toBeUndefined();
    });
    it("purges expired private history at 30 days and settled records at 90 days while holding unknown costs", async () => {
      const f = await fixture(),
        a = await source(f),
        j = await completed(f);
      const unknown = await f.service.enqueue(
        f.actor,
        f.p.id,
        "video",
        f.command(),
      );
      await f.service.advanceVideo(f.actor, f.p.id, unknown.id);
      await f.service.advanceVideo(f.actor, f.p.id, unknown.id, "timeout");
      await f.service.deleteAsset(f.actor, f.p.id, a.id, {
        expectedRevision: a.revision,
      });
      await pool!.query(
        "UPDATE mkt_creative_versions SET created_at=now()-interval '40 days' WHERE project_id=$1",
        [f.p.id],
      );
      f.advance(32 * 86400000);
      await f.service.expire(f.actor, f.p.id);
      const counts = await f.service.retainMetadata(f.actor, f.p.id);
      expect(counts.assets).toBe(1);
      expect(counts.jobs).toBe(2);
      expect((await raw(f)).assets).toEqual([]);
      expect((await raw(f)).jobs).toEqual([]);
      const charge = (
        await pool!.query("SELECT * FROM mkt_creative_charges WHERE id=$1", [
          unknown.id,
        ])
      ).rows[0];
      expect(charge).toMatchObject({
        uncertain: true,
        active: true,
        finalized_micro_eur: null,
      });
      expect(charge.metadata_erased_at).toBeTruthy();
      await pool!.query(
        "UPDATE mkt_creative_charges SET created_at=now()-interval '120 days' WHERE project_id=$1",
        [f.p.id],
      );
      f.advance(100 * 86400000);
      await f.service.retainMetadata(f.actor, f.p.id);
      expect(
        (
          await pool!.query("SELECT id FROM mkt_creative_charges WHERE id=$1", [
            j.id,
          ])
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await pool!.query("SELECT id FROM mkt_creative_charges WHERE id=$1", [
            unknown.id,
          ])
        ).rowCount,
      ).toBe(1);
    });
    it("holds unknown cost on timeout and never automatically resubmits the ambiguous request", async () => {
      const f = await fixture(),
        generate = vi.fn(() => new Promise<never>(() => {}));
      const service = new CreativeService(pool!, f.media, undefined, {
        provider: { id: "mock", generate },
        timeoutMs: 5,
      });
      const cmd = f.command(),
        j = await service.enqueue(f.actor, f.p.id, "image", cmd);
      await service.processImage(f.actor, f.p.id, j.id);
      await service.processImage(f.actor, f.p.id, j.id);
      expect((await service.enqueue(f.actor, f.p.id, "image", cmd)).id).toBe(
        j.id,
      );
      expect(generate).toHaveBeenCalledTimes(1);
      expect(
        (await service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({
        attempts: 1,
        uncertain: 1,
        active: 1,
        committed: 100000,
      });
    });
    it.each(["unknown charge", "invalid image"])(
      "holds reservations after a mock response with %s",
      async (kind) => {
        const f = await fixture(),
          service = new CreativeService(pool!, f.media, undefined, {
            provider: {
              id: "mock",
              generate: async () => ({
                bytes:
                  kind === "invalid image"
                    ? Buffer.from("invalid PNG")
                    : await png(),
                mime: "image/png",
                mock: true,
                charge: kind === "unknown charge" ? "unknown" : "known_zero",
              }),
            },
          });
        const j = await service.enqueue(f.actor, f.p.id, "image", f.command());
        await service.processImage(f.actor, f.p.id, j.id);
        expect(
          (await service.read(f.actor, f.p.id)).usage.entries[0],
        ).toMatchObject({ uncertain: 1, active: 1, committed: 100000 });
        expect((await raw(f)).jobs[0]).toMatchObject({ state: "failed" });
        expect((await raw(f)).jobs[0].outputKey).toBeUndefined();
      },
    );
    it("preserves timeout reservations across full erasure and repeated recovery", async () => {
      const f = await fixture(),
        service = new CreativeService(pool!, f.media, undefined, {
          provider: {
            id: "mock",
            generate: () => new Promise<never>(() => {}),
          },
          timeoutMs: 5,
        });
      const j = await service.enqueue(f.actor, f.p.id, "image", f.command());
      await service.processImage(f.actor, f.p.id, j.id);
      const v = await service.read(f.actor, f.p.id);
      await service.eraseCreative(f.actor, f.p.id, {
        expectedRevision: v.revision,
        idempotencyKey: randomUUID(),
        confirmation: "CREATIVE_QA_LOESCHEN",
      });
      await service.expire(f.actor, f.p.id);
      await service.recoverInterrupted(f.actor, f.p.id);
      expect(
        (await service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ uncertain: 1, active: 1, committed: 100000 });
    });
    it("enforces the dynamic kill switch before reservation and before queued execution", async () => {
      const f = await fixture();
      let killed = true;
      const service = new CreativeService(pool!, f.media, undefined, {
        killSwitch: () => killed,
      });
      await expect(
        service.enqueue(f.actor, f.p.id, "image", f.command()),
      ).rejects.toMatchObject({ code: "CREATIVE_KILL_SWITCH" });
      killed = false;
      const j = await service.enqueue(f.actor, f.p.id, "image", f.command());
      killed = true;
      await service.processImage(f.actor, f.p.id, j.id);
      expect((await service.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
        state: "failed",
        error: "CREATIVE_KILL_SWITCH",
      });
      expect(
        (await service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ committed: 0, active: 0 });
    });
    it("discards a late result after owner erasure without releasing its unresolved reservation", async () => {
      const f = await fixture();
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      const generate = vi.fn(async () => {
        await gate;
        return {
          bytes: await png(),
          mime: "image/png" as const,
          mock: true,
          charge: "known_zero" as const,
        };
      });
      const service = new CreativeService(pool!, f.media, undefined, {
        provider: { id: "mock", generate },
      });
      const j = await service.enqueue(f.actor, f.p.id, "image", f.command());
      const running = service.processImage(f.actor, f.p.id, j.id);
      await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
      const v = await service.read(f.actor, f.p.id);
      await service.eraseCreative(f.actor, f.p.id, {
        expectedRevision: v.revision,
        idempotencyKey: randomUUID(),
        confirmation: "CREATIVE_QA_LOESCHEN",
      });
      release();
      await expect(running).rejects.toMatchObject({ code: "CREATIVE_ERASED" });
      expect(
        (await service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ uncertain: 1, active: 1, committed: 100000 });
      expect((await raw(f)).jobs).toEqual([]);
    });
    it("finishes pending erasure through recovery without replaying a private owner command", async () => {
      const f = await fixture();
      await source(f);
      const v = await f.service.read(f.actor, f.p.id),
        remove = f.media.remove.bind(f.media);
      const fault = vi
        .spyOn(f.media, "remove")
        .mockImplementation(async (key) => {
          await remove(key);
          throw Error("lost unlink acknowledgement");
        });
      await f.service.eraseCreative(f.actor, f.p.id, {
        expectedRevision: v.revision,
        idempotencyKey: randomUUID(),
        confirmation: "CREATIVE_QA_LOESCHEN",
      });
      expect((await raw(f)).erasure.completedAt).toBeUndefined();
      fault.mockImplementation(remove);
      await f.service.expire(f.actor, f.p.id);
      expect((await raw(f)).erasure.completedAt).toBeDefined();
      const rev = (await f.service.read(f.actor, f.p.id)).revision;
      await f.service.expire(f.actor, f.p.id);
      expect((await f.service.read(f.actor, f.p.id)).revision).toBe(rev);
    });
    it.each(["attempts", "concurrent", "budget"] as const)(
      "serializes global image %s admission across tenants and keeps video limits independent",
      async (bound) => {
        const a = await fixture(),
          b = await fixture();
        const stats = (
          await pool!.query(
            "SELECT count(*)::int attempts,count(*) FILTER(WHERE active)::int active, COALESCE(sum(CASE WHEN uncertain THEN GREATEST(reserved_micro_eur,COALESCE(finalized_micro_eur,0)) ELSE finalized_micro_eur END),0)::bigint committed FROM mkt_creative_charges WHERE kind='image'",
          )
        ).rows[0];
        const global = {
          attempts: bound === "attempts" ? stats.attempts + 1 : 10000,
          concurrent: bound === "concurrent" ? stats.active + 1 : 500,
          budget:
            bound === "budget"
              ? Number(stats.committed) + 100000
              : 1_000_000_000,
        };
        const sa = new CreativeService(pool!, a.media, undefined, { global }),
          sb = new CreativeService(pool!, b.media, undefined, { global });
        const results = await Promise.allSettled([
          sa.enqueue(a.actor, a.p.id, "image", a.command()),
          sb.enqueue(b.actor, b.p.id, "image", b.command()),
        ]);
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        expect(results.find((r) => r.status === "rejected")).toMatchObject({
          reason: { code: "CREATIVE_GLOBAL_LIMIT" },
        });
        expect(
          await sb.enqueue(b.actor, b.p.id, "video", b.command()),
        ).toMatchObject({ kind: "video", state: "queued" });
      },
    );
  },
);
