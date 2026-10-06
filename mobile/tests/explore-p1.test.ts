import { describe, expect, it } from "vitest";

import exploreSource from "../src/app/city/[citySlug]/explore.tsx?raw";
import chromeSource from "../src/components/NativeChrome.tsx?raw";
import tabNavigationSource from "../src/lib/tabNavigation.tsx?raw";

describe("Explore P1 presentation", () => {
  it("routes the Explore tab to the dedicated city Explore root", () => {
    expect(chromeSource).toContain('pathname: "/city/[citySlug]/explore"');
    expect(chromeSource).toContain("`/city/${citySlug}/explore`");
    expect(tabNavigationSource).toContain('/^\\/city\\/[^/]+\\/explore$/');
    expect(tabNavigationSource).toContain('route.name === "city/[citySlug]/explore"');
  });

  it("keeps Explore dense and search-first", () => {
    expect(exploreSource).toContain("<TextInput");
    expect(exploreSource).toContain('variant="chips"');
    expect(exploreSource).toContain('variant="segment"');
    expect(exploreSource).toContain("<NativeCityMap");
    expect(exploreSource).toContain("<WalkMembershipControl");
    expect(exploreSource).toContain("dense");
    expect(exploreSource).toContain("inline");
  });
});
