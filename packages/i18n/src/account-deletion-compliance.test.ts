import { describe, expect, it } from "vitest";

import { sharedLocales } from "./locale-config";
import { t } from "./translator";

describe("account deletion compliance copy", () => {
  it.each(sharedLocales)("keeps deletion copy truthful and complete in %s", (locale) => {
    const warning = t(locale, "lifecycle.deleteWarning");
    const confirmation = t(locale, "lifecycle.deleteConfirm");
    const deleted = t(locale, "lifecycle.deleted");
    const local = t(locale, "lifecycle.localDataRemains");

    for (const value of [warning, confirmation, deleted, local]) {
      expect(value.trim().length).toBeGreaterThan(40);
    }

    expect(warning).toContain("CITYWALK");
    expect(warning).toMatch(/Apple/i);
    expect(warning).toMatch(/Google Play/i);
    expect(confirmation).toMatch(/App Store|Google Play/i);
  });

  it("does not reintroduce the stale claim that device-local traveler data is kept", () => {
    const combined = sharedLocales
      .flatMap((locale) => [
        t(locale, "lifecycle.deleteWarning"),
        t(locale, "lifecycle.localDataRemains"),
        t(locale, "lifecycle.deleted"),
      ])
      .join("\n")
      .toLowerCase();

    expect(combined).not.toContain("device-local traveler data was kept");
    expect(combined).not.toContain("current walk, favorites");
  });
});
