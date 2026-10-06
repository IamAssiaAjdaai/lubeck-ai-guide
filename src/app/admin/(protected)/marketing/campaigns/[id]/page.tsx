import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  CampaignFields,
  MarketingFormShell,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { updateMarketingCampaignAction } from "@/app/admin/(protected)/marketing/actions";
import {
  getMarketingCampaign,
  getMarketingEditorOptions,
  MarketingNotFoundError,
} from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "Campaign | CITYWALK Control Center",
};

export default async function MarketingCampaignPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}>) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let campaign;
  try {
    campaign = await getMarketingCampaign(id);
  } catch (error) {
    if (error instanceof MarketingNotFoundError) notFound();
    throw error;
  }
  const options = await getMarketingEditorOptions();
  const city = options.cities.find(({ id: cityId }) => cityId === campaign.cityId);
  const canEdit = options.canManage && campaign.status === "draft";
  const marketingHref = city
    ? `/admin/marketing?city=${encodeURIComponent(city.slug)}`
    : "/admin/marketing";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href={marketingHref}>
        ← {city ? `${city.name} Marketing` : "Marketing"}
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          description="Edit the campaign brief while it is still a draft. Activation and lifecycle controls stay separate."
          eyebrow="Marketing · Campaign"
          title={campaign.name}
        />
        <StatusBadge status={campaign.status} />
      </div>
      <AdminNotice error={query.error} saved={query.saved} />
      {canEdit ? (
        <MarketingFormShell
          action={updateMarketingCampaignAction.bind(null, campaign.id)}
          submitLabel="Save campaign changes"
        >
          <CampaignFields campaign={campaign} cities={city ? [city] : options.cities} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm leading-6 text-text-secondary">
          This campaign is read-only here. Only draft campaigns can be edited in the draft editor.
        </p>
      )}
    </section>
  );
}
