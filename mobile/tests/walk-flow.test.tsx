// @vitest-environment jsdom
import React from "react";
import { vi } from "vitest";

// The legacy walk-flow behavior suite exercises adaptive trip controls.
// Those controls are Premium-only in CITYWALK V2, so make that entitlement
// explicit here instead of weakening production gating for the tests.
vi.mock("../src/hooks/usePremiumAccess", () => ({
  usePremiumAccess: () => ({ status: "premium" as const, active: true as const }),
}));

// Completion feedback now has dedicated presentation coverage. Keep this legacy
// behavior suite focused on the surrounding finish/reset flow it already owns.
vi.mock("../src/components/PublicStoreReview", () => ({
  PublicStoreReview: ({
    journey,
    onSettled,
  }: {
    journey: { id: string };
    onSettled?(id: string): void;
  }) => {
    React.useEffect(() => onSettled?.(journey.id), [journey.id, onSettled]);
    return null;
  },
}));

await import("./walk-flow.behavior");
