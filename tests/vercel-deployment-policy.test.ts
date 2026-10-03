import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Vercel deployment policy", () => {
  it("keeps automatic Git deployments disabled", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };

    expect(config.git?.deploymentEnabled).toBe(false);
  });
});
