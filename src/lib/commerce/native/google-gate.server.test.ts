import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn(), providerClient: vi.fn(), request: vi.fn(), oidc: vi.fn(), session: vi.fn() }));
vi.mock("@/db/client", () => ({ getDb: mocks.db }));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class { getClient = mocks.providerClient; },
  OAuth2Client: class { verifyIdToken = mocks.oidc; },
}));
vi.mock("@/lib/auth/server", () => ({ getAuth: () => ({ api: { getSession: mocks.session } }) }));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class {
  static slidingWindow() { return {}; }
  async limit() { return { success: true }; }
} }));
import { accountBinding, googleBillingEnabled, sandboxContext, type VerifiedNativePurchase } from "./config.server";
import { verifyAndDeliver } from "./service.server";
import { deliverNativePurchase } from "./ledger.server";
import { acknowledgeGoogle, normalizeGoogle, verifyGoogle, verifyGooglePushAuthorization } from "./providers.server";
import { POST as purchase } from "@/app/api/commerce/city-unlock/[citySlug]/route";
import { POST as notification } from "@/app/api/commerce/native/notifications/google/route";

const credentials = JSON.stringify({ type: "service_account", client_email: "test@example.test", private_key: "synthetic-test-only" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE", "sandbox");
  vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET", "synthetic-test-only-".repeat(3));
  vi.stubEnv("CITYWALK_NATIVE_SANDBOX_USERS", "owner");
  vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "1");
  vi.stubEnv("CITYWALK_GOOGLE_SERVICE_ACCOUNT", credentials);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-only");
  mocks.session.mockResolvedValue({ user: { id: "owner" } });
  mocks.db.mockImplementation(() => { throw new Error("Unexpected database access"); });
  mocks.providerClient.mockResolvedValue({ request: mocks.request });
});
afterEach(() => vi.unstubAllEnvs());
function fixture() {
  const evidence: VerifiedNativePurchase = { provider: "google_test", transactionKey: "synthetic-hash", binding: accountBinding("owner"), state: "purchased" };
  const ports = {
    verifyGoogle: vi.fn(async () => evidence),
    verifyApple: vi.fn(async () => ({ ...evidence, provider: "apple_sandbox" as const })),
    deliverNativePurchase: vi.fn(async () => "active" as const),
    acknowledgeGoogle: vi.fn(async () => undefined),
    hasCityUnlock: vi.fn(async () => true),
  };
  return { evidence, ports };
}
function noExternalWork() {
  expect(mocks.db).not.toHaveBeenCalled();
  expect(mocks.providerClient).not.toHaveBeenCalled();
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.oidc).not.toHaveBeenCalled();
}

