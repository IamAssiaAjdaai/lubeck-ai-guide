import type { Locale } from "@/lib/i18n";

export const MEDIA_KINDS = ["image", "audio", "video", "document"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_LIFECYCLES = [
  "uploading",
  "pending_review",
  "approved",
  "rejected",
  "archived",
] as const;
export type MediaLifecycle = (typeof MEDIA_LIFECYCLES)[number];

export const MEDIA_ACCESS_LEVELS = ["public", "premium"] as const;
export type MediaAccessLevel = (typeof MEDIA_ACCESS_LEVELS)[number];

export const MEDIA_PURPOSES = [
  "hero",
  "card",
  "gallery",
  "thumbnail",
  "audio",
  "video",
  "document",
] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const EXTERNAL_VIDEO_PROVIDERS = ["youtube", "vimeo"] as const;
export type ExternalVideoProvider = (typeof EXTERNAL_VIDEO_PROVIDERS)[number];
export type MediaEntityType = "city" | "place" | "tour";

export type UploadIntentInput = Readonly<{
  cityId: number;
  kind: MediaKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  locale?: Locale;
  accessLevel?: MediaAccessLevel;
}>;

export type MediaAttachmentInput = Readonly<{
  entityType: MediaEntityType;
  entityId: number;
  mediaAssetId: number;
  purpose: MediaPurpose;
  position?: number;
  locale?: Locale;
}>;

export type MediaMutationAuthorization = Readonly<{
  allowPublicMutation: boolean;
}>;

export type PublicMedia = Readonly<{
  assetKey: string;
  kind: MediaKind;
  purpose: MediaPurpose;
  url: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  locale?: Locale;
  attribution?: Readonly<{
    text: string;
    creator?: string;
  }>;
  externalVideo?: Readonly<{
    provider: ExternalVideoProvider;
    videoId: string;
    canonicalUrl: string;
  }>;
}>;

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export class MediaIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaIntegrityError";
  }
}

export class MediaNotFoundError extends Error {
  constructor(entity = "Media asset") {
    super(`${entity} was not found.`);
    this.name = "MediaNotFoundError";
  }
}

