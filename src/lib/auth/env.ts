const MINIMUM_AUTH_SECRET_LENGTH = 32;

export type BetterAuthEnvironment = Readonly<{
  secret: string;
  baseURL: string | BetterAuthDynamicBaseURL;
}>;

export type BetterAuthDynamicBaseURL = Readonly<{
  allowedHosts: string[];
  protocol: "https";
  fallback: string;
}>;

export function getBetterAuthEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BetterAuthEnvironment {
  const secret = environment.BETTER_AUTH_SECRET?.trim();

  if (!secret || secret.length < MINIMUM_AUTH_SECRET_LENGTH) {
    throw new Error(
      "BETTER_AUTH_SECRET must be configured with at least 32 characters.",
    );
  }

  const explicitBaseURL = environment.BETTER_AUTH_URL?.trim();
  if (explicitBaseURL) {
    return {
      secret,
      baseURL: parseExplicitBaseURL(explicitBaseURL),
    };
  }

  const vercelURL = environment.VERCEL_URL?.trim();
  if (!vercelURL) {
    throw new Error(
      "BETTER_AUTH_URL must be configured when VERCEL_URL is unavailable.",
    );
  }

  const deploymentHost = parseVercelHostname(vercelURL, "VERCEL_URL");
  const branchURL = environment.VERCEL_BRANCH_URL?.trim();
  const branchHost = branchURL
    ? parseVercelHostname(branchURL, "VERCEL_BRANCH_URL")
    : undefined;
  const allowedHosts = [...new Set([deploymentHost, branchHost])].filter(
    (host): host is string => Boolean(host),
  );

  return {
    secret,
    baseURL: {
      allowedHosts,
      protocol: "https",
      fallback: `https://${deploymentHost}`,
    },
  };
}

function parseExplicitBaseURL(baseURL: string): string {
  let parsedURL: URL;
  try {
    parsedURL = new URL(baseURL);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use http or https.");
  }

  return parsedURL.origin;
}

function parseVercelHostname(hostname: string, variableName: string): string {
  let parsedURL: URL;
  try {
    parsedURL = new URL(`https://${hostname}`);
  } catch {
    throw new Error(`${variableName} must be a valid hostname.`);
  }

  if (
    parsedURL.protocol !== "https:" ||
    parsedURL.hostname !== hostname.toLowerCase() ||
    parsedURL.port ||
    parsedURL.username ||
    parsedURL.password ||
    parsedURL.pathname !== "/" ||
    parsedURL.search ||
    parsedURL.hash ||
    !isValidHostname(parsedURL.hostname)
  ) {
    throw new Error(`${variableName} must be a valid hostname.`);
  }

  return parsedURL.hostname;
}

function isValidHostname(hostname: string): boolean {
  return (
    hostname.length <= 253 &&
    hostname.split(".").every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  );
}
