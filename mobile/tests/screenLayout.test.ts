import { describe, expect, it } from "vitest";

import { getScreenSafeAreaEdges, SCREEN_TOP_SPACING } from "../src/lib/screenLayout";

describe("native screen layout", () => {
  it("adds a restrained visual gap after the safe area", () => {
    expect(SCREEN_TOP_SPACING).toBeGreaterThanOrEqual(12);
    expect(SCREEN_TOP_SPACING).toBeLessThanOrEqual(16);
  });

  it("includes the top inset only for headerless screens", () => {
    expect(getScreenSafeAreaEdges(true)).toEqual(["top", "bottom", "left", "right"]);
    expect(getScreenSafeAreaEdges(false)).toEqual(["bottom", "left", "right"]);
  });
});
