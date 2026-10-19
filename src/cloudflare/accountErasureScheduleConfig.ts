export type AccountErasureScheduleEnvironment = Readonly<{
  BETTER_AUTH_SECRET?: string;
  COMMERCE_REVENUECAT_SECRET_API_KEY?: string;
  CITYWALK_APPLE_OAUTH_CLIENT_ID?: string;
  CITYWALK_APPLE_TEAM_ID?: string;
  CITYWALK_APPLE_KEY_ID?: string;
  CITYWALK_APPLE_PRIVATE_KEY?: string;
  CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER?: string;
}>;

export const ACCOUNT_ERASURE_PROVIDERS = ["apple", "revenuecat"] as const;
export type AccountErasureProvider = typeof ACCOUNT_ERASURE_PROVIDERS[number];

const APPLE_REQUIRED_ENV_KEYS = [
  "BETTER_AUTH_SECRET",
  "CITYWALK_APPLE_OAUTH_CLIENT_ID",
  "CITYWALK_APPLE_TEAM_ID",
  "CITYWALK_APPLE_KEY_ID",
  "CITYWALK_APPLE_PRIVATE_KEY",
  "CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER",
] as const;

export function configuredAccountErasureProviders(
  env: AccountErasureScheduleEnvironment,
): readonly AccountErasureProvider[] {
  return ACCOUNT_ERASURE_PROVIDERS.filter(provider => provider === "apple"
    ? APPLE_REQUIRED_ENV_KEYS.every(key => Boolean(env[key]?.trim()))
    : Boolean(env.COMMERCE_REVENUECAT_SECRET_API_KEY?.trim()));
}

export function isAccountErasureScheduleConfigured(
  env: AccountErasureScheduleEnvironment,
): boolean {
  return configuredAccountErasureProviders(env).length > 0;
}
