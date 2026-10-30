const PREVIEW_ORIGIN = "https://api-preview.getcitywalk.com";
const AUTH0_DOMAIN = "citywalk-preview.eu.auth0.com";
const ANDROID_PACKAGE = "com.citywalk.app.preview";
const CALLBACK_SCHEME = "citywalkpreviewauth0";

type TesterConfigInput = {
  environment?: string;
  apiOrigin?: string;
  domain?: string;
  clientId?: string;
  packageName?: string;
  platform?: string;
};

let accessToken: string | null = null;
let obtainedAt = 0;

export function resolveTesterAuth0Config(input: TesterConfigInput) {
  if (
    input.platform !== "android" ||
    input.environment !== "preview" ||
    input.packageName !== ANDROID_PACKAGE ||
    input.apiOrigin !== PREVIEW_ORIGIN ||
    input.domain !== AUTH0_DOMAIN ||
    !input.clientId?.trim()
  ) {
    throw new Error("Android Preview tester configuration is not approved.");
  }

  return {
    domain: AUTH0_DOMAIN,
    clientId: input.clientId.trim(),
    audience: PREVIEW_ORIGIN,
    scope: "openid profile email citywalk:preview:read",
    customScheme: CALLBACK_SCHEME,
  };
}

export async function loginPreviewTester(): Promise<void> {
  const [{ default: Constants }, { Platform }, { default: Auth0 }] =
    await Promise.all([
      import("expo-constants"),
      import("react-native"),
      import("react-native-auth0"),
    ]);

  const config = resolveTesterAuth0Config({
    platform: Platform.OS,
    environment: process.env.EXPO_PUBLIC_CITYWALK_ENV,
    apiOrigin: process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
    domain: process.env.EXPO_PUBLIC_CITYWALK_TESTER_AUTH0_DOMAIN,
    clientId: process.env.EXPO_PUBLIC_CITYWALK_TESTER_AUTH0_CLIENT_ID,
    packageName: Constants.expoConfig?.android?.package,
  });

  clearPreviewTesterToken();

  const auth0 = new Auth0({
    domain: config.domain,
    clientId: config.clientId,
  });

  const credentials = await auth0.webAuth.authorize(
    {
      audience: config.audience,
      scope: config.scope,
    },
    {
      customScheme: config.customScheme,
    },
  );

  const token = credentials.accessToken;

  if (
    typeof token !== "string" ||
    token.length > 8192 ||
    token.split(".").length !== 3
  ) {
    throw new Error("Invalid Preview tester access token format.");
  }

  accessToken = token;
  obtainedAt = Date.now();
}

export function getPreviewTesterToken(): string | null {
  if (!accessToken || Date.now() - obtainedAt >= 180_000) {
    clearPreviewTesterToken();
    return null;
  }

  return accessToken;
}

export function clearPreviewTesterToken(): void {
  accessToken = null;
  obtainedAt = 0;
}
