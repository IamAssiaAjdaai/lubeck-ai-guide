export const MOBILE_API_ENVIRONMENTS = [
  "development",
  "preview",
  "production",
] as const;

export type MobileApiEnvironment = (typeof MOBILE_API_ENVIRONMENTS)[number];

export type ApiOriginInput = Readonly<{
  environment?: string;
  configuredOrigin?: string;
}>;

const DEVELOPMENT_FALLBACK_ORIGIN = "http://localhost:3000";

export function resolveApiOrigin({
  environment = "development",
  configuredOrigin,
}: ApiOriginInput): string {
  if (!MOBILE_API_ENVIRONMENTS.includes(environment as MobileApiEnvironment)) {
    throw new Error("Unsupported CITYWALK mobile API environment.");
  }

  const mode = environment as MobileApiEnvironment;
  const candidate = configuredOrigin?.trim() ||
    (mode === "development" ? DEVELOPMENT_FALLBACK_ORIGIN : undefined);

  if (!candidate) {
    throw new Error(`A CITYWALK API origin is required for ${mode} builds.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("CITYWALK API origin must be an absolute URL.");
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("CITYWALK API origin must contain only scheme and host.");
  }

  if (mode === "development") {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Development API origin must use HTTP or HTTPS.");
    }
  } else if (parsed.protocol !== "https:") {
    throw new Error(`${mode} API origin must use HTTPS.`);
  }

  if (mode === "preview" && !parsed.hostname.endsWith(".vercel.app")) {
    throw new Error("Preview API origin must be a Vercel Preview hostname.");
  }

  if (mode === "production" && isLocalHostname(parsed.hostname)) {
    throw new Error("Production API origin cannot target a local host.");
  }

  return parsed.origin;
}

export function getConfiguredApiOrigin(): string {
  return resolveApiOrigin({
    environment: process.env.EXPO_PUBLIC_CITYWALK_ENV,
    configuredOrigin: process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
  });
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[|\]$/g, "");
  const isIpv6 = normalized.includes(":");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("127.") ||
    (isIpv6 && (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized)
    )) ||
    normalized.startsWith("10.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  );
}
