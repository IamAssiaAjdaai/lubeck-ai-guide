// @vitest-environment node
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { Pool } from "pg";
import { configuration } from "../config";
import { ProjectStore } from "../store";
import { PackService } from "../packs";
import { createApi } from "../server";
import { PrivateMedia } from "./storage";
import { CreativeService } from "./service";
import { normalizeImage, digest, compose, mockImageProvider } from "./provider";
import { initialState, type Brief } from "./contract";

const bytes = () =>
  sharp({
    create: { width: 64, height: 64, channels: 4, background: "#D0EB8D" },
  })
    .png()
    .toBuffer();
const directories: string[] = [];
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "creative-test-"));
  directories.push(dir);
  return dir;
}
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  for (const dir of directories)
    await rm(dir, { recursive: true, force: true });
});
const noNetwork = () => {
  const fn = vi.fn(() => {
    throw new Error("NO_EXTERNAL_REQUESTS");
  });
  vi.stubGlobal("fetch", fn);
  return fn;
};
const brief: Brief = {
  schemaVersion: 1,
  synthetic: true,
  objective: "leistung_erklaeren",
  ratio: "4:5",
  facts: [{ id: "f", statement: "Wir reinigen Büros." }],
  editorialText: "Ein redaktioneller Post",
  constraints: [],
  kit: initialState().kit,
  binding: {
    generationId: randomUUID(),
    version: 1,
    postIndex: 0,
    postHash: "x",
    contextRevision: 2,
    contextHash: "c",
    kitRevision: 0,
    assets: [],
  },
};
describe("offline creative media validation and compositing", () => {
  it("canonicalizes object key order but preserves ordered editorial data", () => {
    expect(digest({ a: 1, b: { y: 2, x: 3 } })).toBe(
      digest({ b: { x: 3, y: 2 }, a: 1 }),
    );
    expect(digest(["post1", "post2"])).not.toBe(digest(["post2", "post1"]));
  });
  it("accepts and normalizes real PNG/JPEG/WebP; strips metadata", async () => {
    for (const format of ["png", "jpeg", "webp"] as const) {
      const raw = await sharp(await bytes())
        .toFormat(format)
        .withMetadata()
        .toBuffer();
      const r = await normalizeImage(raw, `image/${format}`);
      expect(r.info.format).toBe("png");
      expect((await sharp(r.data).metadata()).exif).toBeUndefined();
    }
  });
  it.each(["image/svg+xml", "text/html", "application/octet-stream"])(
    "rejects active or unsupported MIME %s",
    async (mime) => {
      await expect(normalizeImage(await bytes(), mime)).rejects.toThrow(
        "IMAGE_TYPE_REJECTED",
      );
    },
  );
  it("rejects spoofed MIME, corrupt, oversize, tiny, oversized dimensions and animation", async () => {
    await expect(normalizeImage(await bytes(), "image/jpeg")).rejects.toThrow();
    await expect(
      normalizeImage(Buffer.from("not an image"), "image/png"),
    ).rejects.toThrow();
    await expect(
      normalizeImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///never-read"/></svg>',
        ),
        "image/png",
      ),
    ).rejects.toThrow("IMAGE_MAGIC_REJECTED");
    await expect(
      normalizeImage(Buffer.alloc(3 * 1024 * 1024 + 1), "image/png"),
    ).rejects.toThrow("IMAGE_SIZE_LIMIT");
    for (const width of [1, 4097])
      await expect(
        normalizeImage(
          await sharp({
            create: { width, height: 20, channels: 3, background: "white" },
          })
            .png()
            .toBuffer(),
          "image/png",
        ),
      ).rejects.toThrow();
    // Distinct colored frames prevent the WebP encoder coalescing identical pages.
    const frames = Buffer.alloc(32 * 64 * 3);
    for (let pixel = 0; pixel < 32 * 64; pixel++)
      frames[pixel * 3 + (pixel < 32 * 32 ? 0 : 2)] = 255;
    const animated = await sharp(frames, {
      raw: { width: 32, height: 64, channels: 3, pageHeight: 32 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    expect((await sharp(animated, { animated: true }).metadata()).pages).toBe(
      2,
    );
    await expect(normalizeImage(animated, "image/webp")).rejects.toThrow();
  });
  it("renders deterministic branded mock pixels without fetch, even with a key present", async () => {
    const fetch = noNetwork();
    const prior = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "synthetic-do-not-call";
    try {
      const a = await compose(brief, await mockImageProvider.background(brief));
      const b = await compose(brief, await mockImageProvider.background(brief));
      expect(digest(a)).toBe(digest(b));
      expect((await sharp(a).metadata()).width).toBe(800);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      if (prior === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prior;
    }
  });
  it("uses private permissions and opaque keys; refuses symlink reads", async () => {
    const storage = new PrivateMedia(await directory()),
      id = randomUUID();
    await expect(
      storage.write(randomUUID(), Buffer.alloc(8 * 1024 * 1024 + 1)),
    ).rejects.toThrow("PRIVATE_ASSET_SIZE_LIMIT");
    await storage.write(id, await bytes());
    expect((await stat(join(storage.directory, id))).mode & 0o077).toBe(0);
    expect(await storage.read(id)).toEqual(await bytes());
    await expect(storage.read("../../etc/passwd")).rejects.toThrow();
    const link = randomUUID();
    await symlink(join(storage.directory, id), join(storage.directory, link));
    await expect(storage.read(link)).rejects.toThrow();
    await storage.remove(id);
    await expect(storage.read(id)).rejects.toThrow();
  });
  it("blocks non-loopback fetch and socket connections in a guarded subprocess", () => {
    const result = execFileSync(
      process.execPath,
      [
        "--import",
        "./scripts/marketing-creative-offline-guard.mjs",
        "--input-type=module",
        "-e",
        `import net from 'node:net';let blocked=0;try{await fetch('https://api.openai.com/v1/images')}catch(e){if(e.message==='CREATIVE_OFFLINE_NETWORK_BLOCKED')blocked++}try{net.connect({host:'api.seedance.example',port:443})}catch(e){if(e.message==='CREATIVE_OFFLINE_NETWORK_BLOCKED')blocked++}if(blocked!==2)process.exit(1);console.log('OFFLINE_BLOCKED_2')`,
      ],
      { encoding: "utf8" },
    );
    expect(result).toContain("OFFLINE_BLOCKED_2");
  });
  it("requires demo mode for the creative capability", () => {
    expect(() =>
      configuration({
        MARKETING_DATABASE_URL:
          "postgresql://qa@127.0.0.1:55499/marketing_creative_01_qa",
        MARKETING_AUTH_SECRET: "synthetic-secret-at-least-32-characters",
        MARKETING_CREATIVE_QA_ENABLED: "true",
      }),
    ).toThrow("CREATIVE_QA_REQUIRES_DEMO");
  });
});
const enabled = !!process.env.MARKETING_CREATIVE_TEST_DATABASE_URL;
const config = enabled
  ? configuration({
      MARKETING_DATABASE_URL: process.env.MARKETING_CREATIVE_TEST_DATABASE_URL,
      MARKETING_AUTH_SECRET: "synthetic-secret-at-least-32-characters",
      MARKETING_DEMO_MODE: "true",
      MARKETING_CREATIVE_QA_ENABLED: "true",
    })
  : null;
const pool = config
  ? new Pool({ connectionString: config.databaseUrl, max: 12 })
  : null;
afterAll(() => pool?.end());
async function fixture() {
  const actor = { id: randomUUID() };
  await pool!.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [actor.id, "Synthetic Creative QA", `creative-${actor.id}@example.test`],
  );
  const store = new ProjectStore(pool!),
    p = await store.create(actor, "Synthetische Büroreinigung");
  await store.revise(actor, p.id, 0, {
    rawText: "Synthetic only",
    identity: { name: "Synthetische Büroreinigung" },
    facts: [
      { id: "office", statement: "Wir reinigen Büros in Düsseldorf." },
      { id: "unapproved", statement: "Garantierte 90 Prozent Ersparnis." },
    ],
  });
  await store.confirm(actor, p.id, 1, ["office"]);
  const packs = new PackService(pool!, true),
    pack = await packs.generate(actor, p.id, {
      expectedRevision: 2,
      goal: "mehr_anfragen",
      audience: "Büroleitungen",
      language: "de-DE",
      channels: ["linkedin"],
      idempotencyKey: randomUUID(),
    });
  let time = Date.now();
  const service = new CreativeService(
    pool!,
    new PrivateMedia(await directory()),
    () => new Date(time),
  );
  const command = {
    generationId: pack.id,
    expectedVersion: 1,
    postIndex: 0,
    objective: "leistung_erklaeren",
    ratio: "4:5",
    idempotencyKey: randomUUID(),
  };
  return {
    actor,
    p,
    store,
    packs,
    pack,
    service,
    command,
    advance: (ms: number) => {
      time += ms;
    },
  };
}
async function completed(f: Awaited<ReturnType<typeof fixture>>) {
  const j = await f.service.enqueue(f.actor, f.p.id, "image", f.command);
  await f.service.processImage(f.actor, f.p.id, j.id);
  return (await f.service.read(f.actor, f.p.id)).jobs.find(
    (v) => v.id === j.id,
  )!;
}
async function approve(
  f: Awaited<ReturnType<typeof fixture>>,
  job: { id: string; outputHash?: string },
) {
  await f.service.review(f.actor, f.p.id, job.id, {
    outputHash: job.outputHash,
    imageReviewed: true,
    textReviewed: true,
    syntheticAcknowledged: true,
  });
  await f.service.attach(f.actor, f.p.id, job.id);
}
describe.skipIf(!enabled)(
  "Creative PostgreSQL isolation, lifecycle, immutable bindings and accounting",
  () => {
    it("carries unresolved reservations and concurrency across UTC month boundaries", async () => {
      const f = await fixture(),
        j = await f.service.enqueue(f.actor, f.p.id, "video", f.command);
      await f.service.advanceVideo(f.actor, f.p.id, j.id);
      await f.service.advanceVideo(f.actor, f.p.id, j.id, "timeout");
      f.advance(40 * 24 * 60 * 60 * 1000);
      expect(
        (await f.service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ attempts: 0, uncertain: 1, committed: 500000 });
      await expect(
        f.service.enqueue(f.actor, f.p.id, "video", {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
    });
    it("discards late image output after processing cancellation without freeing uncertain capacity early", async () => {
      const f = await fixture(),
        job = await f.service.enqueue(f.actor, f.p.id, "image", f.command);
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      const original = mockImageProvider.background;
      const spy = vi
        .spyOn(mockImageProvider, "background")
        .mockImplementation(async (brief) => {
          await gate;
          return original(brief);
        });
      try {
        const running = f.service.processImage(f.actor, f.p.id, job.id);
        await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
        await f.service.cancel(f.actor, f.p.id, job.id);
        expect(
          (await f.service.read(f.actor, f.p.id)).usage.entries[0],
        ).toMatchObject({ uncertain: 1, committed: 100000 });
        release();
        await running;
        expect((await f.service.read(f.actor, f.p.id)).jobs[0].state).toBe(
          "cancelled",
        );
        expect(
          (await f.service.read(f.actor, f.p.id)).usage.entries[0],
        ).toMatchObject({ uncertain: 0, committed: 0 });
        await expect(
          f.service.output(f.actor, f.p.id, job.id),
        ).rejects.toThrow();
      } finally {
        release();
        spy.mockRestore();
      }
    });
    it("expires queued image work before rendering and never refunds the attempt", async () => {
      const f = await fixture(),
        j = await f.service.enqueue(f.actor, f.p.id, "image", f.command);
      f.advance(25 * 60 * 60 * 1000);
      await f.service.processImage(f.actor, f.p.id, j.id);
      expect((await f.service.read(f.actor, f.p.id)).jobs[0].state).toBe(
        "expired",
      );
      expect(
        (await f.service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ attempts: 1, uncertain: 0, committed: 0 });
    });
    it("blocks another reservation when a conservative reconciled-cost lower bound exceeds budget", async () => {
      const f = await fixture(),
        j = await f.service.enqueue(f.actor, f.p.id, "image", f.command);
      // Authored vendor-overrun fixture; there is no client-accessible reconciliation API.
      await pool!.query(
        "UPDATE mkt_creative_charges SET active=false,finalized_micro_eur=1100000 WHERE id=$1",
        [j.id],
      );
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
      expect(
        (await f.service.read(f.actor, f.p.id)).usage.entries[0].committed,
      ).toBe(1100000);
    });
    it("persists upload, review, kit, mock creation, attachment and export alongside unchanged v1", async () => {
      const fetch = noNetwork(),
        f = await fixture();
      let a = await f.service.upload(
        f.actor,
        f.p.id,
        await bytes(),
        "image/png",
      );
      a = await f.service.metadata(f.actor, f.p.id, a.id, {
        expectedRevision: 1,
        name: "Synthetisches Logo",
        alt: "Grünes Testquadrat",
        role: "logo",
      });
      a = await f.service.approveAsset(f.actor, f.p.id, a.id, {
        expectedRevision: a.revision,
        rightsConfirmed: true,
        sourceConfirmed: true,
      });
      const { revision: unused, ...kit } = initialState().kit;
      void unused;
      await f.service.saveKit(f.actor, f.p.id, {
        ...kit,
        expectedRevision: 0,
        logoId: a.id,
      });
      const j = await completed(f);
      expect(j.state).toBe("completed");
      expect(j.brief.facts.map((v) => v.id)).toEqual(["office"]);
      expect(j.brief.editorialText).toBe(
        f.pack.versions[0].content.posts[0].text,
      );
      await expect(
        f.service.output(f.actor, f.p.id, j.id, true),
      ).rejects.toMatchObject({ code: "CREATIVE_REVIEW_REQUIRED" });
      await approve(f, j);
      const out = await f.service.output(f.actor, f.p.id, j.id, true);
      expect(out.mime).toBe("image/png");
      expect(out.metadata.demo).toBe(true);
      expect(out.metadata.notDocumentaryEvidence).toBe(true);
      const read = await f.service.read(f.actor, f.p.id);
      expect(read.jobs[0].attached).toBe(true);
      expect(read.usage.entries[0]).toMatchObject({
        attempts: 1,
        committed: 0,
        uncertain: 0,
      });
      expect(
        (await f.packs.read(f.actor, f.p.id, f.pack.id)).output_revision,
      ).toBe(1);
      expect((await f.packs.usage(f.actor, f.p.id)).used).toBe(1);
      expect(fetch).not.toHaveBeenCalled();
    });
    it("rejects cross-tenant media, packs, jobs, writes, forged approvals and viewer writes", async () => {
      const f = await fixture(),
        other = await fixture(),
        a = await f.service.upload(f.actor, f.p.id, await bytes(), "image/png");
      for (const call of [
        () => f.service.read(other.actor, f.p.id),
        () => f.service.assetBytes(other.actor, f.p.id, a.id),
        () =>
          f.service.upload(
            other.actor,
            f.p.id,
            Buffer.from("invalid"),
            "image/png",
          ),
        () => f.service.enqueue(other.actor, f.p.id, "image", f.command),
      ])
        await expect(call()).rejects.toMatchObject({
          code: "PROJECT_NOT_FOUND",
        });
      await expect(
        other.service.assetBytes(other.actor, other.p.id, a.id),
      ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
      await expect(
        other.service.enqueue(other.actor, other.p.id, "image", f.command),
      ).rejects.toMatchObject({ code: "PACK_NOT_FOUND" });
      await pool!.query(
        "INSERT INTO mkt_memberships(organization_id,user_id,role) VALUES($1,$2,'viewer')",
        [f.p.organization_id, other.actor.id],
      );
      await expect(
        f.service.upload(other.actor, f.p.id, await bytes(), "image/png"),
      ).rejects.toMatchObject({ code: "READ_ONLY" });
      await expect(
        f.service.approveAsset(f.actor, f.p.id, a.id, {
          expectedRevision: 1,
          rightsConfirmed: false,
          sourceConfirmed: true,
        }),
      ).rejects.toThrow();
    });
    it.each(["text", "facts", "kit", "asset", "delete"])(
      "invalidates exact approval and export after %s changes",
      async (change) => {
        const f = await fixture();
        let a = await f.service.upload(
          f.actor,
          f.p.id,
          await bytes(),
          "image/png",
        );
        a = await f.service.metadata(f.actor, f.p.id, a.id, {
          expectedRevision: 1,
          name: "Quelle",
          alt: "Synthetische Quelle",
          role: "business_photo",
        });
        a = await f.service.approveAsset(f.actor, f.p.id, a.id, {
          expectedRevision: 2,
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
        const j = await completed(f);
        await approve(f, j);
        if (change === "text")
          await f.packs.edit(f.actor, f.p.id, f.pack.id, {
            expectedVersion: 1,
            posts: ["Edited A", "Edited B", "Edited C"],
            hooks: ["A", "B", "C"],
            cta: "Kontakt",
          });
        if (change === "facts")
          await f.store.revise(f.actor, f.p.id, 2, {
            rawText: "Revision",
            identity: { name: "QA" },
            facts: [{ id: "office", statement: "Neue Aussage" }],
          });
        if (change === "kit")
          await f.service.saveKit(f.actor, f.p.id, {
            ...kit,
            expectedRevision: 1,
            colors: ["#162D2C", "#FFFFFF"],
          });
        if (change === "asset")
          await f.service.metadata(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
            name: "Geändert",
            alt: "Neue Beschreibung",
            role: "business_photo",
          });
        if (change === "delete") {
          await f.service.deleteAsset(f.actor, f.p.id, a.id, {
            expectedRevision: a.revision,
          });
          await expect(
            f.service.assetBytes(f.actor, f.p.id, a.id),
          ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
        }
        await expect(
          f.service.output(f.actor, f.p.id, j.id, true),
        ).rejects.toThrow();
        expect((await f.service.read(f.actor, f.p.id)).jobs[0].attached).toBe(
          false,
        );
      },
    );
    it("rejects stale asset and kit commands and wrong output hashes", async () => {
      const f = await fixture(),
        a = await f.service.upload(f.actor, f.p.id, await bytes(), "image/png");
      await expect(
        f.service.metadata(f.actor, f.p.id, a.id, {
          expectedRevision: 9,
          name: "X",
          alt: "X",
          role: "logo",
        }),
      ).rejects.toMatchObject({ code: "ASSET_REVISION_STALE" });
      await expect(
        f.service.saveKit(f.actor, f.p.id, {
          ...initialState().kit,
          revision: undefined,
          expectedRevision: 8,
        }),
      ).rejects.toThrow();
      const j = await completed(f);
      await expect(
        f.service.review(f.actor, f.p.id, j.id, {
          outputHash: "a".repeat(64),
          imageReviewed: true,
          textReviewed: true,
          syntheticAcknowledged: true,
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_REVIEW_STALE" });
    });
    it("atomically reserves once for duplicate requests and enforces concurrency and monthly attempts", async () => {
      const f = await fixture();
      const [a, b] = await Promise.all([
        f.service.enqueue(f.actor, f.p.id, "image", f.command),
        f.service.enqueue(f.actor, f.p.id, "image", f.command),
      ]);
      expect(a.id).toBe(b.id);
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", {
          ...f.command,
          ratio: "1:1",
        }),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      await f.service.enqueue(f.actor, f.p.id, "image", {
        ...f.command,
        idempotencyKey: randomUUID(),
      });
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
      const state = await f.service.read(f.actor, f.p.id);
      for (const j of state.jobs) await f.service.cancel(f.actor, f.p.id, j.id);
      for (let i = 2; i < 10; i++) {
        const j = await f.service.enqueue(f.actor, f.p.id, "image", {
          ...f.command,
          idempotencyKey: randomUUID(),
        });
        await f.service.cancel(f.actor, f.p.id, j.id);
      }
      await expect(
        f.service.enqueue(f.actor, f.p.id, "image", {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
      expect(
        (await f.service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ attempts: 10, committed: 0 });
    });
    it("runs video polling lifecycle with private manifest, cancellation and conservative unknown costs", async () => {
      const f = await fixture();
      const j = await f.service.enqueue(f.actor, f.p.id, "video", f.command);
      expect(j.state).toBe("queued");
      expect(await f.service.advanceVideo(f.actor, f.p.id, j.id)).toMatchObject(
        { state: "processing" },
      );
      await f.service.cancel(f.actor, f.p.id, j.id);
      expect(
        (await f.service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ kind: "video", uncertain: 1, committed: 500000 });
      await expect(
        f.service.enqueue(f.actor, f.p.id, "video", {
          ...f.command,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "CREATIVE_QUOTA_EXCEEDED" });
      await f.service.advanceVideo(f.actor, f.p.id, j.id);
      await expect(f.service.output(f.actor, f.p.id, j.id)).rejects.toThrow();
      const second = await f.service.enqueue(f.actor, f.p.id, "video", {
        ...f.command,
        idempotencyKey: randomUUID(),
      });
      await f.service.advanceVideo(f.actor, f.p.id, second.id);
      await f.service.advanceVideo(f.actor, f.p.id, second.id, "timeout");
      expect(
        (await f.service.read(f.actor, f.p.id)).usage.entries[0],
      ).toMatchObject({ uncertain: 1, committed: 500000 });
      await f.service.advanceVideo(f.actor, f.p.id, second.id, "success");
      const third = await f.service.enqueue(f.actor, f.p.id, "video", {
        ...f.command,
        idempotencyKey: randomUUID(),
      });
      await f.service.advanceVideo(f.actor, f.p.id, third.id);
      await f.service.advanceVideo(f.actor, f.p.id, third.id);
      const out = await f.service.output(f.actor, f.p.id, third.id);
      expect(JSON.parse(out.bytes.toString())).toMatchObject({
        playableVideo: false,
        kind: "mock-video-manifest",
      });
      f.advance(25 * 60 * 60 * 1000);
      await expect(
        f.service.output(f.actor, f.p.id, third.id),
      ).rejects.toThrow();
      await f.service.expire(f.actor, f.p.id);
      expect(
        (await f.service.read(f.actor, f.p.id)).jobs.find(
          (v) => v.id === third.id,
        )?.state,
      ).toBe("expired");
    });
    it.each(["queued", "processing", "failed"])(
      "handles video expiry/error from %s",
      async (state) => {
        const f = await fixture(),
          j = await f.service.enqueue(f.actor, f.p.id, "video", f.command);
        if (state !== "queued")
          await f.service.advanceVideo(f.actor, f.p.id, j.id);
        if (state === "failed") {
          await f.service.advanceVideo(f.actor, f.p.id, j.id, "failure");
          expect((await f.service.read(f.actor, f.p.id)).jobs[0].state).toBe(
            "failed",
          );
        }
        f.advance(25 * 60 * 60 * 1000);
        await f.service.expire(f.actor, f.p.id);
        expect((await f.service.read(f.actor, f.p.id)).jobs[0].state).toBe(
          "expired",
        );
        expect(
          (await f.service.read(f.actor, f.p.id)).usage.entries[0].uncertain,
        ).toBe(state === "processing" ? 1 : 0);
      },
    );
    it("gates API routes by session, origin, flag and project; exposes no video admission or storage key", async () => {
      const f = await fixture();
      const auth = {
        api: {
          getSession: async () => ({
            user: { id: f.actor.id, emailVerified: true },
          }),
        },
        handler: async () => new Response("mock auth"),
      } as never;
      const cfg = { ...config!, mediaDirectory: f.service.media.directory },
        api = createApi(pool!, cfg, auth),
        url = `${cfg.origin}/api/projects/${f.p.id}/creative`;
      expect((await api(new Request(url))).status).toBe(200);
      expect(
        (await api(new Request(url + "/jobs", { method: "POST", body: "{}" })))
          .status,
      ).toBe(403);
      const bad = await api(
        new Request(url + "/jobs", {
          method: "POST",
          headers: { origin: cfg.origin },
          body: JSON.stringify({ ...f.command, kind: "video" }),
        }),
      );
      expect(bad.status).toBe(400);
      const disabled = createApi(pool!, { ...cfg, creative: false }, auth);
      expect((await disabled(new Request(url))).status).toBe(404);
      expect(
        await (
          await disabled(new Request(cfg.origin + "/api/creative-capabilities"))
        ).json(),
      ).toMatchObject({ enabled: false, videoControl: false });
      const anonymous = createApi(pool!, cfg, {
        api: { getSession: async () => null },
        handler: async () => new Response(),
      } as never);
      expect((await anonymous(new Request(url))).status).toBe(401);
      const j = await completed(f);
      const read = JSON.stringify(await (await api(new Request(url))).json());
      expect(read).not.toContain("outputKey");
      expect(read).not.toContain(f.service.media.directory);
      expect(read).toContain(j.id);
    });
  },
);
