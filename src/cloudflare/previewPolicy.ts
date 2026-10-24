// Initial Preview is deliberately restricted. Enabling write/provider flows is
// a separate reviewed change, never an inherited production setting.
import { PREVIEW_SECRET_BINDINGS, PREVIEW_TEXT_BINDINGS } from "./previewBindings.mjs";
export { PREVIEW_SECRET_BINDINGS, PREVIEW_TEXT_BINDINGS } from "./previewBindings.mjs";

type Environment = Readonly<Record<string, unknown>>;
const permittedKeys = new Set<string>([
  ...Object.keys(PREVIEW_TEXT_BINDINGS), ...PREVIEW_SECRET_BINDINGS,
  "ASSETS", "HYPERDRIVE",
]);

function previewOrigin(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password &&
        !url.port && url.pathname === "/" && !url.search && !url.hash &&
        /^citywalk-api-preview\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)) return url.origin;
  } catch { /* Invalid configuration fails closed below. */ }
}

export function previewConfigurationIsReady(env: Environment): boolean {
  // Every generated artifact is locked. This is not unlocked by the prepare
  // command, environment variables or --fixture. Owner review must precede a
  // separate configuration change and remote resource verification.
  if (env.CITYWALK_PREVIEW_DEPLOYMENT_LOCK !== "0") return false;
  if (Object.keys(env).some(key => !permittedKeys.has(key))) return false;
  for (const [key, value] of Object.entries(PREVIEW_TEXT_BINDINGS)) {
    if (key !== "CITYWALK_PREVIEW_DEPLOYMENT_LOCK" && env[key] !== value) return false;
  }
  if (PREVIEW_SECRET_BINDINGS.some(key => typeof env[key] !== "string" || !(env[key] as string).trim())) return false;
  if ((env.BETTER_AUTH_SECRET as string).length < 32 || (env.CITYWALK_PREVIEW_ACCESS_TOKEN as string).length < 32) return false;
  if (!previewOrigin(env.BETTER_AUTH_URL)) return false;
  if (!/^citywalk_preview_[a-z0-9_]+$/.test(String(env.CITYWALK_PREVIEW_DATABASE_NAME)) ||
      !/^citywalk_preview_[a-z0-9_]+$/.test(String(env.CITYWALK_PREVIEW_DATABASE_USER)) ||
      !/^citywalk-preview-[a-z0-9-]+$/.test(String(env.CITYWALK_MEDIA_S3_BUCKET))) return false;
  try {
    const endpoint = new URL(String(env.CITYWALK_MEDIA_S3_ENDPOINT));
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return false;
    const hyperdrive = env.HYPERDRIVE as { connectionString?: string } | undefined;
    const db = new URL(hyperdrive?.connectionString ?? "");
    if (!["postgres:", "postgresql:"].includes(db.protocol) ||
        decodeURIComponent(db.pathname.slice(1)) !== env.CITYWALK_PREVIEW_DATABASE_NAME ||
        decodeURIComponent(db.username) !== env.CITYWALK_PREVIEW_DATABASE_USER) return false;
  } catch { return false; }
  return true;
}

export function initialPreviewRoute(request: Request): boolean {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const path = new URL(request.url).pathname;
  return ["/api/health", "/api/auth/get-session", "/api/content/cities"].includes(path) ||
    /^\/api\/content\/cities\/[a-z0-9-]+(?:\/summary|\/places\/[a-z0-9-]+)?$/.test(path);
}

export async function authorizePreview(request: Request, env: Environment): Promise<403 | 401 | 503 | undefined> {
  if (!previewConfigurationIsReady(env)) return 503;
  if (new URL(request.url).origin !== previewOrigin(env.BETTER_AUTH_URL)) return 403;
  const provided = request.headers.get("x-citywalk-preview-token") ?? "";
  const expected = env.CITYWALK_PREVIEW_ACCESS_TOKEN as string;
  const digest = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < aa.length; index++) difference |= aa[index] ^ bb[index];
  if (difference !== 0) return 401;
  if (!initialPreviewRoute(request)) return 503;
}
