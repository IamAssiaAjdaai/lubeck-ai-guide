/**
 * Landing NEXT only. These URLs are unpublished by default.
 * The operator enables them AFTER verifying real iOS/Android listings.
 * No fallback to guessed IDs, app:// schemes, generic store pages or web checkout.
 */
export type StorePlatform = "ios" | "android";

export type StoreLinkConfig = {
  approved: boolean;
  iosUrl?: string;
  androidUrl?: string;
};

export function validateNativeListingUrl(
  raw: string | undefined,
  platform: StorePlatform,
): string | null {
  if (!raw || raw.trim() !== raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port) {
    return null;
  }

  if (platform === "ios") {
    if (url.hostname !== "apps.apple.com") return null;
    if (!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?app\/(?:[^/]+\/)?id\d+\/?$/i.test(url.pathname)) {
      return null;
    }
    return url.toString();
  }

  if (url.hostname !== "play.google.com" || url.pathname !== "/store/apps/details") {
    return null;
  }
  const packageName = url.searchParams.get("id");
  if (!packageName || !/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(packageName)) {
    return null;
  }
  if (url.searchParams.getAll("id").length !== 1) return null;
  return url.toString();
}

export function getApprovedStoreLinks(
  config: StoreLinkConfig = {
    approved: process.env.CITYWALK_STORE_LINKS_APPROVED === "true",
    iosUrl: process.env.CITYWALK_IOS_APP_STORE_URL,
    androidUrl: process.env.CITYWALK_ANDROID_PLAY_STORE_URL,
  },
): { ios: string | null; android: string | null } {
  if (!config.approved) return { ios: null, android: null };
  return {
    ios: validateNativeListingUrl(config.iosUrl, "ios"),
    android: validateNativeListingUrl(config.androidUrl, "android"),
  };
}
