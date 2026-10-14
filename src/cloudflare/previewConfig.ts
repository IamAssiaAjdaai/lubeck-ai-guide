/**
 * Cloudflare Worker bindings are selected at build/deploy time. Never allow
 * a preview command to silently inherit the production Hyperdrive.
 */
export const CITYWALK_PRODUCTION_HYPERDRIVE_ID =
  "390958927c2946be8571ec5282b35ce6";

export function requireIsolatedPreviewHyperdriveId(value: string | undefined): string {
  const id = value?.trim();
  if (!id || !/^[a-f0-9]{32}$/i.test(id)) {
    throw new Error(
      "CITYWALK_PREVIEW_HYPERDRIVE_ID is required (32-character Cloudflare Hyperdrive ID).",
    );
  }
  if (id.toLowerCase() === CITYWALK_PRODUCTION_HYPERDRIVE_ID) {
    throw new Error("Refusing production Hyperdrive in the CITYWALK Preview Worker.");
  }
  return id;
}
