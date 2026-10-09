import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  MarketingPageFields,
} from "@/components/admin/MarketingForms";
import { MarketingWorkflowPanel } from "@/components/admin/MarketingWorkflowPanel";
import { MarketingQaPanel } from "@/components/admin/MarketingQaPanel";
import { runMarketingQaAction } from "@/app/admin/(protected)/marketing/qa-actions";
import { listMarketingVerifiedPlaces } from "@/lib/admin/marketing/qaEvidence.server";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import {
  changeMarketingPageWorkflowAction,
  updateMarketingPageAction,
} from "@/app/admin/(protected)/marketing/actions";
import {
  getMarketingEditorOptions,
  getMarketingPage,
  MarketingNotFoundError,
} from "@/lib/admin/marketing/service.server";
import {
  MARKETING_PAGE_TRANSITIONS,
  isMarketingPageState,
} from "@/lib/admin/marketing/workflow";
import { getMarketingWorkflowAccess } from "@/lib/admin/marketing/workflow.server";

export const metadata = {
  title: "Marketing page | CITYWALK Control Center",
};

export default async function MarketingPageEditor({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; cityId?: string }>;
}>) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let page;
  try {
    page = await getMarketingPage(id);
  } catch (error) {
    if (error instanceof MarketingNotFoundError) notFound();
    throw error;
  }

  const [options, workflowAccess] = await Promise.all([
    getMarketingEditorOptions(),
    getMarketingWorkflowAccess(page.cityId),
  ]);
  const cityContext = resolveRecordCityContext(query.cityId, page.cityId);
  const cities = cityContext
    ? options.cities.filter((city) => city.id === cityContext)
    : options.cities;
  const campaigns = cityContext
    ? options.campaigns.filter((campaign) => campaign.cityId === cityContext)
    : options.campaigns;
  const canEdit = options.canManage && page.publicationStatus === "draft";
  const currentStatus = isMarketingPageState(page.publicationStatus)
    ? page.publicationStatus
    : "draft";
  const workflowActions = MARKETING_PAGE_TRANSITIONS.filter(
    (transition) =>
      transition.from === currentStatus &&
      canUseWorkflowCapability(transition.capability, workflowAccess),
  ).map(({ to, label }) => ({ to, label }));
  const canRunQa = (workflowAccess.canManage || workflowAccess.canReview) &&
    (currentStatus === "draft" || currentStatus === "in_review");
  const verifiedPlaces = canRunQa
    ? await listMarketingVerifiedPlaces(page.cityId)
    : [];
  const backHref = cityContext
    ? `/admin/marketing?cityId=${cityContext}`
    : "/admin/marketing";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href={backHref}>
        ← Marketing
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          description="Edit the draft, submit it for editorial review, then approve and publish with separate permissions."
          eyebrow={`Marketing · ${page.kind}`}
          title={page.title}
        />
        <StatusBadge status={page.publicationStatus} />
      </div>
      <AdminNotice error={query.error} saved={query.saved} />
      {canEdit ? (
        <MarketingFormShell
          action={updateMarketingPageAction.bind(null, page.id)}
          submitLabel="Save page changes"
        >
          <MarketingPageFields campaigns={campaigns} cities={cities} page={page} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm leading-6 text-text-secondary">
          The page copy is read-only outside draft status. Use the workflow below to review, publish or return it to draft.
        </p>
      )}

      {canRunQa ? (
        <MarketingQaPanel
          action={runMarketingQaAction.bind(null, "page", page.id)}
          verifiedPlaces={verifiedPlaces}
        />
      ) : null}

      <MarketingWorkflowPanel
        action={changeMarketingPageWorkflowAction.bind(null, page.id)}
        actions={workflowActions}
        cityId={cityContext}
        currentStatus={currentStatus}
        description="Editors can submit drafts. Reviewers can approve or return them. Publishing permission is required before this page can become published. Public rendering is added separately."
        title="Marketing page workflow"
      />
    </section>
  );
}

function resolveRecordCityContext(rawCityId: string | undefined, recordCityId: number) {
  if (!rawCityId) return undefined;
  const cityId = Number(rawCityId);
  return Number.isInteger(cityId) && cityId === recordCityId ? cityId : undefined;
}

function canUseWorkflowCapability(
  capability: "marketing:manage" | "publishing:review" | "publishing:publish",
  access: Readonly<{
    canManage: boolean;
    canReview: boolean;
    canPublish: boolean;
  }>,
) {
  if (capability === "marketing:manage") return access.canManage;
  if (capability === "publishing:review") return access.canReview;
  return access.canPublish;
}
