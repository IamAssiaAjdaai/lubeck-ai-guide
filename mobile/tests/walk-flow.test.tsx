// @vitest-environment jsdom
import { vi } from "vitest";

// The legacy walk-flow behavior suite exercises adaptive trip controls.
// Those controls are Premium-only in CITYWALK V2, so make that entitlement
// explicit here instead of weakening production gating for the tests.
vi.mock("../src/hooks/usePremiumAccess", () => ({
  usePremiumAccess: () => ({ status: "premium" as const, active: true as const }),
}));

await import("./walk-flow.behavior");
