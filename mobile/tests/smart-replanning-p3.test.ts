import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/components/NativeWalkFlow.tsx"),
  "utf8",
);

describe("Smart Replanning P3", () => {
  it("opens Live Walk trip controls as a contextual sheet", () => {
    expect(source).toMatch(/visible=\{isLiveActive && showManageWalk\}/);
    expect(source).toMatch(/accessibilityLabel=\{t\.tripControls\}/);
    expect(source).toMatch(/presentationStyle="pageSheet"/);
    expect(source).toMatch(/<SectionTitle>\{t\.tripControls\}<\/SectionTitle>/);
    expect(source).toMatch(/setPanel\("add"\)/);
    expect(source).toMatch(/shorten\(\)/);
    expect(source).toMatch(/setPanel\("back"\)/);
    expect(source).toMatch(/translate\(locale, "common\.close"\)/);
  });

  it("keeps Add stop and Take me back inside the route-change sheet model", () => {
    expect(source).toMatch(
      /visible=\{\(premium\.active && \(panel === "add" \|\| panel === "back"\)\) \|\| !!proposed\}/,
    );
    expect(source).toMatch(/panel === "back" && journey \? <>/);
    expect(source).toMatch(/label=\{t\.tripStart\}/);
    expect(source).toMatch(/label=\{t\.destination\}/);
  });

  it("continues to refresh the Live Walk route after confirmed active replans", () => {
    expect(source).toMatch(/stage === "active",\n\s+\)\.then/);
    expect(source).toMatch(/syncLiveCompanion\(result\.journey, liveRouteUpdated\)/);
    expect(source).toMatch(/markLiveWalkRouteUpdated/);
  });
});
