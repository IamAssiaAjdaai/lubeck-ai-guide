export const NATIVE_AUTH_SCHEME = "citywalk";
export const NATIVE_AUTH_STORAGE_PREFIX = "citywalk-auth";

export type NativeAuthConfiguration = Readonly<{
  baseURL: string;
  scheme: typeof NATIVE_AUTH_SCHEME;
  storagePrefix: typeof NATIVE_AUTH_STORAGE_PREFIX;
  callbackURL: string;
}>;

export function getNativeAuthConfiguration(apiOrigin: string): NativeAuthConfiguration {
  const origin = new URL(apiOrigin).origin;
  return {
    baseURL: origin,
    scheme: NATIVE_AUTH_SCHEME,
    storagePrefix: NATIVE_AUTH_STORAGE_PREFIX,
    callbackURL: `${NATIVE_AUTH_SCHEME}://account`,
  };
}


export type NativeSocialAuthAvailability = Readonly<{
  google: boolean;
  apple: boolean;
}>;

export function getNativeSocialAuthAvailability(
  environment: Readonly<{
    google?: string;
    apple?: string;
  }> = {
    google: process.env.EXPO_PUBLIC_CITYWALK_GOOGLE_AUTH,
    apple: process.env.EXPO_PUBLIC_CITYWALK_APPLE_AUTH,
  },
): NativeSocialAuthAvailability {
  return {
    google: environment.google === "1",
    apple: environment.apple === "1",
  };
}
