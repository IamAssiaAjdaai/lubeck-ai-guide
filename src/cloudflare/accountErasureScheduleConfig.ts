export type AccountErasureScheduleEnvironment = Readonly<{
  BETTER_AUTH_SECRET?: string;
  COMMERCE_REVENUECAT_SECRET_API_KEY?: string;
  CITYWALK_APPLE_OAUTH_CLIENT_ID?: string;
  CITYWALK_APPLE_TEAM_ID?: string;
  CITYWALK_APPLE_KEY_ID?: string;
  CITYWALK_APPLE_PRIVATE_KEY?: string;
  CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER?: string;
}>;

const REQUIRED_ENV_KEYS = [
  "BETTER_AUTH_SECRET",
  "COMMERCE_REVENUECAT_SECRET_API_KEY",
  "CITYWALK_APPLE_OAUTH_CLIENT_ID",
  "CITYWALK_APPLE_TEAM_ID",
  "CITYWALK_APPLE_KEY_ID",
  "CITYWALK_APPLE_PRIVATE_KEY",
  "CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER",
] as const;

export function isAccountErasureScheduleConfigured(
  env: AccountErasureScheduleEnvironment,
): boolean {
  return REQUIRED_ENV_KEYS.every((key) => Boolean(env[key]?.trim()));
}
