"use server";

import {
  AdminAuthorizationError,
  requireStaff,
} from "@/lib/admin/authorization.server";
import {
  getAuthorizedPlace,
  getAuthorizedTour,
} from "@/lib/admin/content/service.server";
import {
  buildCmsPlaceQaInput,
  buildCmsTourQaInput,
  checkCmsPlaceQa,
  checkCmsTourQa,
} from "@/lib/admin/content/contentQa";
import { hasCityCapability } from "@/lib/admin/permissions";
import { loadMarketingVerifiedPlaceEvidence } from "@/lib/admin/marketing/qaEvidence.server";
import type { MarketingQaEvidence } from "@/lib/admin/marketing/qaEvidence";
import { reviewContentWithGroq } from "@/lib/contentQa/groqReview.server";
import type { AiContentQaReport } from "@/lib/contentQa/aiReview";
import { isLocale } from "@/lib/i18n";

/**
 * Read-only editorial quality review. The client never supplies actor, city,
 * publication status, CMS copy, facts or sources. The server always reloads.
 */
export async function runCmsContentQaAction(
  type: "place" | "tour",
  id: number,
  locale: string,
  verifiedStopId?: number,
): Promise<AiContentQaReport> {
  if ((type !== "place" && type !== "tour") ||
      !Number.isSafeInteger(id) || id < 1 ||
      !isLocale(locale) ||
      (verifiedStopId !== undefined &&
        (!Number.isSafeInteger(verifiedStopId) || verifiedStopId < 1))) {
    throw new Error("Invalid CMS QA target.");
  }

  // getAuthorized* checks admin staff and record city VIEW permissions before
  // returning data. We require a stronger city-scoped capability below.
  const record = type === "place"
    ? await getAuthorizedPlace(id)
    : await getAuthorizedTour(id);
  const context = await requireStaff();
  const canRun = hasCityCapability(context.staff, record.cityId, type + "s:manage" as
    "places:manage" | "tours:manage") ||
    hasCityCapability(context.staff, record.cityId, "publishing:review");
  if (!canRun) throw new AdminAuthorizationError(403, "FORBIDDEN");
  if (record.publicationStatus !== "draft" &&
      record.publicationStatus !== "in_review") {
    throw new Error("QA is only available before approval.");
  }

  if (type === "place") {
    if (verifiedStopId !== undefined) throw new Error("Invalid place QA evidence.");
    const place = await getAuthorizedPlace(id);
    const input = buildCmsPlaceQaInput(place, locale);
    const reviewed = await reviewContentWithGroq(input, context.user.id);
    return {
      ...reviewed,
      findings: [...checkCmsPlaceQa(place), ...reviewed.findings],
      factualCertification: "not_certified",
    };
  }

  const tour = await getAuthorizedTour(id);
  // Only one explicitly selected, *published*, city-matching tour stop can
  // contribute bounded EN verified knowledge; never citywide certification.
  if (verifiedStopId !== undefined &&
      (locale !== "en" ||
        !tour.stops.some((stop) => stop.placeId === verifiedStopId))) {
    throw new Error("The selected verified stop is not available for this walk.");
  }
  const evidence = verifiedStopId === undefined ? undefined :
    await loadMarketingVerifiedPlaceEvidence(tour.cityId, verifiedStopId);
  const input = { ...buildCmsTourQaInput(tour, locale), ...evidence };
  const reviewed = await reviewContentWithGroq(input, context.user.id);
  return {
    ...reviewed,
    findings: [
      ...checkCmsTourQa(tour),
      ...reviewed.findings.map((finding) => withEvidenceLabels(finding, evidence)),
      ...(evidence ? [{
        severity: "info" as const,
        checkId: "facts.scope_limited",
        message: "Only English verified facts for one selected published tour stop were checked. Other stops, route claims and languages need manual verification.",
        origin: "deterministic" as const,
      }] : []),
    ],
    factualCertification: "not_certified",
  };
}

function withEvidenceLabels(
  finding: AiContentQaReport["findings"][number],
  evidence: MarketingQaEvidence | undefined,
): AiContentQaReport["findings"][number] {
  if (!evidence?.verifiedFacts?.length || !finding.evidence?.length) return finding;
  const sources = new Map(evidence.sourceReferences?.map((s) => [s.id, s.label]));
  const facts = new Map(evidence.verifiedFacts.map((f) => [f.id, f.statement.slice(0, 140)]));
  return {
    ...finding,
    evidence: finding.evidence.map((item) => ({
      ...item,
      ...(item.kind === "source" && sources.has(item.id)
        ? { label: sources.get(item.id) }
        : item.kind === "source_fact" && facts.has(item.id)
          ? { label: facts.get(item.id) }
          : {}),
    })),
  };
}
