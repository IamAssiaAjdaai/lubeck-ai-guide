import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Legacy Vercel integration guard", () => {
  it("keeps Git-triggered Vercel deployments disabled while the integration remains connected", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };

    expect(config.git?.deploymentEnabled).toBe(false);
  });
});
