import { describe, expect, it } from "vitest";

import {
  evaluateCityReadiness,
  type CityReadinessInput,
} from "@/lib/content/cityReadiness";

const complete: CityReadinessInput = {
  citySlug: "test-city",
  cityPublished: true,
  citySourceProvenanceReady: true,
  cityContentCompleteByLocale: { de: true, en: true },
  targetPlaceCount: 2,
  publishedPlaceCount: 2,
  sourceCompletePlaceCount: 2,
  keyImageCompletePlaceCount: 2,
  cityKeyImageReady: true,
  publishedTourCount: 1,
  coherentPublishedTourCount: 1,
  minimumVerifiedAiPlaceCount: 1,
  verifiedAiEligiblePlaceCount: 1,
  requiredContentLocales: ["de", "en"],
  reviewedContentLocales: ["de", "en"],
  contentCompletePlaceCountByLocale: { de: 2, en: 2 },
  requiredAudioLocales: ["de", "en"],
  audioTargetPlaceCount: 1,
  audioReadyPlaceCountByLocale: { de: 1, en: 1 },
  premiumContentStatus: "not_required",
  webQaStatus: "passed",
  nativeQaStatus: "passed",
  travelerQaStatus: "passed",
};

describe("city launch readiness", () => {
  it("can mark a city ready only when every automatic and manual gate passes", () => {
    expect(evaluateCityReadiness(complete)).toMatchObject({
      launchReady: true,
      blockers: [],
      sourceCoveragePercent: 100,
      keyImageryCoveragePercent: 100,
      cityContentCoveragePercentByLocale: { de: 100, en: 100 },
    });
  });

  it("audits city-level traveler content and provenance separately from places", () => {
    const report = evaluateCityReadiness({
      ...complete,
      citySourceProvenanceReady: false,
      cityContentCompleteByLocale: { de: true, en: false },
    });

    expect(report.launchReady).toBe(false);
    expect(report.cityContentCoveragePercentByLocale).toEqual({ de: 100, en: 0 });
    expect(report.blockers).toEqual(expect.arrayContaining([
      "city_source_provenance_incomplete",
      "city_content_incomplete:en",
    ]));
  });

  it("does not confuse enough database rows with launch readiness", () => {
    const report = evaluateCityReadiness({
      ...complete,
      keyImageCompletePlaceCount: 0,
      cityKeyImageReady: false,
      reviewedContentLocales: [],
      audioReadyPlaceCountByLocale: { de: 0, en: 0 },
      webQaStatus: "pending",
      nativeQaStatus: "pending",
      travelerQaStatus: "pending",
    });

    expect(report.launchReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      "approved_key_imagery_incomplete",
      "content_review_pending:de",
      "content_review_pending:en",
      "exact_locale_audio_incomplete:de",
      "exact_locale_audio_incomplete:en",
      "web_qa_pending",
      "native_qa_pending",
      "traveler_qa_pending",
    ]));
  });

  it("tracks source, tour and verified-AI readiness independently", () => {
    const report = evaluateCityReadiness({
      ...complete,
      sourceCompletePlaceCount: 1,
      coherentPublishedTourCount: 0,
      verifiedAiEligiblePlaceCount: 0,
    });

    expect(report.launchReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      "canonical_sources_incomplete",
      "published_walking_tour_missing_or_incoherent",
      "verified_ai_target_not_met",
    ]));
  });

  it("accepts not-required premium content without creating a product", () => {
    const report = evaluateCityReadiness(complete);
    expect(report.premiumContentStatus).toBe("not_required");
    expect(report.blockers).not.toContain("premium_content_pending");
  });

  it("evaluates required audio locales independently", () => {
    const report = evaluateCityReadiness({
      ...complete,
      audioReadyPlaceCountByLocale: { de: 1, en: 0 },
    });

    expect(report.audioCoveragePercentByLocale).toEqual({ de: 100, en: 0 });
    expect(report.blockers).not.toContain("exact_locale_audio_incomplete:de");
    expect(report.blockers).toContain("exact_locale_audio_incomplete:en");
  });
});
