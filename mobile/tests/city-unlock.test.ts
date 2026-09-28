import { afterEach, describe, expect, it, vi } from "vitest";
import { getCityUnlockProduct, editorialTourAccess } from "@citywalk/traveler-core";
import { CityUnlockController, cityUnlockPreviewEnabled, type CityUnlockPorts, type UnlockSnapshot } from "../src/lib/cityUnlock";
const product = getCityUnlockProduct("lubeck")!;
function harness() {
  let account: string | undefined = "owner";
  const states: UnlockSnapshot[] = [];
  const ports: CityUnlockPorts = {
    account: () => account,
    product: vi.fn(async () => ({ id: product.productId, localizedPrice: "7,99 €" })),
    purchase: vi.fn(async () => ({ status: "purchased" as const, proof: "synthetic-proof" })),
    restore: vi.fn(async () => ["synthetic-proof"]),
    verify: vi.fn(async () => undefined),
    access: vi.fn(async () => false),
  };
  return { ports, states, controller: new CityUnlockController("lubeck", ports, state => states.push(state)), account: (id?: string) => { account = id; }, latest: () => states.at(-1)! };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("city unlock safety and lifecycle", () => {
  it("keeps identity independent of changing Store prices and retains the free editorial sample", () => {
    expect(product).toEqual({ citySlug: "lubeck", entitlement: "city:luebeck:premium", productId: "com.citywalk.luebeck.premium", kind: "non-consumable" });
    expect(getCityUnlockProduct("hamburg")).toBeUndefined(); expect(getCityUnlockProduct("__proto__")).toBeUndefined();
    expect(editorialTourAccess("lubeck", "historic-center-walk")).toBe("free-sample");
  });
  it("leaves ordinary release builds unchanged and enables only explicit sandbox preview", async () => {
    vi.stubGlobal("__DEV__", false); vi.stubEnv("EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW", "1");
    expect(cityUnlockPreviewEnabled()).toBe(false);
    vi.stubGlobal("__DEV__", true); expect(cityUnlockPreviewEnabled()).toBe(true);
    vi.stubEnv("EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW", ""); expect(cityUnlockPreviewEnabled()).toBe(false);
  });
  it("uses only matching Store metadata and never a hardcoded runtime price", async () => {
    const h = harness(); await h.controller.load(); expect(h.latest()).toEqual({ state: "ready", product: { id: product.productId, localizedPrice: "7,99 €" } });
    vi.mocked(h.ports.product).mockResolvedValue({ id: "wrong-product", localizedPrice: "1" });
    await h.controller.load(); expect(h.latest()).toEqual({ state: "store_product_unavailable" });
    await h.controller.run("purchase"); expect(h.ports.purchase).not.toHaveBeenCalled();
  });
  it.each(["purchase", "restore"] as const)("requires account association for %s without changing or uploading a route", async action => {
    const h = harness(); await h.controller.load(); h.account(undefined); await h.controller.run(action);
    expect(h.latest().state).toBe("account_required"); expect(h.ports.purchase).not.toHaveBeenCalled(); expect(h.ports.restore).not.toHaveBeenCalled();
  });
  it.each(["cancelled", "pending"] as const)("does not verify or unlock a %s purchase", async status => {
    const h = harness(); await h.controller.load(); vi.mocked(h.ports.purchase).mockResolvedValue({ status });
    await h.controller.run("purchase"); expect(h.latest().state).toBe(status === "pending" ? "purchase_pending" : "purchase_cancelled"); expect(h.ports.verify).not.toHaveBeenCalled();
    if (status === "pending") { await h.controller.load(); expect(h.latest().state).toBe("purchase_pending"); await h.controller.run("purchase"); expect(h.ports.purchase).toHaveBeenCalledTimes(1); }
  });
  it.each(["purchased", "already-owned"] as const)("unlocks %s only after verification AND a fresh active server entitlement", async status => {
    const h = harness(); await h.controller.load(); vi.mocked(h.ports.purchase).mockResolvedValue({ status, proof: "synthetic-proof" });
    vi.mocked(h.ports.access).mockResolvedValue(true); await h.controller.run("purchase");
    expect(h.states.map(s => s.state)).toContain("verification_pending"); expect(h.states.map(s => s.state)).toContain("entitlement_activating");
    expect(h.ports.verify).toHaveBeenCalledWith("synthetic-proof", "owner", product.productId);
    expect(h.latest().state).toBe(status === "purchased" ? "unlocked" : "already_owned");
    await h.controller.run("purchase"); expect(h.ports.purchase).toHaveBeenCalledTimes(1);
  });
  it("does not unlock after a verifier failure or a missing/revoked server grant", async () => {
    const h = harness(); await h.controller.load();
    vi.mocked(h.ports.verify).mockRejectedValueOnce(new Error("private failure")); await h.controller.run("purchase"); expect(h.latest().state).toBe("verification_failed");
    await h.controller.run("purchase"); expect(h.latest().state).toBe("verification_failed");
    expect(h.states.some(s=>s.state === "unlocked")).toBe(false);
  });
  it("recovers from Store failure without duplicating an in-flight request", async () => {
    const h = harness(); await h.controller.load();
    vi.mocked(h.ports.purchase).mockRejectedValueOnce(new Error("store-failed")); await h.controller.run("purchase"); expect(h.latest().state).toBe("purchase_failed");
    vi.mocked(h.ports.access).mockResolvedValue(true); await Promise.all([h.controller.run("purchase"), h.controller.run("purchase")]);
    expect(h.ports.purchase).toHaveBeenCalledTimes(2); expect(h.latest().state).toBe("unlocked");
  });
  it("restores once without purchasing; repeated proofs are deduplicated", async () => {
    const h = harness(); vi.mocked(h.ports.restore).mockResolvedValue(["synthetic-proof", "synthetic-proof"]); vi.mocked(h.ports.access).mockResolvedValue(true);
    await h.controller.run("restore"); expect(h.latest().state).toBe("restore_success"); expect(h.ports.verify).toHaveBeenCalledTimes(1); expect(h.ports.purchase).not.toHaveBeenCalled();
    await h.controller.run("restore"); expect(h.ports.restore).toHaveBeenCalledTimes(1);
  });
  it("distinguishes empty restore from Store/verification failure", async () => {
    const h = harness(); vi.mocked(h.ports.restore).mockResolvedValueOnce([]); await h.controller.run("restore"); expect(h.latest().state).toBe("nothing_to_restore");
    vi.mocked(h.ports.restore).mockRejectedValueOnce(new Error("offline")); await h.controller.run("restore"); expect(h.latest().state).toBe("restore_failed");
    vi.mocked(h.ports.verify).mockRejectedValueOnce(new Error("account-conflict")); await h.controller.run("restore"); expect(h.latest().state).toBe("restore_failed");
  });
  it.each(["switch", "signout", "dispose"])("ignores transaction results after %s", async kind => {
    const h = harness(); await h.controller.load(); let resolve!: (v: {status: "purchased"; proof: string}) => void;
    vi.mocked(h.ports.purchase).mockImplementation(() => new Promise(r => { resolve = r; })); const operation = h.controller.run("purchase");
    if (kind === "dispose") h.controller.dispose(); else h.account(kind === "switch" ? "other" : undefined);
    resolve({ status: "purchased", proof: "synthetic-proof" }); await operation;
    expect(h.ports.verify).not.toHaveBeenCalled(); expect(h.states.some(s=>s.state === "unlocked")).toBe(false);
  });
  it("rechecks server ownership after restart and fails closed offline", async () => {
    const h = harness(); vi.mocked(h.ports.access).mockResolvedValue(true); await h.controller.load(); expect(h.latest().state).toBe("already_owned"); expect(h.ports.product).not.toHaveBeenCalled();
    const reopened = harness(); vi.mocked(reopened.ports.access).mockRejectedValue(new Error("offline")); await reopened.controller.load(); expect(reopened.latest().state).toBe("access_unavailable");
  });
});

it.each(["purchase", "restore"] as const)("shows explicit account conflict on %s without relinking",async action=>{
 const h=harness();await h.controller.load();vi.mocked(h.ports.verify).mockRejectedValue(new Error("ACCOUNT_CONFLICT"));await h.controller.run(action);expect(h.latest().state).toBe("account_conflict");
});
it("enables internal sandbox builds only with both explicit flags and Preview environment",()=>{
 vi.stubGlobal("__DEV__",false);vi.stubEnv("EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW","1");vi.stubEnv("EXPO_PUBLIC_CITYWALK_BILLING","sandbox");vi.stubEnv("EXPO_PUBLIC_CITYWALK_ENV","preview");expect(cityUnlockPreviewEnabled()).toBe(true);vi.stubEnv("EXPO_PUBLIC_CITYWALK_ENV","production");expect(cityUnlockPreviewEnabled()).toBe(false);
});
it("late Store cancellation releases pending state for a deliberate retry",async()=>{
 const h=harness();vi.mocked(h.ports.purchase).mockResolvedValue({status:"pending"});await h.controller.load();await h.controller.run("purchase");expect(h.latest().state).toBe("purchase_pending");await h.controller.storeChanged("cancelled");expect(h.latest().state).toBe("purchase_cancelled");await h.controller.run("purchase");expect(h.ports.purchase).toHaveBeenCalledTimes(2);
});
