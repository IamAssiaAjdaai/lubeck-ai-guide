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
import { reviewContentWithGroq } from "@/lib/contentQa/groqReview.server";
import type { AiContentQaReport } from "@/lib/contentQa/aiReview";

export async function runMarketingQaAction(
  type: "page" | "social",
  id: number,
): Promise<AiContentQaReport> {
  if (!Number.isSafeInteger(id) || id < 1 || (type !== "page" && type !== "social")) {
    throw new Error("Invalid QA target.");
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
    return reviewContentWithGroq(
      buildMarketingPageQaInput(row),
      context.user.id,
    );
  }

  if (!("status" in row) ||
    !["idea", "draft", "in_review"].includes(row.status)) {
    throw new Error("QA is only available before approval.");
  }

  return reviewContentWithGroq(
    buildMarketingSocialQaInput(row),
    context.user.id,
  );
}
