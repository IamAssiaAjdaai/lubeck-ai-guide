import { describe, expect, it } from "vitest";

import localeSelectorSource from "../src/components/LocaleSelector.tsx?raw";

describe("language selector large-text resilience", () => {
  it("uses a growable trigger and bounded wrapping label", () => {
    expect(localeSelectorSource).toContain("minHeight: 44");
    expect(localeSelectorSource).not.toContain("height: 44,\n    justifyContent");
    expect(localeSelectorSource).toContain('maxWidth: "48%"');
    expect(localeSelectorSource).toContain("flexShrink: 1");
    expect(localeSelectorSource).toContain('textAlign: "center"');
  });
});
