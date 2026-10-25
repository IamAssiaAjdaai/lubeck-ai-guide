// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { createNativePreviewWorker, nativePreviewReady } from "./nativePreviewEntrypoint";
import { NATIVE_PREVIEW_ORIGIN as origin, NATIVE_PREVIEW_SECRETS, NATIVE_PREVIEW_TEXT } from "./nativePreviewBindings.mjs";

let privateKey: CryptoKey, jwks: string;
beforeAll(async () => {
  const keys = await generateKeyPair("RS256");
  privateKey = keys.privateKey;
  jwks = JSON.stringify({ keys: [{ ...await exportJWK(keys.publicKey), kid: "synthetic-key", use: "sig", alg: "RS256" }] });
});
function environment(): Record<string, unknown> {
  return {
    ...NATIVE_PREVIEW_TEXT,
    ...Object.fromEntries(NATIVE_PREVIEW_SECRETS.map(key => [key, "synthetic-value-longer-than-thirty-two-characters"])),
    CITYWALK_PREVIEW_DEPLOYMENT_LOCK: "0", // Unit fixtures ONLY; no artifact is unlocked.
    CITYWALK_BUILD_REVISION: "a".repeat(40), CITYWALK_PREVIEW_BOUND_HYPERDRIVE: "1".repeat(32), BETTER_AUTH_URL: origin,
    CITYWALK_TESTER_ISSUER: "https://issuer.example.test/", CITYWALK_TESTER_CLIENT_ID: "synthetic-public-android-client",
    CITYWALK_TESTER_SUBJECTS: '["synthetic-tester"]', CITYWALK_TESTER_JWKS: jwks,
    CITYWALK_PREVIEW_DATABASE_NAME: "citywalk_preview_synthetic", CITYWALK_PREVIEW_DATABASE_USER: "citywalk_preview_reader",
    HYPERDRIVE: { connectionString: "postgresql://citywalk_preview_reader:synthetic@hyperdrive.local/citywalk_preview_synthetic" },
    ASSETS: {}, CITYWALK_MEDIA_S3_ENDPOINT: "https://storage.example.test", CITYWALK_MEDIA_S3_BUCKET: "citywalk-preview-synthetic",
    CITYWALK_PREVIEW_RESOURCE_PINS: JSON.stringify({ syntheticOnly: true, originVerified: true,
      hyperdriveId: "1".repeat(32), originHost: "ep-synthetic.eu-central-1.aws.neon.tech", branchId: "br-synthetic",
      database: "citywalk_preview_synthetic", role: "citywalk_preview_reader" }),
  };
}
async function token(changes: JWTPayload = {}, typ = "at+jwt") {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: "https://issuer.example.test/", aud: origin, sub: "synthetic-tester", iat: now, exp: now + 300,
    jti: "synthetic-token", client_id: "synthetic-public-android-client", scope: "citywalk:preview:read", ...changes,
  }).setProtectedHeader({ alg: "RS256", typ, kid: "synthetic-key" }).sign(privateKey);
}
async function request(route = "/api/content/cities?locale=en", method = "GET", value?: string) {
  return new Request(origin + route, { method, headers: {
    "x-citywalk-tester-token": value ?? await token(), "x-citywalk-preview-token": "obsolete-shared-token",
    authorization: "Bearer synthetic-traveler-token", cookie: "better-auth.session_token=synthetic-session",
  } });
}
const responseFor = async (req: Request, env = environment()) => createNativePreviewWorker(async () => new Response(null, { status: 204 })).fetch(req, env, {});