describe("Google disabled policy at every internal boundary", () => {
  it.each([undefined, "", "0", "false", "true", " 1", "1 ", "garbage"])("rejects flag %s before verification, restore, ack or ledger access", async flag => {
    const { evidence, ports } = fixture();
    vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", flag);
    expect(googleBillingEnabled()).toBe(false);
    expect(sandboxContext("owner").stores.google).toBe(false);
    // Purchase and restore use the same authoritative verification/delivery service.
    for (const proof of ["purchase-proof", "restored-proof"]) {
      await expect(verifyAndDeliver("owner", "google", proof, ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    }
    await expect(verifyGoogle("proof")).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    await expect(acknowledgeGoogle("proof")).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    await expect(verifyGooglePushAuthorization("Bearer test-only")).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    expect(() => normalizeGoogle({}, "proof")).toThrow("GOOGLE_BILLING_DISABLED");
    await expect(deliverNativePurchase(evidence, "owner")).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    await expect(deliverNativePurchase({ ...evidence, state: "revoked" })).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    for (const port of Object.values(ports)) expect(port).not.toHaveBeenCalled();
    noExternalWork();
  });

  it.each([undefined, "", "{}", "[]", "null", "invalid-json", JSON.stringify({ type: "authorized_user" }), JSON.stringify({ type: "service_account", client_email: " ", private_key: " " })])("rejects missing/malformed Google configuration %s", async value => {
    const { ports } = fixture();
    vi.stubEnv("CITYWALK_GOOGLE_SERVICE_ACCOUNT", value);
    expect(sandboxContext("owner").stores.google).toBe(false);
    await expect(verifyAndDeliver("owner", "google", "proof", ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    expect(ports.verifyGoogle).not.toHaveBeenCalled();
    expect(ports.deliverNativePurchase).not.toHaveBeenCalled();
    noExternalWork();
  });

  it.each([
    ["production", "test", false], ["production", "production", false],
    ["unknown", "test", false], ["", "test", false],
    [undefined, "production", false], [undefined, undefined, false],
    [undefined, "test", true], [undefined, "development", true],
    ["preview", "production", true], ["development", "development", true],
  ] as const)("deployment %s / runtime %s permits billing: %s", async (deployment, runtime, enabled) => {
    const { ports } = fixture();
    vi.stubEnv("VERCEL_ENV", deployment);
    vi.stubEnv("NODE_ENV", runtime);
    expect(googleBillingEnabled()).toBe(enabled);
    if (enabled) await expect(verifyAndDeliver("owner", "google", "proof", ports)).resolves.toEqual({ delivered: true, active: true });
    else {
      await expect(verifyAndDeliver("owner", "google", "proof", ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
      expect(ports.verifyGoogle).not.toHaveBeenCalled();
      expect(ports.deliverNativePurchase).not.toHaveBeenCalled();
    }
  });

  it("still requires sandbox mode, account secret and tester allowlisting", async () => {
    const { ports } = fixture();
    vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE", "production");
    await expect(verifyAndDeliver("owner", "google", "proof", ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE", "sandbox");
    vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET", "short");
    await expect(verifyAndDeliver("owner", "google", "proof", ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET", "s".repeat(40));
    await expect(verifyAndDeliver("not-allowlisted", "google", "proof", ports)).rejects.toThrow("UNAVAILABLE");
    expect(ports.verifyGoogle).not.toHaveBeenCalled();
  });

  it("rechecks after async verification before durable delivery", async () => {
    const { evidence, ports } = fixture();
    ports.verifyGoogle.mockImplementation(async () => { vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "0"); return evidence; });
    await expect(verifyAndDeliver("owner", "google", "proof", ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    expect(ports.deliverNativePurchase).not.toHaveBeenCalled();
    expect(ports.acknowledgeGoogle).not.toHaveBeenCalled();
  });

  it("does not acknowledge if disabled during delivery", async () => {
    const { ports } = fixture();
    ports.deliverNativePurchase.mockImplementation(async () => { vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "0"); return "active"; });
    await expect(verifyAndDeliver("owner", "google", "proof", ports)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    expect(ports.acknowledgeGoogle).not.toHaveBeenCalled();
  });

  it("does not disable Apple when Google flag/configuration is absent", async () => {
    const { ports } = fixture();
    vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", undefined);
    vi.stubEnv("CITYWALK_GOOGLE_SERVICE_ACCOUNT", undefined);
    await expect(verifyAndDeliver("owner", "apple", "apple-proof", ports)).resolves.toEqual({ delivered: true, active: true });
    expect(ports.verifyApple).toHaveBeenCalledOnce();
    expect(ports.deliverNativePurchase).toHaveBeenCalledOnce();
    expect(ports.verifyGoogle).not.toHaveBeenCalled();
    expect(ports.acknowledgeGoogle).not.toHaveBeenCalled();
  });
});

it("forged HTTP purchase/restore requests cannot bypass the real service gate", async () => {
  vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "0");
  for (const proof of ["purchase-proof", "restored-proof"]) {
    const request = new Request("https://preview.test/api/commerce/city-unlock/lubeck?googleEnabled=1", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Citywalk-Account": "owner" },
      body: JSON.stringify({ store: "google", proof }),
    });
    const response = await purchase(request, { params: Promise.resolve({ citySlug: "lubeck" }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "GOOGLE_BILLING_DISABLED" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  }
  noExternalWork();
});

it.each(["oneTimeProductNotification", "voidedPurchaseNotification", "testNotification"])("disabled %s returns retryable failure, with zero provider/event/grant writes", async type => {
  vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "0");
  const data = Buffer.from(JSON.stringify({ packageName: "com.citywalk.app", [type]: { purchaseToken: "synthetic-proof" } })).toString("base64");
  const response = await notification(new Request("https://preview.test/api/commerce/native/notifications/google", {
    method: "POST", headers: { "Content-Type": "application/json", authorization: "Bearer test-only" },
    body: JSON.stringify({ message: { data } }),
  }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "GOOGLE_BILLING_DISABLED" });
  noExternalWork();
});

it("rechecks the Google ledger policy after waiting for the transaction lock", async () => {
  const { evidence } = fixture();
  const tx = {
    execute: vi.fn(async () => { vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "0"); }),
    select: vi.fn(), insert: vi.fn(), update: vi.fn(),
  };
  mocks.db.mockReturnValue({ transaction: async (operation: (value: typeof tx) => Promise<unknown>) => operation(tx) });
  await expect(deliverNativePurchase(evidence, "owner")).rejects.toThrow("GOOGLE_BILLING_DISABLED");
  expect(tx.execute).toHaveBeenCalledOnce();
  expect(tx.select).not.toHaveBeenCalled();
  expect(tx.insert).not.toHaveBeenCalled();
  expect(tx.update).not.toHaveBeenCalled();
});
