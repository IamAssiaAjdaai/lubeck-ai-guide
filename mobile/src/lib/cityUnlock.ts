import { getCityUnlockProduct, type CityUnlockState } from "@citywalk/traveler-core";

export type StoreProduct = Readonly<{ id: string; localizedPrice: string }>;
export type PurchaseResult = Readonly<{ status: "purchased" | "already-owned"; proof: string }> | Readonly<{ status: "pending" }> | Readonly<{ status: "cancelled" }>;
export type CityUnlockPorts = {
  account(): string | undefined;
  product(id: string): Promise<StoreProduct | undefined>;
  purchase(id: string, account: string): Promise<PurchaseResult>;
  restore(id: string, account: string): Promise<readonly string[]>;
  verify(proof: string, account: string, productId: string): Promise<void>;
  access(account: string | undefined): Promise<boolean>;
};
export type UnlockSnapshot = Readonly<{ state: CityUnlockState; product?: StoreProduct }>;

/** No persistence, receipts in logs, local unlock booleans or automatic account transfers. */
export class CityUnlockController {
  private revision = 0;
  private busy = false;
  private pendingAccount?: string;
  private snapshot: UnlockSnapshot = { state: "store_product_loading" };
  constructor(private city: string, private ports: CityUnlockPorts, private changed: (state: UnlockSnapshot) => void) {}
  dispose() { this.revision++; }
  private set(state: CityUnlockState, product = this.snapshot.product) {
    this.snapshot = { state, ...(product ? { product } : {}) }; this.changed(this.snapshot);
  }
  async storeChanged(outcome?: "cancelled" | "failed") {
    if (outcome && this.pendingAccount === this.ports.account() && this.pendingAccount) {
      this.pendingAccount = undefined;
      this.set(outcome === "cancelled" ? "purchase_cancelled" : "purchase_failed");
      return;
    }
    await this.load();
  }
  async load() {
    if (this.busy) return;
    this.busy = true;
    const revision = ++this.revision, account = this.ports.account();
    const current = () => revision === this.revision && account === this.ports.account();
    this.snapshot = { state: "store_product_loading" };
    this.changed(this.snapshot);
    try {
      const product = getCityUnlockProduct(this.city);
      if (!product) throw new Error("unsupported");
      if (await this.ports.access(account)) { if (current()) this.set("already_owned"); return; }
      if (!current()) return;
      const metadata = await this.ports.product(product.productId);
      if (!current()) return;
      if (!metadata || metadata.id !== product.productId || !metadata.localizedPrice.trim()) this.set("store_product_unavailable");
      else this.set(this.pendingAccount === account && account ? "purchase_pending" : "ready", metadata);
    } catch { if (current()) this.set("access_unavailable"); }
    finally { this.busy = false; }
  }
  async run(action: "purchase" | "restore") {
    if (this.busy) return;
    if (["unlocked", "already_owned", "restore_success"].includes(this.snapshot.state)) return;
    const product = getCityUnlockProduct(this.city), account = this.ports.account();
    if (action === "purchase" && account && this.pendingAccount === account) return;
    if (!account) { this.set("account_required"); return; }
    if (!product || (action === "purchase" && !this.snapshot.product)) { this.set("store_product_unavailable"); return; }
    this.busy = true;
    const revision = ++this.revision;
    const current = () => revision === this.revision && account === this.ports.account();
    let phase: "store" | "verify" = "store";
    this.set(action === "purchase" ? "purchase_started" : "restore_started");
    try {
      let proofs: readonly string[], owned = false;
      if (action === "purchase") {
        const result = await this.ports.purchase(product.productId, account);
        if (!current()) return;
        if (result.status === "cancelled" || result.status === "pending") {
          if (result.status === "pending") this.pendingAccount = account;
          this.set(result.status === "cancelled" ? "purchase_cancelled" : "purchase_pending"); return;
        }
        proofs = [result.proof]; owned = result.status === "already-owned";
      } else {
        proofs = await this.ports.restore(product.productId, account);
        if (!current()) return;
        if (!proofs.length) { this.set("nothing_to_restore"); return; }
      }
      phase = "verify"; this.set("verification_pending");
      // Production verifier must enforce product/app/environment/account ownership and
      // transaction uniqueness before writing the existing ledger. No client grant path.
      for (const proof of new Set(proofs)) {
        if (!proof) throw new Error("invalid-proof");
        await this.ports.verify(proof, account, product.productId);
        if (!current()) return;
      }
      this.set("entitlement_activating");
      if (!await this.ports.access(account)) throw new Error("not-active");
      if (current()) this.set(action === "restore" ? "restore_success" : owned ? "already_owned" : "unlocked");
    } catch (error) {
      if (current() && error instanceof Error && error.message === "ACCOUNT_CONFLICT") this.set("account_conflict");
      else if (current() && error instanceof Error && error.message === "PURCHASE_REVOKED") this.set("purchase_revoked");
      else if (current()) this.set(action === "restore" ? "restore_failed" : phase === "verify" ? "verification_failed" : "purchase_failed");
    } finally { this.busy = false; }
  }
}

export function cityUnlockPreviewEnabled(): boolean {
  return process.env.EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW === "1" && (
    (typeof __DEV__ !== "undefined" && __DEV__) ||
    (process.env.EXPO_PUBLIC_CITYWALK_ENV === "preview" && process.env.EXPO_PUBLIC_CITYWALK_BILLING === "sandbox")
  );
}
