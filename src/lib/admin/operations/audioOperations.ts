import { createHash } from "node:crypto";

import type { Locale } from "@/lib/i18n";
import type { MediaLifecycle } from "@/lib/media/types";

export type AudioOperationsStatus =
  | "missing"
  | "draft"
  | "needs_review"
  | "ready"
  | "live"
  | "stale";

export type AudioOperationsAsset = Readonly<{
  id: number;
  locale: Locale;
  approvalStatus: MediaLifecycle;
  position: 0 | 1;
  previewUrl?: string;
  sourceTextHash?: string;
}>;

export function normalizeNarrationSource(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[\t ]+/g, " "))
    .join("\n")
    .trim();
}

export function hashNarrationSource(text: string): string {
  return createHash("sha256")
    .update(normalizeNarrationSource(text), "utf8")
    .digest("hex");
}

export function deriveAudioOperationsStatus(input: Readonly<{
  locale: Locale;
  story?: string | null;
  assets: readonly AudioOperationsAsset[];
}>): Readonly<{
  status: AudioOperationsStatus;
  live?: AudioOperationsAsset;
  candidate?: AudioOperationsAsset;
}> {
  const exactLocaleAssets = input.assets.filter(
    (asset) => asset.locale === input.locale,
  );
  const live = exactLocaleAssets.find(
    (asset) =>
      asset.position === 0 && asset.approvalStatus === "approved",
  );
  const candidate = exactLocaleAssets.find((asset) => asset.position === 1);
  if (candidate) {
    if (candidate.approvalStatus === "approved") {
      return { status: "ready", live, candidate };
    }
    if (candidate.approvalStatus === "pending_review") {
      return { status: "needs_review", live, candidate };
    }
    if (candidate.approvalStatus !== "archived") {
      return { status: "draft", live, candidate };
    }
  }
  if (!live) return { status: "missing" };
  const currentHash = input.story
    ? hashNarrationSource(input.story)
    : undefined;
  if (
    live.sourceTextHash &&
    (!currentHash || live.sourceTextHash !== currentHash)
  ) {
    return { status: "stale", live };
  }
  return { status: "live", live };
}

export function exactLocaleStory(
  localizations: readonly Readonly<{ locale: string; story: string | null }>[],
  locale: Locale,
): string | undefined {
  const story = localizations.find((item) => item.locale === locale)?.story;
  const normalized = story ? normalizeNarrationSource(story) : "";
  return normalized || undefined;
}
