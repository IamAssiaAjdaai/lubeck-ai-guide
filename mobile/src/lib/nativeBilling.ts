import type { Purchase } from "expo-iap";
import { getCityUnlockProduct } from "@citywalk/traveler-core";
import type { PurchaseResult, StoreProduct } from "./cityUnlock";

export type BillingSDK = Pick<typeof import("expo-iap"), "initConnection" | "endConnection" | "fetchProducts" | "getAvailablePurchases" | "requestPurchase" | "finishTransaction" | "restorePurchases" | "purchaseUpdatedListener" | "purchaseErrorListener" | "getAppTransactionIOS">;
export type BillingContext = { mode: "sandbox"; bundleId: string; productId: string; accountToken: string; stores: { apple: boolean; google: boolean } };
export type BillingPorts = {
  sdk(): Promise<BillingSDK>;
  platform: "ios" | "android" | "unsupported";
  account(): Promise<string | undefined>;
  context(account: string): Promise<BillingContext>;
  deliver(proof: string, account: string, store: "apple" | "google"): Promise<void>;
};
export class BillingFailure extends Error {
  constructor(readonly code: "ACCOUNT_CONFLICT" | "UNAVAILABLE" | "PURCHASE_REVOKED" = "UNAVAILABLE") { super(code); }
}
const productId = getCityUnlockProduct("lubeck")!.productId;
/** One connection and listener pair per app runtime. Proofs exist only in memory. */
export class NativeBilling {
  private purchaseBusy = false;
  private connection?: Promise<BillingSDK>;
  private subscriptions: { remove(): void }[] = [];
  private waiting?: { resolve(value: PurchaseResult): void; reject(error: unknown): void; timer: ReturnType<typeof setTimeout> };
  private purchases = new Map<string, Purchase>();
  private delivery = new Map<string, Promise<void>>();
  private observers = new Set<(outcome?: "cancelled" | "failed") => void>();
  private recovering?: Promise<void>;
  constructor(private ports: BillingPorts) {}
  subscribe(callback: (outcome?: "cancelled" | "failed") => void) { this.observers.add(callback); return () => { this.observers.delete(callback); }; }
  private changed(outcome?: "cancelled" | "failed") { for (const listener of this.observers) listener(outcome); }
  private async connect() {
    if (this.ports.platform === "unsupported") throw new BillingFailure();
    if (!this.connection) this.connection = (async () => {
      const sdk = await this.ports.sdk();
      if (!await sdk.initConnection()) throw new BillingFailure();
      this.subscriptions = [sdk.purchaseUpdatedListener(purchase => { void this.updated(purchase); }), sdk.purchaseErrorListener(error => this.failed(error))];
      return sdk;
    })().catch(error => { this.connection = undefined; throw error; });
    return this.connection;
  }
  private async authorize(account: string) {
    if (await this.ports.account() !== account) throw new BillingFailure("ACCOUNT_CONFLICT");
    const context = await this.ports.context(account);
    if (context.mode !== "sandbox" || context.bundleId !== "com.citywalk.app" || context.productId !== productId || !/^[0-9a-f-]{36}$/i.test(context.accountToken) || !context.stores[this.ports.platform === "ios" ? "apple" : "google"]) throw new BillingFailure();
    if (await this.ports.account() !== account) throw new BillingFailure("ACCOUNT_CONFLICT");
    return context;
  }
  private remember(purchase: Purchase) {
    if (purchase.productId !== productId || purchase.purchaseState !== "purchased" || !purchase.purchaseToken) return undefined;
    this.purchases.set(purchase.purchaseToken, purchase); return purchase.purchaseToken;
  }
  private settle(value: PurchaseResult) {
    const pending = this.waiting; this.waiting = undefined;
    if (pending) { clearTimeout(pending.timer); pending.resolve(value); }
  }
  private failed(error: { code?: string }) {
    if (error.code === "user-cancelled") { if (this.waiting) this.settle({ status: "cancelled" }); else this.changed("cancelled"); }
    else if (error.code === "deferred-payment" || error.code === "pending") this.settle({ status: "pending" });
    else if (error.code === "already-owned") { void this.recoverOwned(); }
    else { const pending = this.waiting; this.waiting = undefined; if (pending) { clearTimeout(pending.timer); pending.reject(new BillingFailure()); } else this.changed("failed"); }
  }
  private async recoverOwned() {
    if (!this.waiting) { await this.recover(); return; }
    try { const proofs = await this.available(); if (proofs[0]) this.settle({ status: "already-owned", proof: proofs[0] }); else this.failed({ code: "unknown" } as { code?: string }); }
    catch { this.failed({ code: "unknown" } as { code?: string }); }
  }
  private async updated(purchase: Purchase) {
    if (purchase.productId !== productId) return;
    if (purchase.purchaseState === "pending") { this.settle({ status: "pending" }); return; }
    const proof = this.remember(purchase); if (!proof) return;
    if (this.waiting) { this.settle({ status: "purchased", proof }); return; }
    // Pending completion/launch event: no new charge, never transfer account ownership.
    try { const account = await this.ports.account(); if (account) await this.verify(proof, account); } catch { /* Kept unfinished for a later explicit retry/resume. */ }
    this.changed();
  }
  async product(id: string): Promise<StoreProduct | undefined> {
    if (id !== productId) return undefined;
    const sdk = await this.connect();
    const products = await sdk.fetchProducts({ skus: [id], type: "in-app" });
    const product = products?.find(p => p.id === id && p.type === "in-app");
    return product?.displayPrice ? { id, localizedPrice: product.displayPrice } : undefined;
  }
  private async available() {
    const sdk = await this.connect();
    const purchases = await sdk.getAvailablePurchases();
    return [...new Set(purchases.map(p => this.remember(p)).filter((p): p is string => Boolean(p)))];
  }
  async purchase(id: string, account: string): Promise<PurchaseResult> {
    if (this.purchaseBusy) throw new BillingFailure();
    this.purchaseBusy = true;
    try { return await this.requestPurchase(id, account); } finally { this.purchaseBusy = false; }
  }
  private async requestPurchase(id: string, account: string): Promise<PurchaseResult> {
    if (id !== productId || this.waiting) throw new BillingFailure();
    const context = await this.authorize(account), sdk = await this.connect();
    // Recover a charged but undelivered transaction before opening another Store sheet.
    const existing = await this.available();
    if (existing[0]) return { status: "already-owned", proof: existing[0] };
    if (this.ports.platform === "ios") {
      const app = await sdk.getAppTransactionIOS();
      if (app?.environment !== "Sandbox" || app.bundleId !== context.bundleId) throw new BillingFailure();
    }
    if (await this.ports.account() !== account) throw new BillingFailure("ACCOUNT_CONFLICT");
    return new Promise<PurchaseResult>((resolve, reject) => {
      // Bounded UI wait; late Store updates still go through the recovery listener.
      const timer = setTimeout(() => this.settle({ status: "pending" }), 60000);
      this.waiting = { resolve, reject, timer };
      void sdk.requestPurchase({ type: "in-app", request: {
        apple: { sku: id, appAccountToken: context.accountToken, quantity: 1, andDangerouslyFinishTransactionAutomatically: false },
        google: { skus: [id], obfuscatedAccountId: context.accountToken },
      } }).then(result => { for (const p of (Array.isArray(result) ? result : result ? [result] : [])) void this.updated(p); })
        .catch(error => this.failed(error as { code?: string }));
    });
  }
  async restore(id: string, account: string) {
    if (id !== productId) throw new BillingFailure();
    await this.authorize(account);
    const sdk = await this.connect(); await sdk.restorePurchases();
    return this.available();
  }
  async verify(proof: string, account: string) {
    const key = `${account}:${proof}`;
    const existing = this.delivery.get(key); if (existing) return existing;
    const operation = (async () => {
      await this.authorize(account);
      const purchase = this.purchases.get(proof); if (!purchase) throw new BillingFailure();
      await this.ports.deliver(proof, account, this.ports.platform === "ios" ? "apple" : "google");
      if (await this.ports.account() !== account) throw new BillingFailure("ACCOUNT_CONFLICT");
      const sdk = await this.connect(); await sdk.finishTransaction({ purchase, isConsumable: false });
    })();
    this.delivery.set(key, operation);
    try { await operation; } finally { this.delivery.delete(key); }
  }
  recover() {
    if (!this.recovering) this.recovering = (async () => {
      const account = await this.ports.account(); if (!account) return;
      await this.authorize(account);
      for (const proof of await this.available()) await this.verify(proof, account);
    })().catch(() => { /* UI fresh access/restore exposes recovery; no sensitive logs. */ }).finally(() => { this.recovering = undefined; this.changed(); });
    return this.recovering;
  }
  async dispose() {
    this.settle({ status: "cancelled" });
    this.subscriptions.forEach(subscription => subscription.remove()); this.subscriptions = [];
    const connection = this.connection; this.connection = undefined;
    if (connection) { try { await (await connection).endConnection(); } catch { /* Missing native binary. */ } }
    this.purchases.clear(); this.observers.clear();
  }
}
