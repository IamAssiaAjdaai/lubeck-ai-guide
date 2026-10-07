import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { LocalFilesystemMediaObjectStore } from "@/lib/media/storage/localFilesystemObjectStore.server";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("LocalFilesystemMediaObjectStore", () => {
  it("writes, inspects, ranges, previews, and deletes media locally", async () => {
    const root = await mkdtemp(join(tmpdir(), "citywalk-media-"));
    roots.push(root);
    const store = new LocalFilesystemMediaObjectStore(root);
    const key = "media/11111111-1111-4111-8111-111111111111/original.jpg";
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0x01, 0x02]);

    await expect(
      store.createUploadUrl({
        objectKey: key,
        contentType: "image/jpeg",
        expiresInSeconds: 300,
      }),
    ).resolves.toBe(
      `/api/admin/media/local-object?objectKey=${encodeURIComponent(key)}`,
    );

    await store.writeObject(key, bytes, "image/jpeg");
    await expect(store.headObject(key)).resolves.toMatchObject({
      sizeBytes: 5,
      contentType: "image/jpeg",
      checksumSha256: expect.any(String),
    });
    await expect(store.readObjectRange(key, 1, 3)).resolves.toEqual(
      Uint8Array.from([0xd8, 0xff, 0x01]),
    );

    const ranged = await store.readObject(key, "bytes=2-4");
    expect(ranged).toMatchObject({
      contentLength: 3,
      contentRange: "bytes 2-4/5",
    });
    const rangedBytes = new Uint8Array(
      await new Response(ranged?.body).arrayBuffer(),
    );
    expect(rangedBytes).toEqual(Uint8Array.from([0xff, 0x01, 0x02]));

    await expect(store.getAdminPreviewUrl(key)).resolves.toBe(
      `/api/admin/media/local-object?objectKey=${encodeURIComponent(key)}`,
    );

    await store.deleteObject(key);
    await expect(store.headObject(key)).resolves.toBeUndefined();
  });

  it("rejects path traversal outside the local media directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "citywalk-media-"));
    roots.push(root);
    const store = new LocalFilesystemMediaObjectStore(root);

    await expect(
      store.writeObject("../escape.jpg", Uint8Array.from([1]), "image/jpeg"),
    ).rejects.toThrow(/Invalid local media object key/);
    await expect(readFile(join(root, "..", "escape.jpg"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
