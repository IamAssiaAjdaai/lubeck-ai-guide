import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/city/[citySlug]/guide/[placeSlug].tsx"),
  "utf8",
);

describe("AI Guide Premium P3", () => {
  it("upgrades exhausted Free allowance inside the native Premium funnel", () => {
    expect(source).toMatch(/const showPremiumUpgrade = limitReached && allowance\?\.tier === "free"/);
    expect(source).toMatch(/router\.navigate\("\/premium"\)/);
    expect(source).toMatch(/messages\.guideUnlockPass/);
    expect(source).not.toMatch(/guideUpgradePath/);
  });

  it("keeps Premium exhaustion as a limit state without a misleading upsell", () => {
    expect(source).toMatch(/allowance\?\.tier === "premium" \? messages\.guidePremiumLimitTitle/);
    expect(source).toMatch(/showPremiumUpgrade \? \(/);
    expect(source).toMatch(/allowance\?\.tier === "free"/);
  });

  it("continues to trust server-returned allowance tiers", () => {
    expect(source).toMatch(/setAllowance\(result\.allowance\)/);
    expect(source).toMatch(/if \(apiError\?\.allowance\) setAllowance\(apiError\.allowance\)/);
  });
});
