// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createPreviewWorker } from "./previewEntrypoint";
import { authorizePreview, initialPreviewRoute, PREVIEW_SECRET_BINDINGS, PREVIEW_TEXT_BINDINGS, previewConfigurationIsReady } from "./previewPolicy";
import { FIXTURE_HYPERDRIVE, requirePreviewHyperdrive, validatePreviewArtifact } from "../../tools/cloudflare-preview/contract.mjs";

const origin = "https://citywalk-api-preview.synthetic.workers.dev";
function environment(): Record<string, unknown> {
  return {
    ...PREVIEW_TEXT_BINDINGS,
    ...Object.fromEntries(PREVIEW_SECRET_BINDINGS.map(key => [key, "synthetic-value-longer-than-thirty-two-characters"])),
    CITYWALK_PREVIEW_DEPLOYMENT_LOCK: "0", // Test-only future resource gate.
    BETTER_AUTH_URL: origin,
    CITYWALK_PREVIEW_DATABASE_NAME: "citywalk_preview_synthetic",
    CITYWALK_PREVIEW_DATABASE_USER: "citywalk_preview_reader",
    CITYWALK_MEDIA_S3_ENDPOINT: "https://preview-storage.example.test",
    CITYWALK_MEDIA_S3_BUCKET: "citywalk-preview-synthetic",
    HYPERDRIVE: { connectionString: "postgresql://citywalk_preview_reader:synthetic@hyperdrive.local/citywalk_preview_synthetic" },
    ASSETS: {},
  };
}
function config() {
  return {
    name: "citywalk-api-preview", workersDev: false, previewUrls: false,
    domains: [], triggers: [], compatibilityDate: "2026-10-03", compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none", runWorkerFirst: true },
    manifest: { type: "partial", mainModule: "index.js", modules: {} },
    env: {
      ASSETS: { type: "assets" }, HYPERDRIVE: { type: "hyperdrive", id: FIXTURE_HYPERDRIVE },
      ...Object.fromEntries(Object.entries(PREVIEW_TEXT_BINDINGS).map(([key, value]) => [key, { type: "text", value }])),
      ...Object.fromEntries(PREVIEW_SECRET_BINDINGS.map(key => [key, { type: "secret" }])),
    },
  };
}
const request = (env: Record<string, unknown>, route = "/api/content/cities", method = "GET") => new Request(origin + route, {
  method, headers: { "x-citywalk-preview-token": String(env.CITYWALK_PREVIEW_ACCESS_TOKEN), cookie: "better-auth.session_token=synthetic-session" },
});

describe("Preview runtime boundary", () => {
  it("never imports or delegates to the database/application while the generated lock is present", async () => {
    const delegate = vi.fn();
    const worker = createPreviewWorker(delegate);
    for (const env of [{}, { ...environment(), ...PREVIEW_TEXT_BINDINGS }, { ...environment(), CITYWALK_PREVIEW_DEPLOYMENT_LOCK: undefined }]) {
      const response = await worker.fetch(request(env), env, {});
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
    }
    expect(delegate).not.toHaveBeenCalled();
    expect(worker).not.toHaveProperty("scheduled");
  });
  it.each(PREVIEW_SECRET_BINDINGS)("rejects a missing isolated binding: %s", key => {
    const env = environment(); delete env[key];
    expect(previewConfigurationIsReady(env)).toBe(false);
  });
  it.each(["DATABASE_URL", "RESEND_API_KEY", "GROQ_API_KEY", "STRIPE_SECRET_KEY", "COMMERCE_REVENUECAT_WEBHOOK_AUTHORIZATION", "CITYWALK_APPLE_PRIVATE_KEY", "CITYWALK_GOOGLE_SERVICE_ACCOUNT"])("rejects inherited provider/fallback configuration: %s", key => {
    expect(previewConfigurationIsReady({ ...environment(), [key]: "synthetic" })).toBe(false);
  });
  it.each([
    ["CITYWALK_RUNTIME_ENV", "production"], ["CITYWALK_NATIVE_BILLING_MODE", "sandbox"],
    ["CITYWALK_GOOGLE_TEST_PURCHASES", "1"], ["CITYWALK_LEGAL_PUBLICATION_APPROVED", "1"],
    ["BETTER_AUTH_URL", "https://getcitywalk.com"], ["BETTER_AUTH_URL", "http://citywalk-api-preview.synthetic.workers.dev"],
    ["CITYWALK_PREVIEW_DATABASE_NAME", "production"], ["CITYWALK_PREVIEW_DATABASE_USER", "postgres"],
    ["CITYWALK_MEDIA_S3_BUCKET", "citywalk-production"], ["CITYWALK_MEDIA_S3_ENDPOINT", "http://storage.example.test"],
    ["HYPERDRIVE", { connectionString: "postgresql://wrong:synthetic@hyperdrive.local/production" }],
  ])("rejects unsafe configuration for %s", (key, value) => {
    expect(previewConfigurationIsReady({ ...environment(), [key as string]: value })).toBe(false);
  });
  it("requires the separate access token and exact Preview request origin", async () => {
    const env = environment();
    expect(await authorizePreview(new Request(origin + "/api/health"), env)).toBe(401);
    expect(await authorizePreview(new Request("https://getcitywalk.com/api/health"), env)).toBe(403);
  });
  it("blocks get-session because preview runtime cannot read session tables", async () => {
    const env = environment();
    expect(initialPreviewRoute(request(env, "/api/auth/get-session"))).toBe(false);
    expect(await authorizePreview(request(env, "/api/auth/get-session"), env)).toBe(503);
  });
  it.each(["/api/guide", "/api/commerce/checkout", "/api/commerce/native/notifications/apple", "/api/commerce/native/notifications/google", "/api/commerce/webhooks/revenuecat", "/api/commerce/webhooks/stripe", "/api/account/delete-request", "/api/auth/sign-up/email", "/api/auth/sign-in/email", "/api/auth/sign-in/social", "/api/admin/generate", "/api/content/image"])("blocks provider, email or unreviewed route %s", async route => {
    const env = environment();
    expect(await authorizePreview(request(env, route), env)).toBe(503);
    expect(initialPreviewRoute(request(env, route, "POST"))).toBe(false);
  });
  it.each(["GET", "HEAD", "OPTIONS"])("strips the Preview access token and preserves safe request semantics: %s", async method => {
    const env = environment();
    const delegate = vi.fn(async (req: Request) => {
      expect(req.headers.has("x-citywalk-preview-token")).toBe(false);
      expect(req.headers.get("cookie")).toBe("better-auth.session_token=synthetic-session");
      expect(req.url).toBe(origin + "/api/content/cities?locale=en");
      expect(req.method).toBe(method);
      return new Response(null, { status: 204, headers: { "set-cookie": "synthetic-cookie=1; Secure; HttpOnly" } });
    });
    const response = await createPreviewWorker(delegate).fetch(request(env, "/api/content/cities?locale=en", method), env, {});
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("synthetic-cookie");
    expect(delegate).toHaveBeenCalledOnce();
  });
});

