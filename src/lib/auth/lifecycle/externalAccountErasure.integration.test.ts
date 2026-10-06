import { describe, expect, it } from "vitest";

import { eraseExternalAccountData } from "./externalAccountErasure";

describe("external erasure integration boundary", () => {
  it("has no implicit providers when none are supplied", async () => {
    await expect(eraseExternalAccountData({ userId: "user-123", erasers: [] }))
      .resolves.toEqual([]);
  });
});
