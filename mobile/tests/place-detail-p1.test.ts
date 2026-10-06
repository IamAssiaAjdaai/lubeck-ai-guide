import { describe, expect, it } from "vitest";

import placeSource from "../src/app/city/[citySlug]/place/[placeSlug].tsx?raw";

describe("Place Detail P1 presentation", () => {
  it("uses an icon-only Save action and compact primary place actions", () => {
    expect(placeSource).toContain("style={styles.saveAction}");
    expect(placeSource).toContain('ios={saved ? "heart.fill" : "heart"}');
    expect(placeSource).toContain("accessibilityState={{");
    expect(placeSource).toContain("<WalkMembershipControl");
    expect(placeSource).toContain("style={styles.directionAction}");
    expect(placeSource).not.toContain("style={styles.quickActionButton}");
  });

  it("keeps unavailable audio lightweight and Ask CITYWALK compact", () => {
    expect(placeSource).toContain('testID="audio-unavailable-notice"');
    expect(placeSource).toContain("styles.audioNotice");
    expect(placeSource).toContain('variant="metadata" style={styles.muted}');
    expect(placeSource).toContain("style={[styles.askAction, nativeRowStyle(direction)]}");
    expect(placeSource).toContain("styles.askIcon");
    expect(placeSource).not.toContain('tone="ai"');
  });

  it("preserves storytelling, trust, audio playback and trip controls", () => {
    expect(placeSource).toContain("<NativeAudioPlayer");
    expect(placeSource).toContain('translate(locale, "place.whyItMatters")');
    expect(placeSource).toContain("place.content.story");
    expect(placeSource).toContain('translate(locale, "place.quickFacts")');
    expect(placeSource).toContain("styles.verifiedCard");
    expect(placeSource).toContain("t.verified");
    expect(placeSource).toContain("previousStop");
    expect(placeSource).toContain("nextStop");
    expect(placeSource).toContain("messages.finishTrip");
  });
});
