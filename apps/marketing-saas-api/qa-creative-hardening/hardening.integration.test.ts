// @vitest-environment node
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  rm,
  writeFile,
  readFile,
  rename,
  unlink,
  utimes,
  chmod,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { Pool } from "pg";
import { configuration } from "../src/config";
import { ProjectStore } from "../src/store";
import { PackService } from "../src/packs";
import { CreativeService } from "../src/creative/service";
import { PrivateMedia } from "../src/creative/storage";
import { mockImageProvider } from "../src/creative/provider";
import { pruneOrphanNamespace } from "../src/creative/reconcile";
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
describe.skipIf(!pool)(
  "Creative-02 new integrity and recovery regressions",
  () => {
    it("rejects missing source at preview, admission, approval and existing export without leaking paths", async () => {
      const f = await fixture(),
        a = await source(f),
        j = await completed(f);
      await unlink(join(f.dir, a.id));
      for (const operation of [
        () => f.service.assetBytes(f.actor, f.p.id, a.id),
        () => f.service.enqueue(f.actor, f.p.id, "image", f.command()),
        () =>
          f.service.approveAsset(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
            rightsConfirmed: true,
            sourceConfirmed: true,
          }),
        () => f.service.output(f.actor, f.p.id, j.id, true),
      ])
        await expect(operation()).rejects.toMatchObject({
          code: "ASSET_INTEGRITY_FAILED",
        });
    });
    it("rejects atomic replacement and in-place mutation; another tenant cannot mutate or preview the source", async () => {
      const f = await fixture(),
        other = await fixture(),
        a = await source(f);
      await expect(
        f.service.assetBytes(other.actor, f.p.id, a.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        f.service.metadata(other.actor, f.p.id, a.id, {
          expectedRevision: a.revision,
          name: "attack",
          alt: "attack",
          role: "logo",
        }),
      ).rejects.toMatchObject({ status: 404 });
      const replacement = join(f.dir, randomUUID());
      await writeFile(replacement, await png("red"));
      await rename(replacement, join(f.dir, a.id));
      await expect(
        f.service.assetBytes(f.actor, f.p.id, a.id),
      ).rejects.toMatchObject({ code: "ASSET_INTEGRITY_FAILED" });
      await writeFile(join(f.dir, a.id), Buffer.from("corrupt"));
      await expect(
        f.service.assetBytes(f.actor, f.p.id, a.id),
      ).rejects.toMatchObject({ code: "ASSET_INTEGRITY_FAILED" });
    });
    it("renders the validated captured bytes, not a path reopened after asynchronous provider work", async () => {
      const f = await fixture(),
        a = await source(f),
        original = await f.media.read(a.id);
      const background = mockImageProvider.background.bind(mockImageProvider);
      vi.spyOn(mockImageProvider, "background").mockImplementation(
        async (brief) => {
          await writeFile(join(f.dir, a.id), await png("red"));
          // Reopening a source during composition is a regression: it would consume red bytes.
          const read = f.media.read.bind(f.media);
          vi.spyOn(f.media, "read").mockImplementation(async (key) => {
            if (key === a.id) {
              await writeFile(join(f.dir, a.id), original);
              return original;
            }
            return read(key);
          });
          return background(brief);
        },
      );
      const j = await completed(f),
        o = await f.service.output(f.actor, f.p.id, j.id, true);
      const { compose } = await import("../src/creative/provider");
      expect(o.bytes).toEqual(
        await compose(j.brief, await background(j.brief), original),
      );
      expect(o.metadata.sourceHashes).toEqual([a.hash]);
      expect(o.metadata.outputHash).not.toBe(a.hash);
    });
    it("rejects a source changed while rendering before publishing any completed output", async () => {
      const f = await fixture(),
        a = await source(f),
        background = mockImageProvider.background.bind(mockImageProvider);
      vi.spyOn(mockImageProvider, "background").mockImplementation(
        async (brief) => {
          await writeFile(join(f.dir, a.id), await png("red"));
          return background(brief);
        },
      );
      const j = await f.service.enqueue(f.actor, f.p.id, "image", f.command());
      await f.service.processImage(f.actor, f.p.id, j.id);
      expect((await f.service.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
        state: "failed",
        attached: false,
      });
      expect((await raw(f)).jobs[0].outputKey).toBeUndefined();
    });
    it("keeps source pixels unchanged and exports only an allowlisted privacy manifest", async () => {
      const f = await fixture(),
        a = await source(f),
        before = await f.media.read(a.id),
        j = await completed(f),
        o = await f.service.output(f.actor, f.p.id, j.id, true);
      expect(await f.media.read(a.id)).toEqual(before);
      expect(Object.keys(o.metadata).sort()).toEqual(
        [
          "manifestVersion",
          "demo",
          "synthetic",
          "provider",
          "generationMethod",
          "disclosure",
          "notDocumentaryEvidence",
          "outputHash",
          "post",
          "snapshot",
          "sourceHashes",
          "review",
          "manualPublishingOnly",
          "expiresAt",
        ].sort(),
      );
      const serialized = JSON.stringify(o.metadata);
      for (const id of [f.actor.id, f.p.id, j.id, a.id, f.pack.id])
        expect(serialized).not.toContain(id);
      expect(JSON.stringify({ ...o.metadata, post: undefined })).not.toContain(
        "Wir reinigen Büros in Düsseldorf.",
      );
      expect(o.metadata.disclosure).toBe("MOCK – OHNE KI GENERIERT");
    });
    it("requires regeneration of legacy disclosure without modifying approved historical bytes", async () => {
      const f = await fixture(),
        j = await completed(f),
        s = await raw(f),
        key = s.jobs[0].outputKey,
        before = await f.media.read(key);
      delete s.jobs[0].disclosureVersion;
      await pool!.query(
        "UPDATE mkt_creative_projects SET state=$2 WHERE project_id=$1",
        [f.p.id, s],
      );
      const view = (await f.service.read(f.actor, f.p.id)).jobs[0];
      expect(view).toMatchObject({
        legacyDisclosure: true,
        attached: false,
        reviewed: false,
      });
      await expect(
        f.service.output(f.actor, f.p.id, j.id, true),
      ).rejects.toMatchObject({
        code: "MOCK_DISCLOSURE_REGENERATION_REQUIRED",
      });
      expect(await f.media.read(key)).toEqual(before);
    });
    it("denies preview, review, attachment and export at the exact expiry boundary before cleanup", async () => {
      const f = await fixture(),
        j = await completed(f),
        view = (await f.service.read(f.actor, f.p.id)).jobs[0];
      f.advance(Date.parse(j.expiresAt) - Date.now() - 1);
      // Set fixture clock precisely from its own creation clock, not wall-clock test duration.
      f.advance(100); // safely beyond deadline; exact boundary covered by constructing service below
      const exact = new CreativeService(
        pool!,
        f.media,
        () => new Date(j.expiresAt),
      );
      const before = new CreativeService(
        pool!,
        f.media,
        () => new Date(Date.parse(j.expiresAt) - 1),
      );
      expect((await before.read(f.actor, f.p.id)).jobs[0].attached).toBe(true);
      for (let i = 0; i < 2; i++)
        expect((await exact.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
          state: "expired",
          attached: false,
          reviewed: false,
          expired: true,
        });
      for (const op of [
        () => exact.output(f.actor, f.p.id, j.id),
        () => exact.output(f.actor, f.p.id, j.id, true),
        () => exact.attach(f.actor, f.p.id, j.id),
        () =>
          exact.review(f.actor, f.p.id, j.id, {
            outputHash: view.outputHash,
            imageReviewed: true,
            textReviewed: true,
            syntheticAcknowledged: true,
          }),
      ])
        await expect(op()).rejects.toMatchObject({
          code: "CREATIVE_UNAVAILABLE",
        });
      expect((await raw(f)).jobs[0].state).toBe("completed");
    });
    it.each(["before unlink", "after unlink"])(
      "persists failed source deletion %s and safely retries the original revision",
      async (faultAt) => {
        const f = await fixture(),
          a = await source(f),
          remove = f.media.remove.bind(f.media);
        const fault = vi
          .spyOn(f.media, "remove")
          .mockImplementation(async (key) => {
            if (faultAt === "after unlink") await remove(key);
            throw new Error("disk failure or lost unlink acknowledgement");
          });
        expect(
          await f.service.deleteAsset(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
          }),
        ).toMatchObject({ cleanupPending: true });
        expect((await raw(f)).pendingDeletes).toContain(a.id);
        await expect(
          f.service.assetBytes(f.actor, f.p.id, a.id),
        ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
        fault.mockImplementation(remove);
        expect(
          await f.service.deleteAsset(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
          }),
        ).toMatchObject({ cleanupPending: false });
        expect((await raw(f)).pendingDeletes).toEqual([]);
        await expect(readFile(join(f.dir, a.id))).rejects.toThrow();
      },
    );
    it("retains failed expired-output deletion keys until a verified idempotent retry succeeds", async () => {
      const f = await fixture(),
        j = await completed(f),
        key = (await raw(f)).jobs[0].outputKey,
        remove = f.media.remove.bind(f.media);
      f.advance(25 * 60 * 60 * 1000);
      const fault = vi
        .spyOn(f.media, "remove")
        .mockRejectedValue(new Error("disk failure"));
      await f.service.expire(f.actor, f.p.id);
      expect((await raw(f)).pendingDeletes).toContain(key);
      expect((await raw(f)).jobs[0].outputKey).toBe(key);
      await expect(
        f.service.output(f.actor, f.p.id, j.id),
      ).rejects.toMatchObject({ code: "CREATIVE_UNAVAILABLE" });
      fault.mockImplementation(remove);
      await f.service.expire(f.actor, f.p.id);
      const versions = async () =>
        Number(
          (
            await pool!.query(
              "SELECT count(*) AS n FROM mkt_creative_versions WHERE project_id=$1",
              [f.p.id],
            )
          ).rows[0].n,
        );
      const beforeRetry = await versions();
      await f.service.expire(f.actor, f.p.id);
      expect(await versions()).toBe(beforeRetry);
      expect((await raw(f)).pendingDeletes).toEqual([]);
      expect((await raw(f)).jobs[0].outputKey).toBeUndefined();
    });
    it.each(["success", "failure"])(
      "recovers interrupted jobs without releasing unknown reservations, including late %s callbacks",
      async (outcome) => {
        const f = await fixture(),
          j = await f.service.enqueue(f.actor, f.p.id, "image", f.command()),
          background = mockImageProvider.background.bind(mockImageProvider);
        vi.spyOn(mockImageProvider, "background").mockImplementation(
          async (brief) => {
            f.advance(16 * 60 * 1000);
            expect(await f.service.recoverInterrupted(f.actor, f.p.id)).toEqual(
              {
                interrupted: 1,
              },
            );
            expect(await f.service.recoverInterrupted(f.actor, f.p.id)).toEqual(
              {
                interrupted: 0,
              },
            );
            if (outcome === "failure") throw new Error("late mock failure");
            return background(brief);
          },
        );
        await f.service.processImage(f.actor, f.p.id, j.id);
        expect((await raw(f)).jobs[0]).toMatchObject({
          state: "failed",
          error: "LOCAL_JOB_INTERRUPTED",
        });
        expect(
          (await f.service.read(f.actor, f.p.id)).usage.entries[0],
        ).toMatchObject({ uncertain: 1, active: 1, committed: 100000 });
        await f.service.expire(f.actor, f.p.id);
        expect(
          (await f.service.read(f.actor, f.p.id)).usage.entries[0].uncertain,
        ).toBe(1);
      },
    );
    it("keeps video manifest mock-only and minimizes its downloaded bytes", async () => {
      const f = await fixture(),
        j = await f.service.enqueue(f.actor, f.p.id, "video", f.command());
      await f.service.advanceVideo(f.actor, f.p.id, j.id);
      await f.service.advanceVideo(f.actor, f.p.id, j.id);
      const o = await f.service.output(f.actor, f.p.id, j.id),
        manifest = JSON.parse(o.bytes.toString());
      expect(o.mime).toBe("application/json");
      expect(manifest).toMatchObject({
        playableVideo: false,
        disclosure: "MOCK-VIDEOMANIFEST – KEIN VIDEO",
        notDocumentaryEvidence: true,
      });
      expect(manifest.brief).toBeUndefined();
      expect(o.bytes.toString()).not.toContain(f.actor.id);
      expect(o.bytes.toString()).not.toContain(f.pack.id);
    });
    it("prunes only old orphans and pending files; preserves tenant references and waits for writers", async () => {
      const f = await fixture(),
        a = await source(f),
        orphan = randomUUID(),
        fresh = randomUUID(),
        pending = randomUUID() + ".pending";
      await f.media.write(orphan, await png());
      await f.media.write(fresh, await png());
      await writeFile(join(f.dir, pending), "interrupted");
      const old = new Date(Date.now() - 26 * 60 * 60 * 1000);
      for (const key of [a.id, orphan, pending])
        await utimes(join(f.dir, key), old, old);
      const client = await pool!.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock_shared(745012324)");
      let finished = false;
      const pruning = pruneOrphanNamespace(pool!, f.media).then((v) => {
        finished = true;
        return v;
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(finished).toBe(false);
      await client.query("COMMIT");
      client.release();
      expect(await pruning).toMatchObject({ removed: 2, failed: 0 });
      expect(await f.media.read(a.id)).toBeDefined();
      expect(await f.media.read(fresh)).toBeDefined();
      expect(await pruneOrphanNamespace(pool!, f.media)).toMatchObject({
        removed: 0,
        failed: 0,
      });
    });
  },
);

describe("Creative-02 atomic storage regressions", () => {
  it("retries failed orphan unlink without losing the file or following foreign paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "creative-02-prune-"));
    directories.push(dir);
    const media = new PrivateMedia(dir),
      id = randomUUID();
    await media.write(id, await png());
    const old = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await utimes(join(dir, id), old, old);
    await chmod(dir, 0o500);
    try {
      expect(
        await media.pruneOrphans(
          new Set(),
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        ),
      ).toMatchObject({ failed: 1, removed: 0 });
    } finally {
      await chmod(dir, 0o700);
    }
    expect(await media.read(id)).toBeDefined();
    expect(
      await media.pruneOrphans(
        new Set(),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      ),
    ).toMatchObject({ failed: 0, removed: 1 });
    expect(await media.pruneOrphans(new Set(), new Date())).toMatchObject({
      failed: 0,
      removed: 0,
    });
  });
  it("publishes complete immutable bytes; duplicate publication cannot overwrite and pending faults are recoverable", async () => {
    const dir = await mkdtemp(join(tmpdir(), "creative-02-storage-"));
    directories.push(dir);
    const media = new PrivateMedia(dir),
      id = randomUUID(),
      data = await png();
    await media.write(id, data);
    await expect(media.write(id, await png("red"))).rejects.toThrow();
    expect(await media.read(id)).toEqual(data);
    const old = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await utimes(join(dir, id + ".pending"), old, old);
    expect(
      await media.pruneOrphans(
        new Set([id]),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      ),
    ).toEqual({ removed: 1, failed: 0, retained: 1 });
    expect(await media.read(id)).toEqual(data);
  });
});
