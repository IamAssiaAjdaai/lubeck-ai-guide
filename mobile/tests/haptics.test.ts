import { beforeEach, describe, expect, it, vi } from "vitest";

const haptics = vi.hoisted(() => ({
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
}));

vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Success: "success" },
  ...haptics,
}));

import { triggerCitywalkHaptic } from "../src/lib/haptics";

describe("CITYWALK haptic feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps deliberate light, medium, success, and error feedback", async () => {
    await triggerCitywalkHaptic("light");
    await triggerCitywalkHaptic("medium");
    await triggerCitywalkHaptic("success");
    await triggerCitywalkHaptic("error");

    expect(haptics.selectionAsync).toHaveBeenCalledOnce();
    expect(haptics.impactAsync).toHaveBeenCalledWith("medium");
    expect(haptics.notificationAsync).toHaveBeenNthCalledWith(1, "success");
    expect(haptics.notificationAsync).toHaveBeenNthCalledWith(2, "error");
  });

  it("remains enhancement-only when the native haptics engine rejects", async () => {
    haptics.selectionAsync.mockRejectedValueOnce(new Error("unavailable"));
    await expect(triggerCitywalkHaptic("light")).resolves.toBeUndefined();
  });
});
