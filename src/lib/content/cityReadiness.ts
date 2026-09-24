import type { Locale } from "@/lib/i18n";

export type QualityGateStatus = "pending" | "passed" | "failed";
export type PremiumReadinessStatus = "not_required" | "pending" | "ready";

export type CityReadinessInput = Readonly<{
  citySlug: string;
  cityPublished: boolean;
  citySourceProvenanceReady: boolean;
  cityContentCompleteByLocale: Readonly<Partial<Record<Locale, boolean>>>;
  targetPlaceCount: number;
  publishedPlaceCount: number;
  sourceCompletePlaceCount: number;
  keyImageCompletePlaceCount: number;
  rightsClearedKeyImagePlaceCount: number;
  cityKeyImageReady: boolean;
  cityKeyImageRightsReady: boolean;
  publishedTourCount: number;
  coherentPublishedTourCount: number;
  minimumVerifiedAiPlaceCount: number;
  verifiedAiEligiblePlaceCount: number;
  requiredContentLocales: readonly Locale[];
  reviewedContentLocales: readonly Locale[];
  contentCompletePlaceCountByLocale: Readonly<Partial<Record<Locale, number>>>;
  requiredAudioLocales: readonly Locale[];
  audioTargetPlaceCount: number;
  audioReadyPlaceCountByLocale: Readonly<Partial<Record<Locale, number>>>;
  premiumContentStatus: PremiumReadinessStatus;
  webQaStatus: QualityGateStatus;
  nativeQaStatus: QualityGateStatus;
  travelerQaStatus: QualityGateStatus;
}>;

export type CityReadinessReport = CityReadinessInput & Readonly<{
  sourceCoveragePercent: number;
  keyImageryCoveragePercent: number;
  rightsClearedKeyImageryCoveragePercent: number;
  contentCoveragePercentByLocale: Readonly<Partial<Record<Locale, number>>>;
  cityContentCoveragePercentByLocale: Readonly<Partial<Record<Locale, number>>>;
  audioCoveragePercentByLocale: Readonly<Partial<Record<Locale, number>>>;
  launchReady: boolean;
  blockers: readonly string[];
}>;

export function evaluateCityReadiness(
  input: CityReadinessInput,
): CityReadinessReport {
  const blockers: string[] = [];
  if (!input.cityPublished) blockers.push("city_not_published");
  if (!input.citySourceProvenanceReady) {
    blockers.push("city_source_provenance_incomplete");
  }
  if (input.publishedPlaceCount < input.targetPlaceCount) {
    blockers.push("published_place_target_not_met");
  }
  if (input.sourceCompletePlaceCount < input.publishedPlaceCount) {
    blockers.push("canonical_sources_incomplete");
  }
  if (
    !input.cityKeyImageReady ||
    input.keyImageCompletePlaceCount < input.publishedPlaceCount
  ) {
    blockers.push("approved_key_imagery_incomplete");
  }
  if (
    !input.cityKeyImageRightsReady ||
    input.rightsClearedKeyImagePlaceCount < input.publishedPlaceCount
  ) {
    blockers.push("rights_cleared_key_imagery_incomplete");
  }
  if (input.publishedTourCount === 0 || input.coherentPublishedTourCount === 0) {
    blockers.push("published_walking_tour_missing_or_incoherent");
  }
  if (input.verifiedAiEligiblePlaceCount < input.minimumVerifiedAiPlaceCount) {
    blockers.push("verified_ai_target_not_met");
  }
  for (const locale of input.requiredContentLocales) {
    if (!input.cityContentCompleteByLocale[locale]) {
      blockers.push(`city_content_incomplete:${locale}`);
    }
    if ((input.contentCompletePlaceCountByLocale[locale] ?? 0) < input.publishedPlaceCount) {
      blockers.push(`content_incomplete:${locale}`);
    }
    if (!input.reviewedContentLocales.includes(locale)) {
      blockers.push(`content_review_pending:${locale}`);
    }
  }
  for (const locale of input.requiredAudioLocales) {
    if ((input.audioReadyPlaceCountByLocale[locale] ?? 0) < input.audioTargetPlaceCount) {
      blockers.push(`exact_locale_audio_incomplete:${locale}`);
    }
  }
  if (input.premiumContentStatus === "pending") {
    blockers.push("premium_content_pending");
  }
  if (input.webQaStatus !== "passed") blockers.push(`web_qa_${input.webQaStatus}`);
  if (input.nativeQaStatus !== "passed") blockers.push(`native_qa_${input.nativeQaStatus}`);
  if (input.travelerQaStatus !== "passed") {
    blockers.push(`traveler_qa_${input.travelerQaStatus}`);
  }

  return {
    ...input,
    sourceCoveragePercent: percentage(
      input.sourceCompletePlaceCount,
      input.publishedPlaceCount,
    ),
    keyImageryCoveragePercent: percentage(
      input.keyImageCompletePlaceCount + (input.cityKeyImageReady ? 1 : 0),
      input.publishedPlaceCount + 1,
    ),
    rightsClearedKeyImageryCoveragePercent: percentage(
      input.rightsClearedKeyImagePlaceCount +
        (input.cityKeyImageRightsReady ? 1 : 0),
      input.publishedPlaceCount + 1,
    ),
    contentCoveragePercentByLocale: Object.fromEntries(
      input.requiredContentLocales.map((locale) => [
        locale,
        percentage(
          input.contentCompletePlaceCountByLocale[locale] ?? 0,
          input.publishedPlaceCount,
        ),
      ]),
    ),
    cityContentCoveragePercentByLocale: Object.fromEntries(
      input.requiredContentLocales.map((locale) => [
        locale,
        input.cityContentCompleteByLocale[locale] ? 100 : 0,
      ]),
    ),
    audioCoveragePercentByLocale: Object.fromEntries(
      input.requiredAudioLocales.map((locale) => [
        locale,
        percentage(
          input.audioReadyPlaceCountByLocale[locale] ?? 0,
          input.audioTargetPlaceCount,
        ),
      ]),
    ),
    launchReady: blockers.length === 0,
    blockers,
  };
}

function percentage(complete: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((Math.min(complete, total) / total) * 100);
}
