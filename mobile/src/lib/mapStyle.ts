export const DEFAULT_CITYWALK_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

export function resolveMapStyleUrl(
  configuredStyleUrl = process.env.EXPO_PUBLIC_CITYWALK_MAP_STYLE_URL,
): string {
  const candidate = configuredStyleUrl?.trim() || DEFAULT_CITYWALK_MAP_STYLE_URL;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("CITYWALK map style must be an absolute URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("CITYWALK map style must use HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("CITYWALK map style must not contain URL credentials.");
  }
  return parsed.toString().replace(/\/$/, "");
}
