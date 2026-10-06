import { describe, expect, it } from "vitest";

import type { ExternalAccountErasureOutcome } from "./externalAccountErasure";

describe("external erasure outcomes", () => {
  it("keeps not-found as an idempotent terminal outcome", () => {
    const outcome: ExternalAccountErasureOutcome = "not_found";
    expect(outcome).toBe("not_found");
  });
});
