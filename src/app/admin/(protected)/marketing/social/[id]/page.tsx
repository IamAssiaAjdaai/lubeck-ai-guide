import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import { MarketingMediaPanel } from "@/components/admin/MarketingMediaPanel";
import { MarketingQaPanel } from "@/components/admin/MarketingQaPanel";
import { runMarketingQaAction } from "@/app/admin/(protected)/marketing/qa-actions";
import { listMarketingVerifiedPlaces } from "@/lib/admin/marketing/qaEvidence.server";
import {
  MarketingFormShell,
  SocialContentFields,
} from "@/components/admin/MarketingForms";
import {
  MarketingTrackingPanel,
  MarketingWorkflowPanel,
} from "@/components/admin/MarketingWorkflowPanel";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import {
  changeMarketingSocialWorkflowAction,
  updateMarketingContentAction,
} from "@/app/admin/(protected)/marketing/actions";
import {
  getMarketingContentItem,
  getMarketingContentMedia,
  getMarketingEditorOptions,
  MarketingNotFoundError,
} from "@/lib/admin/marketing/service.server";
import {
  MARKETING_SOCIAL_TRANSITIONS,
  isMarketingSocialState,
} from "@/lib/admin/marketing/workflow";
import {
  getMarketingSocialTrackingPreview,
  getMarketingWorkflowAccess,
} from "@/lib/admin/marketing/workflow.server";

export const metadata = {
  title: "Social draft | CITYWALK Control Center",
};

export default async function MarketingSocialEditor({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; cityId?: string }>;
}>) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let item;
  try {
    item = await getMarketingContentItem(id);
  } catch (error) {
    if (error instanceof MarketingNotFoundError) notFound();
    throw error;
  }

  const [options, workflowAccess, trackingPath, media] = await Promise.all([
    getMarketingEditorOptions(),
    getMarketingWorkflowAccess(item.cityId),
    getMarketingSocialTrackingPreview(item.id),
    getMarketingContentMedia(item.id),
  ]);
  const cityContext = resolveRecordCityContext(query.cityId, item.cityId);
  const cities = cityContext
    ? options.cities.filter((city) => city.id === cityContext)
    : options.cities;
  const campaigns = cityContext
    ? options.campaigns.filter((campaign) => campaign.cityId === cityContext)
    : options.campaigns;
  const pages = cityContext
    ? options.pages.filter((page) => page.cityId === cityContext)
    : options.pages;
  const canEdit =
    options.canManage && (item.status === "idea" || item.status === "draft");
  const currentStatus = isMarketingSocialState(item.status) ? item.status : "draft";
  const workflowActions = MARKETING_SOCIAL_TRANSITIONS.filter(
    (transition) =>
      transition.from === currentStatus &&
      canUseWorkflowCapability(transition.capability, workflowAccess),
  ).map(({ to, label }) => ({ to, label }));
  const canRunQa = (workflowAccess.canManage || workflowAccess.canReview) &&
    (currentStatus === "idea" || currentStatus === "draft" || currentStatus === "in_review");
  const verifiedPlaces = canRunQa
    ? await listMarketingVerifiedPlaces(item.cityId)
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
          description="Prepare the creative draft, review it separately, then mark it ready and record the real published URL after posting."
          eyebrow="Marketing · Social"
          title={item.contentCode}
        />
        <StatusBadge status={item.status} />
      </div>
      <AdminNotice error={query.error} saved={query.saved} />
      {canEdit ? (
        <MarketingFormShell
          action={updateMarketingContentAction.bind(null, item.id)}
          submitLabel="Save social changes"
        >
          <SocialContentFields campaigns={campaigns} cities={cities} item={item} pages={pages} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm leading-6 text-text-secondary">
          The creative copy is read-only outside idea/draft status. Use the workflow below to review, prepare or archive it.
        </p>
      )}

      <MarketingMediaPanel
        attached={media.attached}
        available={media.available}
        canEdit={canEdit}
        cityId={item.cityId}
        contentId={item.id}
      />

      <MarketingTrackingPanel trackingPath={trackingPath} />

      {canRunQa ? (
        <MarketingQaPanel
          action={runMarketingQaAction.bind(null, "social", item.id)}
          verifiedPlaces={verifiedPlaces}
        />
      ) : null}

      <MarketingWorkflowPanel
        action={changeMarketingSocialWorkflowAction.bind(null, item.id)}
        actions={workflowActions}
        cityId={cityContext}
        currentStatus={currentStatus}
        description="Editors submit drafts. Reviewers approve them. Publishing permission moves approved content to ready; after you post it on the real platform, record that public URL to mark it published."
        publishedUrl={item.publishedUrl}
        title="Social content workflow"
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
