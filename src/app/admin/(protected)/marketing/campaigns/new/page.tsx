import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  CampaignFields,
  MarketingFormShell,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { createMarketingCampaignAction } from "@/app/admin/(protected)/marketing/actions";
import { getMarketingEditorOptions } from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "New campaign | CITYWALK Control Center",
};

export default async function NewMarketingCampaignPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ error }, options] = await Promise.all([
    searchParams,
    getMarketingEditorOptions(),
  ]);

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href="/admin/marketing">
        ← Marketing
      </Link>
      <AdminPageHeader
        description="Create a city-scoped campaign brief. New campaigns always start as drafts."
        eyebrow="Marketing · Campaigns"
        title="New campaign"
      />
      <AdminNotice error={error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingCampaignAction} submitLabel="Save campaign draft">
          <CampaignFields cities={options.cities} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create a campaign.
        </p>
      )}
    </section>
  );
}
