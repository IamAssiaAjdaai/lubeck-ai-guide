import { describe, expect, it, vi } from "vitest";

import {
  accountDeletionLocalKeys,
  clearDeletedAccountLocalData,
} from "../src/lib/auth/accountDeletionStorage";
import { NATIVE_VISITOR_STORAGE_KEY } from "../src/lib/visitorIdentity";

describe("account deletion local cleanup", () => {
  it("selects traveler-generated state for the deleted account without touching another account or device preferences", () => {
    const keys = [
      "citywalk:native:v2:saved",
      "citywalk:native:v2:places",
      "citywalk:native:v2:active:lubeck",
      "citywalk:native:v2:feedback:walk-1:rating",
      "citywalk:guide:1:lubeck:holstentor",
      "citywalk:local-trips:v2",
      "citywalk:live-walk:v1",
      "citywalk:native:v1:traveler-style:owner-a",
      "citywalk:native:v1:traveler-style:owner-b",
      "citywalk:locale:v1",
      "citywalk:public-content-cache:v1",
      NATIVE_VISITOR_STORAGE_KEY,
    ];

    expect(accountDeletionLocalKeys(keys, "owner-a")).toEqual([
      "citywalk:native:v2:saved",
      "citywalk:native:v2:places",
      "citywalk:native:v2:active:lubeck",
      "citywalk:native:v2:feedback:walk-1:rating",
      "citywalk:guide:1:lubeck:holstentor",
      "citywalk:local-trips:v2",
      "citywalk:live-walk:v1",
      "citywalk:native:v1:traveler-style:owner-a",
    ]);
  });

  it("removes selected traveler state and resets the anonymous visitor identity", async () => {
    const multiRemove = vi.fn().mockResolvedValue(undefined);
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const store = {
      getAllKeys: vi.fn().mockResolvedValue([
        "citywalk:native:v2:active:lubeck",
        "citywalk:native:v1:traveler-style:owner-a",
        "citywalk:native:v1:traveler-style:owner-b",
      ]),
      multiRemove,
      removeItem,
    };

    await clearDeletedAccountLocalData("owner-a", store);

    expect(multiRemove).toHaveBeenCalledWith([
      "citywalk:native:v2:active:lubeck",
      "citywalk:native:v1:traveler-style:owner-a",
    ]);
    expect(removeItem).toHaveBeenCalledWith(NATIVE_VISITOR_STORAGE_KEY);
  });
});
