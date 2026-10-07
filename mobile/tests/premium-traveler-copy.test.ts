import { describe, expect, it } from "vitest";

import cityUnlockGateSource from "../src/components/CityUnlockGate.tsx?raw";
import nativeWalkFlowSource from "../src/components/NativeWalkFlow.tsx?raw";

describe("traveler Premium copy localization", () => {
  it("uses shared Premium copy in the city unlock gate", () => {
    expect(cityUnlockGateSource).toContain('t(locale, "premium.unlock")');
    expect(cityUnlockGateSource).not.toContain("Choose CITYWALK Premium");
  });

  it("uses shared Premium copy for locked smart walk controls", () => {
    expect(nativeWalkFlowSource).toContain(
      'translate(locale, "premium.benefitAdapt")',
    );
    expect(nativeWalkFlowSource).toContain(
      'translate(locale, "premium.benefitBackOnTime")',
    );
    expect(nativeWalkFlowSource).toContain(
      'translate(locale, "premium.unlock")',
    );
    expect(nativeWalkFlowSource).not.toContain("Unlock smart controls");
    expect(nativeWalkFlowSource).not.toContain(
      "Add stops, shorten your route and get back on time with CITYWALK Premium.",
    );
  });
});
