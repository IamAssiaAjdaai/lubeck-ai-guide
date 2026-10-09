"use server";

import {
  AdminAuthorizationError,
  requireCityCapability,
} from "@/lib/admin/authorization.server";
import {
  buildMarketingPageQaInput,
  buildMarketingSocialQaInput,
} from "@/lib/admin/marketing/contentQa";
import {
  getMarketingContentItem,
  getMarketingPage,
} from "@/lib/admin/marketing/service.server";
import { hasCityCapability } from "@/lib/admin/permissions";
import { loadMarketingVerifiedPlaceEvidence } from "@/lib/admin/marketing/qaEvidence.server";
import { reviewContentWithGroq } from "@/lib/contentQa/groqReview.server";
import type { AiContentQaReport } from "@/lib/contentQa/aiReview";

export async function runMarketingQaAction(
  type: "page" | "social",
  id: number,
  verifiedPlaceId?: number,
): Promise<AiContentQaReport> {
  if (!Number.isSafeInteger(id) || id < 1 || (type !== "page" && type !== "social")) {
    throw new Error("Invalid QA target.");
  }

  if (verifiedPlaceId !== undefined && (!Number.isSafeInteger(verifiedPlaceId) || verifiedPlaceId < 1)) {
    throw new Error("Invalid verified place context.");
  }

  // All record retrieval requires marketing:view + matching city scope.
  // Never trust actor, city, status, fields, or fact references from the browser.
  const row =
    type === "page"
      ? await getMarketingPage(id)
      : await getMarketingContentItem(id);

  // Re-authorize server-side on every click, including reruns.
  const context = await requireCityCapability(row.cityId, "marketing:view");
  const canRun =
    hasCityCapability(context.staff, row.cityId, "marketing:manage") ||
    hasCityCapability(context.staff, row.cityId, "publishing:review");

  if (!canRun) throw new AdminAuthorizationError(403, "FORBIDDEN");

  if (type === "page") {
    if (!("publicationStatus" in row) ||
      !["draft", "in_review"].includes(row.publicationStatus)) {
      throw new Error("QA is only available before approval.");
    }
    const evidence = verifiedPlaceId === undefined
      ? undefined
      : await loadMarketingVerifiedPlaceEvidence(row.cityId, verifiedPlaceId);
    const report = await reviewContentWithGroq(
      { ...buildMarketingPageQaInput(row), ...evidence },
      context.user.id,
    );
    return addEvidenceScopeAdvisory(report, evidence);
  }

  if (!("status" in row) ||
    !["idea", "draft", "in_review"].includes(row.status)) {
    throw new Error("QA is only available before approval.");
  }

  const evidence = verifiedPlaceId === undefined
    ? undefined
    : await loadMarketingVerifiedPlaceEvidence(row.cityId, verifiedPlaceId);
  const report = await reviewContentWithGroq(
    { ...buildMarketingSocialQaInput(row), ...evidence },
    context.user.id,
  );
  return addEvidenceScopeAdvisory(report, evidence);
}


/** A selected place scopes evidence; it never certifies unrelated city/route copy. */
function addEvidenceScopeAdvisory(
  report: AiContentQaReport,
  evidence: Awaited<ReturnType<typeof loadMarketingVerifiedPlaceEvidence>> | undefined,
): AiContentQaReport {
  if (!evidence) return report;
  const sourceLabels = new Map(evidence.sourceReferences?.map((source) => [source.id, source.label]));
  const factLabels = new Map(evidence.verifiedFacts?.map((fact) => [
    fact.id,
    fact.statement.slice(0, 140),
  ]));
  return {
    ...report,
    findings: [
      ...report.findings.map((finding) => ({
        ...finding,
        evidence: finding.evidence?.map((item) => ({
          ...item,
          ...(item.kind === "source" && sourceLabels.has(item.id)
            ? { label: sourceLabels.get(item.id) }
            : item.kind === "source_fact" && factLabels.has(item.id)
              ? { label: factLabels.get(item.id) }
              : {}),
        })),
      })),
      {
        severity: "info" as const,
        checkId: "facts.scope_limited",
        message: "Only English verified facts for the selected place were available. Other places, citywide claims and languages require manual verification.",
        origin: "deterministic" as const,
      },
    ],
    factualCertification: "not_certified",
  };
}
