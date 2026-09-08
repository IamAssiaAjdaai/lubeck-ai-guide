import { describe, expect, it } from "vitest";

import {
  deriveAudioOperationsStatus,
  exactLocaleStory,
  hashNarrationSource,
} from "@/lib/admin/operations/audioOperations";

describe("audio operations", () => {
  const live = {
    id: 1,
    locale: "de" as const,
    approvalStatus: "approved" as const,
    position: 0 as const,
  };

  it("keeps coverage exact-locale", () => {
    expect(deriveAudioOperationsStatus({ locale: "en", assets: [live] }).status).toBe("missing");
    expect(exactLocaleStory([{ locale: "en", story: "English" }], "de")).toBeUndefined();
  });

  it("derives candidate states without displacing live audio", () => {
    const candidate = { ...live, id: 2, position: 1 as const, approvalStatus: "pending_review" as const };
    const result = deriveAudioOperationsStatus({ locale: "de", assets: [live, candidate] });
    expect(result).toMatchObject({ status: "needs_review", live: { id: 1 }, candidate: { id: 2 } });
    expect(deriveAudioOperationsStatus({ locale: "de", assets: [live, { ...candidate, approvalStatus: "approved" }] }).status).toBe("ready");
  });

  it("marks only generated same-locale live audio stale", () => {
    const hash = hashNarrationSource("Original story");
    expect(deriveAudioOperationsStatus({ locale: "de", story: "Original story", assets: [{ ...live, sourceTextHash: hash }] }).status).toBe("live");
    expect(deriveAudioOperationsStatus({ locale: "de", story: "Changed story", assets: [{ ...live, sourceTextHash: hash }] }).status).toBe("stale");
    expect(deriveAudioOperationsStatus({ locale: "de", story: "Changed story", assets: [live] }).status).toBe("live");
    const selectedStory = exactLocaleStory([
      { locale: "de", story: "Original story" },
      { locale: "fr", story: "Histoire modifiée" },
    ], "de");
    expect(deriveAudioOperationsStatus({ locale: "de", story: selectedStory, assets: [{ ...live, sourceTextHash: hash }] }).status).toBe("live");
  });

  it("normalizes narration deterministically before hashing", () => {
    expect(hashNarrationSource(" A  story\r\nline ")).toBe(hashNarrationSource("A story\nline"));
  });
});