describe("native tester perimeter", () => {
  it("keeps missing/locked configuration before all imports and requests", async () => {
    const delegate = vi.fn(); const worker = createNativePreviewWorker(delegate);
    for (const env of [{}, { ...environment(), ...NATIVE_PREVIEW_TEXT }]) expect((await worker.fetch(await request(), env, {})).status).toBe(503);
    expect(delegate).not.toHaveBeenCalled(); expect(worker).not.toHaveProperty("scheduled");
  });
  it.each(NATIVE_PREVIEW_SECRETS)("fails closed without %s", key => {
    const env = environment(); delete env[key]; expect(nativePreviewReady(env)).toBe(false);
  });
  it.each(["DATABASE_URL", "CITYWALK_PREVIEW_ACCESS_TOKEN", "GROQ_API_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY", "CITYWALK_APPLE_PRIVATE_KEY", "CITYWALK_GOOGLE_SERVICE_ACCOUNT"])("rejects inherited %s", key => {
    expect(nativePreviewReady({ ...environment(), [key]: "not-allowed" })).toBe(false);
  });
  it.each([
    ["BETTER_AUTH_URL", "https://getcitywalk.com"], ["BETTER_AUTH_URL", origin + "/"],
    ["CITYWALK_BUILD_REVISION", "abcdef0"], ["CITYWALK_NATIVE_BILLING_MODE", "sandbox"],
    ["CITYWALK_RUNTIME_ENV", "production"], ["CITYWALK_LEGAL_PUBLICATION_APPROVED", "1"],
    ["CITYWALK_PREVIEW_DATABASE_NAME", "production"], ["CITYWALK_MEDIA_S3_BUCKET", "citywalk-production"],
    ["HYPERDRIVE", { connectionString: "postgresql://postgres:synthetic@hyperdrive.local/production" }],
  ])("rejects unsafe %s", (key, value) => expect(nativePreviewReady({ ...environment(), [key as string]: value })).toBe(false));
  it.each([
    { iss: "https://wrong.example.test/" }, { aud: "https://getcitywalk.com" }, { aud: [origin, "other"] },
    { sub: "not-invited" }, { scope: "openid" }, { client_id: "other-client" },
    { exp: 1 }, { exp: Math.floor(Date.now() / 1000) + 600 }, { iat: Math.floor(Date.now() / 1000) + 60 },
    { jti: undefined }, { exp: undefined }, { iat: undefined },
  ])("rejects invalid signed claims %j", async claims => {
    expect((await responseFor(await request(undefined, undefined, await token(claims)))).status).toBe(401);
  });
  it.each(["JWT", "id+jwt"])("rejects ID/other token type %s", async typ => expect((await responseFor(await request(undefined, undefined, await token({}, typ)))).status).toBe(401));
  it("rejects symmetric and unsigned tokens even with a trusted key ID", async () => {
    const symmetric = await new SignJWT({}).setProtectedHeader({ alg: "HS256", typ: "at+jwt", kid: "synthetic-key" }).sign(new Uint8Array(32));
    const unsigned = btoa(JSON.stringify({ alg: "none", typ: "at+jwt" })) + ".e30.";
    for (const value of [symmetric, unsigned]) expect((await responseFor(await request(undefined, undefined, value))).status).toBe(401);
  });
  it.each(["", "a.b.c", "a".repeat(8193)])("rejects absent/malformed/oversized token", async value => expect((await responseFor(await request(undefined, undefined, value))).status).toBe(401));
  it("rejects signatures from an untrusted key, removed testers and malformed keysets without network", async () => {
    const foreign = await generateKeyPair("RS256");
    const invalid = await new SignJWT({}).setProtectedHeader({ alg: "RS256", typ: "at+jwt", kid: "synthetic-key" }).sign(foreign.privateKey);
    expect((await responseFor(await request(undefined, undefined, invalid))).status).toBe(401);
    for (const update of [{ CITYWALK_TESTER_SUBJECTS: "[]" }, { CITYWALK_TESTER_JWKS: "{}" }, { CITYWALK_TESTER_ISSUER: "http://issuer.example.test/" }]) {
      expect((await responseFor(await request(), { ...environment(), ...update })).status).toBe(401);
    }
  });
  it("fails closed when initial tester allowlist contains multiple subjects", async () => {
    const env = environment();
    env.CITYWALK_TESTER_SUBJECTS = '["synthetic-tester","uninvited-second"]';
    expect((await responseFor(await request(), env)).status).toBe(401);
  });
  it.each(["https://getcitywalk.com", "https://api-preview.getcitywalk.com.evil.test", "https://citywalk-api-preview.test.workers.dev", "http://api-preview.getcitywalk.com"])("rejects alternate host %s", async host => {
    expect((await responseFor(new Request(host + "/api/health"))).status).toBe(403);
  });
  it("does not make a CORS exception for browsers", async () => {
    const req = await request(); req.headers.set("origin", origin);
    const response = await responseFor(req); expect(response.status).toBe(403); expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });
  it.each(["GET", "HEAD", "OPTIONS"])("preserves traveler auth/cookies and semantics while stripping tester credentials: %s", async method => {
    const req = await request(undefined, method);
    const delegate = vi.fn(async (application: Request) => {
      expect(application.url).toBe(req.url); expect(application.method).toBe(method);
      expect(application.headers.has("x-citywalk-tester-token")).toBe(false);
      expect(application.headers.has("x-citywalk-preview-token")).toBe(false);
      expect(application.headers.get("authorization")).toBe("Bearer synthetic-traveler-token");
      expect(application.headers.get("cookie")).toBe("better-auth.session_token=synthetic-session");
      return new Response(null, { status: 204, headers: { "set-cookie": "synthetic=1; Secure; HttpOnly" } });
    });
    const response = await createNativePreviewWorker(delegate).fetch(req, environment(), {});
    expect(response.status).toBe(204); expect(delegate).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("set-cookie")).toContain("synthetic=1");
  });
  it.each(["/api/guide", "/api/commerce/checkout", "/api/commerce/native/notifications/apple", "/api/commerce/native/notifications/google", "/api/commerce/webhooks/revenuecat", "/api/auth/sign-in/email", "/api/auth/sign-in/social", "/api/account/delete-request", "/api/admin/generate", "/api/content/image", "/"])("never delegates unapproved route %s", async route => {
    const delegate = vi.fn();
    expect((await createNativePreviewWorker(delegate).fetch(await request(route, "POST"), environment(), {})).status).toBe(503);
    expect(delegate).not.toHaveBeenCalled();
  });
  it("never delegates writes even on permitted paths", async () => expect((await responseFor(await request("/api/content/cities", "POST"))).status).toBe(503));
  it.each([{ originVerified: false }, { syntheticOnly: false }, { branchId: "production" }, { originHost: "ep-synthetic-pooler.eu-central-1.aws.neon.tech" }, { database: "production" }, { role: "postgres" }, { hyperdriveId: "0".repeat(32) }, { hyperdriveId: "2".repeat(32) }])("rejects incomplete resource pins %j", update => {
    const env = environment(); env.CITYWALK_PREVIEW_RESOURCE_PINS = JSON.stringify({ ...JSON.parse(String(env.CITYWALK_PREVIEW_RESOURCE_PINS)), ...update });
    expect(nativePreviewReady(env)).toBe(false);
  });
  it("keeps real Preview data denied unless all explicit reviews and exact resources are pinned", () => {
    const env = environment();
    const pins = JSON.parse(String(env.CITYWALK_PREVIEW_RESOURCE_PINS));
    Object.assign(pins, {
      syntheticOnly: false, dataClassification: "reviewed-real-preview",
      neonProjectId: "lively-morning-52726120",
      branchId: "br-sweet-snow-b94c3j20",
      hyperdriveId: "296bd4ea316b4ab88489330b858ebb34",
      originHost: "ep-summer-bread-b9ugomnk.c-7.eu-central-1.aws.neon.tech",
      database: "citywalk_preview_app", role: "citywalk_preview_app_runtime",
      provenanceReviewed: true, mediaRightsReviewed: true, privacyReviewed: true,
      reviewEvidenceSha256: "a".repeat(64),
    });
    env.CITYWALK_MEDIA_S3_BUCKET = "citywalk-preview-media";
    env.CITYWALK_PREVIEW_DATABASE_NAME = pins.database;
    env.CITYWALK_PREVIEW_DATABASE_USER = pins.role;
    env.CITYWALK_PREVIEW_BOUND_HYPERDRIVE = pins.hyperdriveId;
    env.HYPERDRIVE = { connectionString: "postgresql://citywalk_preview_app_runtime:test@hyperdrive.local/citywalk_preview_app" };
    const ready = (changes: Record<string, unknown> = {}) => {
      env.CITYWALK_PREVIEW_RESOURCE_PINS = JSON.stringify({ ...pins, ...changes });
      return nativePreviewReady(env);
    };
    expect(ready()).toBe(true); // Synthetic test environment only, NOT deployment approval.
    for (const changes of [
      { provenanceReviewed: false }, { mediaRightsReviewed: false }, { privacyReviewed: false },
      { reviewEvidenceSha256: "" }, { dataClassification: "synthetic" },
      { neonProjectId: "noisy-dream-24060983" }, { branchId: "br-unapproved" },
      { originHost: "ep-production.eu-central-1.aws.neon.tech" },
      { role: "postgres" }, { syntheticOnly: undefined },
    ]) expect(ready(changes)).toBe(false);
    env.CITYWALK_MEDIA_S3_BUCKET = "citywalk-preview-synthetic";
    expect(ready()).toBe(false);
    env.CITYWALK_MEDIA_S3_BUCKET = "citywalk-preview-media";
    env.CITYWALK_PREVIEW_DEPLOYMENT_LOCK = "1";
    expect(ready()).toBe(false);
  });

});
