const MINIMUM_AUTH_SECRET_LENGTH = 32;

export type BetterAuthEnvironment = Readonly<{
  secret: string;
  baseURL: string;
}>;

export function getBetterAuthEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BetterAuthEnvironment {
  const secret = environment.BETTER_AUTH_SECRET?.trim();
  const baseURL = environment.BETTER_AUTH_URL?.trim();

  if (!secret || secret.length < MINIMUM_AUTH_SECRET_LENGTH) {
    throw new Error(
      "BETTER_AUTH_SECRET must be configured with at least 32 characters.",
    );
  }

  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL must be configured.");
  }

  let parsedURL: URL;
  try {
    parsedURL = new URL(baseURL);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use http or https.");
  }

  return { secret, baseURL: parsedURL.origin };
}
