import { describe, expect, it, vi } from "vitest";

import {
  accountLocalDataContract,
  purgeDeletedAccountLocalData,
  type AccountLocalDataStore,
} from "./accountLocalData";

function storeWith(keys: readonly string[]) {
  const multiRemove = vi.fn(async (_keys: readonly string[]) => undefined);
  const store: AccountLocalDataStore = {
    getAllKeys: vi.fn(async () => keys),
    multiRemove,
  };
  return { store, multiRemove };
}

describe("purgeDeletedAccountLocalData", () => {
  it("removes traveler device data and only the deleted account's scoped style", async () => {
    const deletedUser = "user-deleted";
    const otherUser = "user-other";
    const { store, multiRemove } = storeWith([
      `${accountLocalDataContract.nativeTravelerPrefix}saved`,
      `${accountLocalDataContract.nativeTravelerPrefix}places`,
      `${accountLocalDataContract.nativeTravelerPrefix}active:lubeck`,
      `${accountLocalDataContract.nativeTravelerPrefix}feedback:walk-1:rating`,
      accountLocalDataContract.localTripsKey,
      accountLocalDataContract.travelerStyleKey(deletedUser),
      accountLocalDataContract.travelerStyleKey(otherUser),
      "citywalk:locale",
      "unrelated:key",
    ]);

    await purgeDeletedAccountLocalData(deletedUser, store);

    expect(multiRemove).toHaveBeenCalledTimes(1);
    expect(multiRemove).toHaveBeenCalledWith([
      `${accountLocalDataContract.nativeTravelerPrefix}saved`,
      `${accountLocalDataContract.nativeTravelerPrefix}places`,
      `${accountLocalDataContract.nativeTravelerPrefix}active:lubeck`,
      `${accountLocalDataContract.nativeTravelerPrefix}feedback:walk-1:rating`,
      accountLocalDataContract.localTripsKey,
      accountLocalDataContract.travelerStyleKey(deletedUser),
    ]);
  });

  it("does not issue a destructive write when no deletion-owned keys exist", async () => {
    const { store, multiRemove } = storeWith(["citywalk:locale", "unrelated:key"]);

    await purgeDeletedAccountLocalData("user-deleted", store);

    expect(multiRemove).not.toHaveBeenCalled();
  });
});
