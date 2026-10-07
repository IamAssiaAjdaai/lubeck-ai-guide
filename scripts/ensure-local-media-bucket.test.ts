import { describe, expect, it, vi } from "vitest";

import { ensureLocalMediaBucket } from "./ensure-local-media-bucket.mjs";

describe("local media bucket bootstrap", () => {
  it("creates the bucket and browser upload CORS policy", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await ensureLocalMediaBucket({ send } as never);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0].input).toEqual({ Bucket: "citywalk-local" });
    expect(send.mock.calls[1]?.[0].input).toMatchObject({
      Bucket: "citywalk-local",
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD", "PUT"],
            AllowedOrigins: [
              "http://localhost:3000",
              "http://127.0.0.1:3000",
            ],
            ExposeHeaders: ["ETag"],
          },
        ],
      },
    });
  });

  it("keeps bucket setup idempotent", async () => {
    const send = vi.fn()
      .mockRejectedValueOnce({ name: "BucketAlreadyOwnedByYou" })
      .mockResolvedValueOnce({});

    await expect(
      ensureLocalMediaBucket({ send } as never),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("surfaces unexpected object-storage errors", async () => {
    const failure = new Error("storage unavailable");
    const send = vi.fn().mockRejectedValueOnce(failure);

    await expect(
      ensureLocalMediaBucket({ send } as never),
    ).rejects.toBe(failure);
  });
});
