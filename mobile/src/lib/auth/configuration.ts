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
