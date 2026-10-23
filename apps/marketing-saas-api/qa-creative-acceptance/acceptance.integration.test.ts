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
import { digest, mockImageProvider } from "../src/creative/provider";
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
const observations: Record<string, unknown> = {};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  if (pool)
    await writeFile(
      process.env.MARKETING_CREATIVE_OBSERVATIONS_PATH ??
        "docs/qa/marketing-saas/creative-02/updated-acceptance-observations.json",
      JSON.stringify(observations, null, 2) + "\n",
    );
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
  const service = new CreativeService(
    pool!,
    new PrivateMedia(dir),
    () => new Date(time),
  );
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
describe.skipIf(!pool)("independent Creative acceptance audit", () => {
  it("shares per-kind organization concurrency across projects while image and video limits remain independent", async () => {
    const f = await fixture(),
      second = await f.project();
    expect(second.p.organization_id).toBe(f.p.organization_id);
    const c = f.command();
    const duplicates = await Promise.all(
      Array.from({ length: 6 }, () =>
        f.service.enqueue(f.actor, f.p.id, "image", c),
      ),
    );
    expect(new Set(duplicates.map((j) => j.id)).size).toBe(1);
    await f.service.enqueue(
      f.actor,
      second.p.id,
      "image",
      f.command(second.pack.id),
    );
    await expect(
      f.service.enqueue(
        f.actor,
        second.p.id,
        "image",
        f.command(second.pack.id),
      ),
    ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
    const video = await f.service.enqueue(
      f.actor,
      second.p.id,
      "video",
      f.command(second.pack.id),
    );
    await expect(
      f.service.enqueue(f.actor, f.p.id, "video", f.command()),
    ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
    const usage = (await f.service.read(f.actor, f.p.id)).usage.entries;
    expect(usage.find((v) => v.kind === "image")).toMatchObject({
      attempts: 2,
      committed: 200000,
      active: 2,
    });
    expect(usage.find((v) => v.kind === "video")).toMatchObject({
      attempts: 1,
      committed: 500000,
      active: 1,
    });
    await f.service.cancel(f.actor, second.p.id, video.id);
    expect(
      (await f.service.read(f.actor, f.p.id)).usage.entries.find(
        (v) => v.kind === "video",
      ),
    ).toMatchObject({ attempts: 1, committed: 0, active: 0 });
  });
  it("settles a known image mock failure without refunding attempts or retrying duplicates", async () => {
    const f = await fixture(),
      command = f.command(),
      j = await f.service.enqueue(f.actor, f.p.id, "image", command);
    const provider = vi
      .spyOn(mockImageProvider, "background")
      .mockRejectedValue(new Error("Authored mock failure"));
    await f.service.processImage(f.actor, f.p.id, j.id);
    await f.service.processImage(f.actor, f.p.id, j.id);
    expect(provider).toHaveBeenCalledTimes(1);
    const duplicate = await f.service.enqueue(
      f.actor,
      f.p.id,
      "image",
      command,
    );
    expect(duplicate.id).toBe(j.id);
    expect(duplicate.state).toBe("failed");
    expect(
      (await f.service.read(f.actor, f.p.id)).usage.entries[0],
    ).toMatchObject({ attempts: 1, uncertain: 0, active: 0, committed: 0 });
    await expect(f.service.output(f.actor, f.p.id, j.id)).rejects.toMatchObject(
      { code: "CREATIVE_UNAVAILABLE" },
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("denies expired output and clears attachment/review availability before cleanup", async () => {
    const f = await fixture(),
      j = await f.service.enqueue(f.actor, f.p.id, "image", f.command());
    await f.service.processImage(f.actor, f.p.id, j.id);
    const rendered = (await f.service.read(f.actor, f.p.id)).jobs[0];
    await f.service.review(f.actor, f.p.id, j.id, {
      outputHash: rendered.outputHash,
      imageReviewed: true,
      textReviewed: true,
      syntheticAcknowledged: true,
    });
    await f.service.attach(f.actor, f.p.id, j.id);
    f.advance(25 * 60 * 60 * 1000);
    const expired = (await f.service.read(f.actor, f.p.id)).jobs[0];
    expect(expired.expired).toBe(true);
    expect(expired.state).toBe("expired");
    expect(expired.attached).toBe(false);
    expect(expired.reviewed).toBe(false);
    await expect(
      f.service.output(f.actor, f.p.id, j.id, true),
    ).rejects.toMatchObject({ code: "CREATIVE_UNAVAILABLE" });
    observations.unsweptExpiredAttachment = {
      state: expired.state,
      expired: expired.expired,
      attached: expired.attached,
      exportDenied: true,
    };
    await f.service.expire(f.actor, f.p.id);
    expect((await f.service.read(f.actor, f.p.id)).jobs[0].attached).toBe(
      false,
    );
  });
  it("rejects modified approved sources before preview, admission and export", async () => {
    const f = await fixture(),
      original = await png(),
      replacement = await png("#C8BCEE");
    let a = await f.service.upload(f.actor, f.p.id, original, "image/png");
    a = await f.service.metadata(f.actor, f.p.id, a.id, {
      expectedRevision: a.revision,
      name: "Synthetisches Logo",
      alt: "Grünes QA-Quadrat",
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
    const j = await f.service.enqueue(f.actor, f.p.id, "image", f.command());
    await f.service.processImage(f.actor, f.p.id, j.id);
    const rendered = (await f.service.read(f.actor, f.p.id)).jobs[0];
    await f.service.review(f.actor, f.p.id, j.id, {
      outputHash: rendered.outputHash,
      imageReviewed: true,
      textReviewed: true,
      syntheticAcknowledged: true,
    });
    await f.service.attach(f.actor, f.p.id, j.id);
    expect(
      (await f.service.output(f.actor, f.p.id, j.id, true)).metadata
        .sourceHashes,
    ).toContain(a.hash);
    await writeFile(join(f.service.media.directory, a.id), replacement);
    for (const action of [
      () => f.service.assetBytes(f.actor, f.p.id, a.id),
      () => f.service.enqueue(f.actor, f.p.id, "image", f.command()),
      () => f.service.output(f.actor, f.p.id, j.id, true),
    ])
      await expect(action()).rejects.toMatchObject({
        code: "ASSET_INTEGRITY_FAILED",
      });
    expect((await f.service.read(f.actor, f.p.id)).jobs[0]).toMatchObject({
      stale: true,
      attached: false,
      reviewed: false,
    });
    observations.sourceIntegrity = {
      approvedHash: a.hash,
      replacementHash: digest(replacement),
      assetPreviewDenied: true,
      admissionDenied: true,
      exportDenied: true,
    };
  });
});
