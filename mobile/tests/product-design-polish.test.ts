import { describe, expect, it } from "vitest";

import accountSource from "../src/app/account/index.tsx?raw";
import guideSource from "../src/app/city/[citySlug]/guide/[placeSlug].tsx?raw";
import placeSource from "../src/app/city/[citySlug]/place/[placeSlug].tsx?raw";
import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import homeSource from "../src/app/index.tsx?raw";
import loadingSource from "../src/components/CitywalkLoading.tsx?raw";
import plannerSource from "../src/components/NativeTourPlanner.tsx?raw";
import uiSource from "../src/components/ui.tsx?raw";
import motionSource from "../src/lib/motion.ts?raw";
import { motion, radius, typography } from "../src/design/tokens";

describe("CITYWALK native product-design polish", () => {
  it("uses a restrained shared type, corner, and motion hierarchy", () => {
    expect(typography).toHaveProperty("screenTitle");
    expect(typography).toHaveProperty("cardTitle");
    expect(radius.hero).toBeGreaterThan(radius.lg);
    expect(motion).toEqual({ press: 96, component: 220, screen: 280 });
  });

  it("respects reduced motion and keeps loading layout stable without artificial delay", () => {
    expect(motionSource).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(motionSource).toContain('"reduceMotionChanged"');
    expect(loadingSource).toContain("useReducedMotion");
    expect(loadingSource).not.toMatch(/setTimeout|delay/);
  });

  it("gives destination and place discovery tactile image-led surfaces", () => {
    expect(homeSource).toContain("PressableSurface");
    expect(homeSource).toContain('transition={motion.component}');
    expect(homeSource).not.toContain("cityLinkPressed");
    expect(citySource).toContain("placeThumbnail");
    expect(citySource).toContain('variant="cardTitle"');
  });

  it("turns planning and active navigation into explicit guided states", () => {
    expect(plannerSource).toContain("<PlannerStep");
    expect(plannerSource).toContain("<MotionView");
    expect(plannerSource).toContain('haptic="medium"');
    expect(plannerSource).toContain("<EmptyState");
    expect(placeSource).toContain("<TripProgress");
    expect(placeSource).toContain("messages.tripComplete");
    expect(placeSource).toContain('tone="secondary"');
  });

  it("keeps the guide conversational with compact expandable verified sources", () => {
    expect(guideSource).toContain("sourcesExpanded");
    expect(guideSource).toContain("messages.sourceCount");
    expect(guideSource).toContain("<InlineLoadingDots");
    expect(guideSource).toContain("<MotionView");
  });

  it("uses designed empty and success/error states rather than isolated placeholder text", () => {
    expect(accountSource).toContain("<EmptyState");
    expect(uiSource).toContain("statusSuccess");
    expect(uiSource).toContain("statusError");
  });
});