describe("exact Preview artifact contract", () => {
  it("accepts only the locked Preview binding set", () => {
    expect(validatePreviewArtifact(config(), FIXTURE_HYPERDRIVE).locked).toBe(true);
    expect(requirePreviewHyperdrive("1".repeat(32), false)).toBe("1".repeat(32));
  });
  it.each([undefined, "", "invalid", "390958927c2946be8571ec5282b35ce6", FIXTURE_HYPERDRIVE])("rejects absent/production/unapproved fixture Hyperdrive", id => {
    expect(() => requirePreviewHyperdrive(id, false)).toThrow();
  });
  it.each([
    { name: "citywalk-production" }, { name: "other-worker" }, { workersDev: true }, { previewUrls: true },
    { domains: ["getcitywalk.com"] }, { triggers: [{ type: "scheduled", schedule: "* * * * *" }] },
    { triggers: [{ type: "fetch", pattern: "getcitywalk.com/*" }] }, { assets: { notFoundHandling: "single-page-application" } },
    { containers: [] }, { routes: [] },
  ])("rejects unsafe generated target mutation %j", mutation => {
    expect(() => validatePreviewArtifact({ ...config(), ...mutation }, FIXTURE_HYPERDRIVE)).toThrow();
  });
  it.each(["HYPERDRIVE", "BETTER_AUTH_SECRET", "CITYWALK_PREVIEW_DEPLOYMENT_LOCK"])("rejects missing/mutated binding %s", key => {
    const c = config(); delete c.env[key as keyof typeof c.env];
    expect(() => validatePreviewArtifact(c, FIXTURE_HYPERDRIVE)).toThrow();
  });
  it("rejects extra provider bindings, production Hyperdrive and unexpected root resources", () => {
    const c = config();
    expect(() => validatePreviewArtifact({ ...c, env: { ...c.env, RESEND_API_KEY: { type: "secret" } } }, FIXTURE_HYPERDRIVE)).toThrow();
    expect(() => validatePreviewArtifact({ ...c, env: { ...c.env, HYPERDRIVE: { type: "hyperdrive", id: "390958927c2946be8571ec5282b35ce6" } } }, FIXTURE_HYPERDRIVE)).toThrow();
    expect(() => validatePreviewArtifact(c, FIXTURE_HYPERDRIVE, { containers: [] })).toThrow();
    expect(() => validatePreviewArtifact({ ...c, env: { ...c.env, CITYWALK_PREVIEW_DEPLOYMENT_LOCK: { type: "text", value: "0" } } }, FIXTURE_HYPERDRIVE)).toThrow();
  });
});
