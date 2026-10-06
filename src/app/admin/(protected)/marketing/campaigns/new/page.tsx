import Link from "next/link";
import { notFound } from "next/navigation";

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
  searchParams: Promise<{ error?: string; city?: string }>;
}>) {
  const [query, options] = await Promise.all([
    searchParams,
    getMarketingEditorOptions(),
  ]);
  const city = query.city
    ? options.cities.find(({ slug }) => slug === query.city)
    : undefined;
  if (query.city && !city) notFound();
  const marketingHref = city
    ? `/admin/marketing?city=${encodeURIComponent(city.slug)}`
    : "/admin/marketing";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href={marketingHref}>
        ← {city ? `${city.name} Marketing` : "Marketing"}
      </Link>
      <AdminPageHeader
        description={city
          ? `Create a campaign brief for ${city.name}. The city is inherited from the workspace.`
          : "Create a city-scoped campaign brief. New campaigns always start as drafts."}
        eyebrow="Marketing · Campaigns"
        title="New campaign"
      />
      <AdminNotice error={query.error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingCampaignAction} submitLabel="Save campaign draft">
          {city ? <input defaultValue={city.slug} name="citySlug" type="hidden" /> : null}
          <CampaignFields
            cities={city ? [city] : options.cities}
            initialCityId={city?.id}
          />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create a campaign.
        </p>
      )}
    </section>
  );
}
