import { describe, expect, it, vi } from "vitest";
import { NATIVE_VISITOR_STORAGE_KEY } from "../visitorIdentity";
import { accountLocalDataContract, purgeDeletedAccountLocalData, type AccountLocalDataStore } from "./accountLocalData";

function storeWith(keys: readonly string[]) {
  const multiRemove = vi.fn(async (_keys: readonly string[]) => undefined);
  const removeItem = vi.fn(async (_key: string) => undefined);
  const store: AccountLocalDataStore = { getAllKeys: vi.fn(async () => keys), multiRemove, removeItem };
  return { store, multiRemove, removeItem };
}

describe("purgeDeletedAccountLocalData", () => {
  it("removes traveler-generated state without touching another account or device preferences", async () => {
    const deletedUser = "user-deleted", otherUser = "user-other";
    const { store, multiRemove, removeItem } = storeWith([
      `${accountLocalDataContract.nativeTravelerPrefix}saved`,
      `${accountLocalDataContract.nativeTravelerPrefix}active:lubeck`,
      `${accountLocalDataContract.curatedProgressPrefix}lubeck:historic-center-walk`,
      `${accountLocalDataContract.guideHistoryPrefix}1:lubeck:holstentor`,
      accountLocalDataContract.localTripsKey,
      accountLocalDataContract.liveWalkKey,
      accountLocalDataContract.travelerStyleKey(deletedUser),
      accountLocalDataContract.travelerStyleKey(otherUser),
      "citywalk:locale:v1",
      "citywalk:public-content-cache:v1",
    ]);
    await purgeDeletedAccountLocalData(deletedUser, store);
    expect(multiRemove).toHaveBeenCalledWith([
      `${accountLocalDataContract.nativeTravelerPrefix}saved`,
      `${accountLocalDataContract.nativeTravelerPrefix}active:lubeck`,
      `${accountLocalDataContract.curatedProgressPrefix}lubeck:historic-center-walk`,
      `${accountLocalDataContract.guideHistoryPrefix}1:lubeck:holstentor`,
      accountLocalDataContract.localTripsKey,
      accountLocalDataContract.liveWalkKey,
      accountLocalDataContract.travelerStyleKey(deletedUser),
    ]);
    expect(removeItem).toHaveBeenCalledWith(NATIVE_VISITOR_STORAGE_KEY);
  });

  it("still resets anonymous visitor identity when no other deletion-owned keys exist", async () => {
    const { store, multiRemove, removeItem } = storeWith(["citywalk:locale:v1", "unrelated:key"]);
    await purgeDeletedAccountLocalData("user-deleted", store);
    expect(multiRemove).not.toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledWith(NATIVE_VISITOR_STORAGE_KEY);
  });
});
