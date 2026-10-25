import { createLocalJWKSet, jwtVerify } from "jose";
import { initialPreviewRoute } from "./previewPolicy";
import { NATIVE_PREVIEW_ORIGIN, NATIVE_PREVIEW_SECRETS, NATIVE_PREVIEW_TEXT } from "./nativePreviewBindings.mjs";

type Env = Record<string, unknown>;
type Delegate = (request: Request, env: Env, ctx: unknown) => Promise<Response>;
const testerHeader = "x-citywalk-tester-token";

// Offline keys only: token-controlled jku/x5u and remote discovery are never used.
async function testerAllowed(request: Request, env: Env): Promise<boolean> {
  try {
    const issuer = new URL(String(env.CITYWALK_TESTER_ISSUER));
    if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash) return false;
    const jwks = JSON.parse(String(env.CITYWALK_TESTER_JWKS));
    if (!Array.isArray(jwks.keys) || !jwks.keys.length || jwks.keys.length > 5 ||
      jwks.keys.some((key: Record<string, unknown>) => key.kty !== "RSA" || key.d || key.k || key.alg !== "RS256" || key.use !== "sig")) return false;
    const token = request.headers.get(testerHeader) ?? "";
    if (token.length > 8192) return false;
    const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
      algorithms: ["RS256"], typ: "at+jwt", issuer: issuer.href,
      audience: NATIVE_PREVIEW_ORIGIN, maxTokenAge: "5m", clockTolerance: 0,
      requiredClaims: ["sub", "iat", "exp", "jti", "client_id"],
    });
    const subjects: unknown = JSON.parse(String(env.CITYWALK_TESTER_SUBJECTS));
    return Array.isArray(subjects) && subjects.length === 1 &&
      subjects.every(subject => typeof subject === "string" && subject.length > 0) && subjects.includes(payload.sub) &&
      payload.client_id === env.CITYWALK_TESTER_CLIENT_ID && payload.aud === NATIVE_PREVIEW_ORIGIN &&
      typeof payload.exp === "number" && typeof payload.iat === "number" &&
      payload.exp > payload.iat && payload.exp - payload.iat <= 300 &&
      typeof payload.scope === "string" && payload.scope.split(" ").includes("citywalk:preview:read");
  } catch { return false; }
}

export function nativePreviewReady(env: Env): boolean {
  if (env.CITYWALK_PREVIEW_DEPLOYMENT_LOCK !== "0") return false;
  const keys = [...Object.keys(NATIVE_PREVIEW_TEXT), ...NATIVE_PREVIEW_SECRETS, "ASSETS", "HYPERDRIVE", "CITYWALK_BUILD_REVISION", "CITYWALK_PREVIEW_BOUND_HYPERDRIVE"];
  if (Object.keys(env).some(key => !keys.includes(key))) return false;
  if (Object.entries(NATIVE_PREVIEW_TEXT).some(([key, value]) => key !== "CITYWALK_PREVIEW_DEPLOYMENT_LOCK" && env[key] !== value)) return false;
  if (NATIVE_PREVIEW_SECRETS.some(key => typeof env[key] !== "string" || !String(env[key]).trim())) return false;
  if (!/^[a-f0-9]{40}$/.test(String(env.CITYWALK_BUILD_REVISION)) ||
      env.BETTER_AUTH_URL !== NATIVE_PREVIEW_ORIGIN || String(env.BETTER_AUTH_SECRET).length < 32) return false;
  try {
    const pins = JSON.parse(String(env.CITYWALK_PREVIEW_RESOURCE_PINS));
    const database = new URL((env.HYPERDRIVE as { connectionString: string }).connectionString);
    const media = new URL(String(env.CITYWALK_MEDIA_S3_ENDPOINT));
    // Hyperdrive's runtime hostname is a proxy, NOT evidence of its Neon origin.
    // Pins must first be privately verified against the control-plane identity.
    const synthetic = pins.syntheticOnly === true;
    // Real-data preview is a distinct, explicitly reviewed mode. These pins are
    // deliberately exact: a generic Neon host or a claimed "preview" role is not enough.
    // The artifact remains deployment-locked; review evidence must be independently
    // verified before any separate owner-approved activation.
    const reviewedRealPreview = pins.syntheticOnly === false &&
      pins.dataClassification === "reviewed-real-preview" &&
      pins.neonProjectId === "lively-morning-52726120" &&
      pins.branchId === "br-sweet-snow-b94c3j20" &&
      pins.hyperdriveId === "296bd4ea316b4ab88489330b858ebb34" &&
      pins.originHost === "ep-summer-bread-b9ugomnk.c-7.eu-central-1.aws.neon.tech" &&
      pins.database === "citywalk_preview_app" &&
      pins.role === "citywalk_preview_app_runtime" &&
      pins.provenanceReviewed === true && pins.mediaRightsReviewed === true &&
      pins.privacyReviewed === true &&
      typeof pins.reviewEvidenceSha256 === "string" &&
      /^[a-f0-9]{64}$/.test(pins.reviewEvidenceSha256);
    return (synthetic || reviewedRealPreview) && pins.originVerified === true &&
      /^[a-f0-9]{32}$/.test(pins.hyperdriveId) && pins.hyperdriveId !== "00000000000000000000000000000000" &&
      pins.hyperdriveId === env.CITYWALK_PREVIEW_BOUND_HYPERDRIVE &&
      /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(pins.originHost) && !pins.originHost.includes("-pooler.") &&
      /^br-[a-z0-9-]+$/.test(pins.branchId) && /^citywalk_preview_[a-z0-9_]+$/.test(pins.database) &&
      /^citywalk_preview_[a-z0-9_]+$/.test(pins.role) &&
      pins.database === env.CITYWALK_PREVIEW_DATABASE_NAME && pins.role === env.CITYWALK_PREVIEW_DATABASE_USER &&
      ["postgres:", "postgresql:"].includes(database.protocol) &&
      decodeURIComponent(database.pathname.slice(1)) === pins.database && decodeURIComponent(database.username) === pins.role &&
      /^citywalk-preview-[a-z0-9-]+$/.test(String(env.CITYWALK_MEDIA_S3_BUCKET)) &&
      media.protocol === "https:" && !media.username && !media.password && !media.search && !media.hash;
  } catch { return false; }
}

export function createNativePreviewWorker(delegate: Delegate) {
  return {
    async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
      const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" };
      const unavailable = (status: number) => new Response("Preview unavailable.", { status, headers });
      if (!nativePreviewReady(env)) return unavailable(503);
      if (new URL(request.url).origin !== NATIVE_PREVIEW_ORIGIN) return unavailable(403);
      // Native HTTP needs no CORS. Browser-based use needs a separate reviewed policy.
      if (request.headers.has("origin")) return unavailable(403);
      if (!await testerAllowed(request, env)) return unavailable(401);
      if (!initialPreviewRoute(request)) return unavailable(503);
      const applicationHeaders = new Headers(request.headers);
      applicationHeaders.delete(testerHeader);
      applicationHeaders.delete("x-citywalk-preview-token");
      const response = await delegate(new Request(request, { headers: applicationHeaders }), env, ctx);
      const resultHeaders = new Headers(response.headers);
      for (const [name, value] of Object.entries(headers)) resultHeaders.set(name, value);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: resultHeaders });
    },
  };
}

export default createNativePreviewWorker(async (request, env, ctx) => {
  const application = (await import("./entrypoint")).default;
  return application.fetch(request, env as Parameters<typeof application.fetch>[1], ctx as Parameters<typeof application.fetch>[2]);
});
