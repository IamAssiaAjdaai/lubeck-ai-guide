import { extname } from "node:path";

import { isLocale } from "@/lib/i18n";
import {
  MEDIA_KINDS,
  MEDIA_ACCESS_LEVELS,
  MEDIA_LIFECYCLES,
  MEDIA_PURPOSES,
  MediaIntegrityError,
  MediaValidationError,
  type MediaKind,
  type MediaLifecycle,
  type MediaPurpose,
  type UploadIntentInput,
} from "@/lib/media/types";

export const MEDIA_SIZE_LIMITS = {
  image: 15 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 250 * 1024 * 1024,
  document: 25 * 1024 * 1024,
} as const satisfies Readonly<Record<MediaKind, number>>;

export const MEDIA_MIME_POLICY = {
  "image/jpeg": { kind: "image", extensions: [".jpg", ".jpeg"] },
  "image/png": { kind: "image", extensions: [".png"] },
  "image/webp": { kind: "image", extensions: [".webp"] },
  "image/avif": { kind: "image", extensions: [".avif"] },
  "audio/mpeg": { kind: "audio", extensions: [".mp3"] },
  "audio/mp4": { kind: "audio", extensions: [".m4a", ".mp4"] },
  "audio/x-m4a": { kind: "audio", extensions: [".m4a"] },
  "audio/wav": { kind: "audio", extensions: [".wav"] },
  "video/mp4": { kind: "video", extensions: [".mp4"] },
  "video/webm": { kind: "video", extensions: [".webm"] },
  "application/pdf": { kind: "document", extensions: [".pdf"] },
} as const;

export type AllowedMediaMime = keyof typeof MEDIA_MIME_POLICY;

export function sanitizeOriginalFilename(value: string): string {
  const leaf = value.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const safe = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!safe || safe.length > 255) {
    throw new MediaValidationError("Filename is invalid.");
  }
  return safe;
}

export function validateUploadIntent(input: UploadIntentInput): UploadIntentInput {
  if (!Number.isInteger(input.cityId) || input.cityId <= 0) {
    throw new MediaValidationError("City is required.");
  }
  if (!MEDIA_KINDS.includes(input.kind)) {
    throw new MediaValidationError("Media kind is invalid.");
  }
  const originalFilename = sanitizeOriginalFilename(input.originalFilename);
  const policy = MEDIA_MIME_POLICY[input.mimeType as AllowedMediaMime];
  if (!policy || policy.kind !== input.kind) {
    throw new MediaValidationError("File type is not allowed for this media kind.");
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new MediaValidationError("File size is invalid.");
  }
  if (input.sizeBytes > MEDIA_SIZE_LIMITS[input.kind]) {
    throw new MediaValidationError("File exceeds the allowed size limit.");
  }
  if (!policy.extensions.includes(extname(originalFilename).toLowerCase() as never)) {
    throw new MediaValidationError("Filename extension does not match the file type.");
  }
  if (input.kind === "audio" && !isLocale(input.locale)) {
    throw new MediaValidationError("Audio requires a supported CITYWALK locale.");
  }
  if (input.locale !== undefined && !isLocale(input.locale)) {
    throw new MediaValidationError("Media locale is not supported.");
  }
  const accessLevel = input.accessLevel ?? "public";
  if (!MEDIA_ACCESS_LEVELS.includes(accessLevel)) {
    throw new MediaValidationError("Media access level is invalid.");
  }
  if (accessLevel === "premium" && input.kind !== "audio") {
    throw new MediaValidationError("Only uploaded audio can be premium media.");
  }
  return { ...input, accessLevel, originalFilename };
}

export function validateUploadedObject(
  expected: Pick<UploadIntentInput, "kind" | "mimeType" | "sizeBytes">,
  actual: Readonly<{ mimeType?: string; sizeBytes: number; initialBytes: Uint8Array }>,
): void {
  if (actual.sizeBytes !== expected.sizeBytes) {
    throw new MediaIntegrityError("Uploaded file size does not match the upload intent.");
  }
  if (actual.sizeBytes > MEDIA_SIZE_LIMITS[expected.kind]) {
    throw new MediaIntegrityError("Uploaded file exceeds the allowed size limit.");
  }
  if (actual.mimeType && normalizeMime(actual.mimeType) !== normalizeMime(expected.mimeType)) {
    throw new MediaIntegrityError("Uploaded content type does not match the upload intent.");
  }
  if (!matchesMagicBytes(expected.mimeType, actual.initialBytes)) {
    throw new MediaIntegrityError("Uploaded file content does not match its declared type.");
  }
}

export function matchesMagicBytes(mimeType: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (mimeType === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (mimeType === "image/avif") return ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
  if (mimeType === "audio/mpeg") return ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] ?? 0) >= 0xe0);
  if (mimeType === "audio/wav") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
  if (mimeType === "audio/mp4" || mimeType === "audio/x-m4a") return ascii(4, 8) === "ftyp" && ["M4A ", "isom", "mp42", "mp41"].includes(ascii(8, 12));
  if (mimeType === "video/mp4") return ascii(4, 8) === "ftyp";
  if (mimeType === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mimeType === "application/pdf") return ascii(0, 5) === "%PDF-";
  return false;
}

export function validateMediaLifecycle(value: unknown): MediaLifecycle {
  if (typeof value !== "string" || !MEDIA_LIFECYCLES.includes(value as MediaLifecycle)) {
    throw new MediaValidationError("Media lifecycle state is invalid.");
  }
  return value as MediaLifecycle;
}

export function validateMediaPurpose(value: unknown): MediaPurpose {
  if (typeof value !== "string" || !MEDIA_PURPOSES.includes(value as MediaPurpose)) {
    throw new MediaValidationError("Media purpose is invalid.");
  }
  return value as MediaPurpose;
}

export function isPurposeCompatible(kind: MediaKind, purpose: MediaPurpose): boolean {
  const compatible: Readonly<Record<MediaKind, readonly MediaPurpose[]>> = {
    image: ["hero", "card", "gallery", "thumbnail"],
    audio: ["audio"],
    video: ["video", "hero"],
    document: ["document"],
  };
  return compatible[kind].includes(purpose);
}

function normalizeMime(value: string): string {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}
