import { importPKCS8, SignJWT } from "jose";

type Environment = Readonly<Record<string, string | undefined>>;

type GoogleProvider = Readonly<{
  clientId: string;
  clientSecret: string;
}>;

type AppleProvider = Readonly<{
  clientId: string;
  clientSecret: string;
  appBundleIdentifier: string;
}>;

export type CitywalkSocialAuthConfiguration = Readonly<{
  socialProviders: Readonly<{
    google?: GoogleProvider;
    apple?: () => Promise<AppleProvider>;
  }>;
  trustedOrigins: readonly string[];
}>;

export function getCitywalkSocialAuthConfiguration(
  environment: Environment = process.env,
): CitywalkSocialAuthConfiguration {
  const googleClientId = environment.CITYWALK_GOOGLE_OAUTH_CLIENT_ID?.trim();
  const googleClientSecret =
    environment.CITYWALK_GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  assertCompleteProvider(
    "Google",
    [
      ["CITYWALK_GOOGLE_OAUTH_CLIENT_ID", googleClientId],
      ["CITYWALK_GOOGLE_OAUTH_CLIENT_SECRET", googleClientSecret],
    ],
  );

  const appleClientId = environment.CITYWALK_APPLE_OAUTH_CLIENT_ID?.trim();
  const appleTeamId = environment.CITYWALK_APPLE_TEAM_ID?.trim();
  const appleKeyId = environment.CITYWALK_APPLE_KEY_ID?.trim();
  const applePrivateKey = environment.CITYWALK_APPLE_PRIVATE_KEY?.trim();
  const appleBundleIdentifier =
    environment.CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER?.trim();

  assertCompleteProvider(
    "Apple",
    [
      ["CITYWALK_APPLE_OAUTH_CLIENT_ID", appleClientId],
      ["CITYWALK_APPLE_TEAM_ID", appleTeamId],
      ["CITYWALK_APPLE_KEY_ID", appleKeyId],
      ["CITYWALK_APPLE_PRIVATE_KEY", applePrivateKey],
      ["CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER", appleBundleIdentifier],
    ],
  );

  return {
    socialProviders: {
      ...(googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : {}),
      ...(appleClientId &&
      appleTeamId &&
      appleKeyId &&
      applePrivateKey &&
      appleBundleIdentifier
        ? {
            apple: async () => ({
              clientId: appleClientId,
              clientSecret: await createAppleClientSecret({
                clientId: appleClientId,
                teamId: appleTeamId,
                keyId: appleKeyId,
                privateKey: applePrivateKey,
              }),
              appBundleIdentifier: appleBundleIdentifier,
            }),
          }
        : {}),
    },
    trustedOrigins: appleClientId ? ["https://appleid.apple.com"] : [],
  };
}

function assertCompleteProvider(
  provider: string,
  entries: readonly (readonly [string, string | undefined])[],
) {
  const configured = entries.filter(([, value]) => Boolean(value));
  if (configured.length > 0 && configured.length !== entries.length) {
    const missing = entries
      .filter(([, value]) => !value)
      .map(([name]) => name)
      .join(", ");
    throw new Error(
      `${provider} social auth is partially configured. Missing: ${missing}.`,
    );
  }
}

async function createAppleClientSecret(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}): Promise<string> {
  const privateKey = input.privateKey.replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: input.keyId })
    .setIssuer(input.teamId)
    .setSubject(input.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}
