import type { PublicMedia } from "./contracts";

export function selectPrimaryImage(
  media: readonly PublicMedia[],
  fallback?: string,
): string | undefined {
  return media.find(({ kind, purpose }) => kind === "image" && purpose === "card")?.url ??
    media.find(({ kind, purpose }) => kind === "image" && purpose === "hero")?.url ??
    media.find(({ kind, purpose }) => kind === "image" && purpose === "gallery")?.url ??
    fallback;
}
