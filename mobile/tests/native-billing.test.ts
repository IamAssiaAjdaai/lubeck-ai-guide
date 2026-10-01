import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Purchase, PurchaseError } from "expo-iap";
import { NativeBilling, type BillingSDK } from "../src/lib/nativeBilling";
const id = "com.citywalk.luebeck.premium";
function fixture(platform: "ios" | "android" = "ios") {
  let update: (p: Purchase) => void = () => {}, error: (e: PurchaseError) => void = () => {};
  let account = "owner";
  const calls: string[] = [];
  const sdk = {
    initConnection: vi.fn(async () => true), endConnection: vi.fn(async () => true),
    purchaseUpdatedListener: vi.fn((callback: typeof update) => { update = callback; return {remove:vi.fn()}; }),
    purchaseErrorListener: vi.fn((callback: typeof error) => { error = callback; return {remove:vi.fn()}; }),
    fetchProducts: vi.fn(async () => [{id,type:"in-app",displayPrice:"6,99 €"}]),
    getAvailablePurchases: vi.fn(async (): Promise<Purchase[]> => []),
    requestPurchase: vi.fn(async () => null), finishTransaction: vi.fn(async () => {calls.push("finish");}),
    restorePurchases: vi.fn(async () => {}), getAppTransactionIOS: vi.fn(async () => ({environment:"Sandbox",bundleId:"com.citywalk.app"})),
  };
  const context = vi.fn(async () => ({mode:"sandbox" as const,bundleId:"com.citywalk.app",productId:id,accountToken:"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",stores:{apple:true,google:true}}));
  const deliver = vi.fn(async () => {calls.push("durable");});
  const billing = new NativeBilling({sdk:async()=>sdk as unknown as BillingSDK,platform,account:async()=>account,context,deliver});
  const purchase = {id:"tx",productId:id,purchaseToken:"sensitive-proof",purchaseState:"purchased",store:platform==="ios"?"apple":"google"} as Purchase;
  return {billing,sdk,context,deliver,purchase,calls,update:(p=purchase)=>update(p),error:(code:string)=>error({code} as PurchaseError),switchAccount:()=>{account="other";}};
}
beforeEach(() => vi.restoreAllMocks());
describe("native Store boundary", () => {
  it("uses exact Store metadata and rejects absent/wrong product", async () => {
    const f=fixture(); expect(await f.billing.product(id)).toEqual({id,localizedPrice:"6,99 €"});
    expect(await f.billing.product("wrong")).toBeUndefined(); f.sdk.fetchProducts.mockResolvedValue([]);
    expect(await f.billing.product(id)).toBeUndefined(); await f.billing.dispose();
  });
  it("waits for durable server delivery before finishing a real Store event", async () => {
    const f=fixture(); const result=f.billing.purchase(id,"owner"); await vi.waitFor(()=>expect(f.sdk.requestPurchase).toHaveBeenCalledOnce());
    f.update(); expect(await result).toEqual({status:"purchased",proof:"sensitive-proof"}); expect(f.sdk.finishTransaction).not.toHaveBeenCalled();
    await f.billing.verify("sensitive-proof","owner"); expect(f.calls).toEqual(["durable","finish"]);
    expect(f.sdk.requestPurchase.mock.calls[0]).toEqual([{type:"in-app",request:{apple:{sku:id,quantity:1,appAccountToken:expect.any(String),andDangerouslyFinishTransactionAutomatically:false},google:{skus:[id],obfuscatedAccountId:expect.any(String)}}}]);
    await f.billing.dispose();
  });
  it.each(["user-cancelled","pending","deferred-payment"])("handles %s without delivery", async code => {
    const f=fixture(); const result=f.billing.purchase(id,"owner"); await vi.waitFor(()=>expect(f.sdk.requestPurchase).toHaveBeenCalled());f.error(code);
    expect((await result).status).toBe(code==="user-cancelled"?"cancelled":"pending");expect(f.deliver).not.toHaveBeenCalled();await f.billing.dispose();
  });
  it("rejects errors, never synthesizing ownership", async () => {
    const f=fixture(); const result=f.billing.purchase(id,"owner"); const rejection=expect(result).rejects.toThrow("UNAVAILABLE");await vi.waitFor(()=>expect(f.sdk.requestPurchase).toHaveBeenCalled());f.error("service-error");await rejection;await f.billing.dispose();
  });
  it("recovers a charged unfinished purchase before another Store request", async () => {
    const f=fixture(); f.sdk.getAvailablePurchases.mockResolvedValue([f.purchase]);f.deliver.mockRejectedValueOnce(new Error("server down"));
    expect((await f.billing.purchase(id,"owner")).status).toBe("already-owned");await expect(f.billing.verify("sensitive-proof","owner")).rejects.toThrow();expect(f.sdk.finishTransaction).not.toHaveBeenCalled();
    await f.billing.recover();expect(f.sdk.requestPurchase).not.toHaveBeenCalled();expect(f.sdk.finishTransaction).toHaveBeenCalledOnce();await f.billing.dispose();
  });
  it("restores/re-queries and deduplicates proofs, never calling purchase", async () => {
    const f=fixture(); f.sdk.getAvailablePurchases.mockResolvedValue([f.purchase,f.purchase]);expect(await f.billing.restore(id,"owner")).toEqual(["sensitive-proof"]);
    await Promise.all([f.billing.verify("sensitive-proof","owner"),f.billing.verify("sensitive-proof","owner")]);expect(f.deliver).toHaveBeenCalledOnce();expect(f.sdk.finishTransaction).toHaveBeenCalledOnce();expect(f.sdk.requestPurchase).not.toHaveBeenCalled();await f.billing.dispose();
  });
  it("handles empty ownership and failed restore without a charge", async () => {
    const f=fixture();expect(await f.billing.restore(id,"owner")).toEqual([]);f.sdk.restorePurchases.mockRejectedValueOnce(new Error("offline"));await expect(f.billing.restore(id,"owner")).rejects.toThrow();expect(f.sdk.requestPurchase).not.toHaveBeenCalled();await f.billing.dispose();
  });
  it("account conflict never finishes or transfers purchase", async () => {
    const f=fixture();f.sdk.getAvailablePurchases.mockResolvedValue([f.purchase]);await f.billing.restore(id,"owner");f.switchAccount();await expect(f.billing.verify("sensitive-proof","owner")).rejects.toThrow("ACCOUNT_CONFLICT");expect(f.deliver).not.toHaveBeenCalled();expect(f.sdk.finishTransaction).not.toHaveBeenCalled();await f.billing.dispose();
  });
  it("production AppTransaction cannot open an Apple purchase sheet", async () => {
    const f=fixture();f.sdk.getAppTransactionIOS.mockResolvedValue({environment:"Production",bundleId:"com.citywalk.app"});await expect(f.billing.purchase(id,"owner")).rejects.toThrow();expect(f.sdk.requestPurchase).not.toHaveBeenCalled();await f.billing.dispose();
  });
  it("Google finishes only after server verification/acknowledgement", async () => {
    const f=fixture("android");f.sdk.getAvailablePurchases.mockResolvedValue([f.purchase]);await f.billing.restore(id,"owner");await f.billing.verify("sensitive-proof","owner");expect(f.deliver).toHaveBeenCalledWith("sensitive-proof","owner","google");expect(f.calls).toEqual(["durable","finish"]);await f.billing.dispose();
  });
  it("uses one connection/listener pair and recovers pending completion", async () => {
    const f=fixture();await Promise.all([f.billing.product(id),f.billing.product(id)]);f.update();await vi.waitFor(()=>expect(f.sdk.finishTransaction).toHaveBeenCalledOnce());expect(f.sdk.initConnection).toHaveBeenCalledOnce();expect(f.sdk.purchaseUpdatedListener).toHaveBeenCalledOnce();await f.billing.dispose();
  });
});
it("concurrent taps open only one purchase sheet",async()=>{
 const f=fixture();const pending=f.billing.purchase(id,"owner");await expect(f.billing.purchase(id,"owner")).rejects.toThrow();await vi.waitFor(()=>expect(f.sdk.requestPurchase).toHaveBeenCalledOnce());f.error("user-cancelled");await pending;await f.billing.dispose();
});
it("missing native module reports unavailable without granting",async()=>{
 const billing=new NativeBilling({sdk:async()=>{throw new Error("module absent");},platform:"ios",account:async()=>undefined,context:async()=>{throw new Error();},deliver:async()=>{throw new Error();}});
 await expect(billing.product(id)).rejects.toThrow();await billing.recover();await billing.dispose();
});
it("late pending cancellation notifies the visible controller without granting",async()=>{
 const f=fixture(),changed=vi.fn();f.billing.subscribe(changed);const result=f.billing.purchase(id,"owner");await vi.waitFor(()=>expect(f.sdk.requestPurchase).toHaveBeenCalled());f.error("pending");expect((await result).status).toBe("pending");f.error("user-cancelled");expect(changed).toHaveBeenCalledWith("cancelled");expect(f.deliver).not.toHaveBeenCalled();await f.billing.dispose();
});
