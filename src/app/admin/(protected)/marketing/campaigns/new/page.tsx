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
  searchParams: Promise<{ error?: string; cityId?: string }>;
}>) {
  const [query, options] = await Promise.all([
    searchParams,
    getMarketingEditorOptions(),
  ]);
  const city = resolveCity(options.cities, query.cityId);
  const cities = city ? [city] : options.cities;
  const backHref = city ? `/admin/marketing?cityId=${city.id}` : "/admin/marketing";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href={backHref}>
        ← {city ? `${city.name} Marketing` : "Marketing"}
      </Link>
      <AdminPageHeader
        description={city ? `Create a campaign for ${city.name}. The city is inherited from the workspace.` : "Create a city-scoped campaign brief. New campaigns always start as drafts."}
        eyebrow="Marketing · Campaigns"
        title="New campaign"
      />
      <AdminNotice error={query.error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingCampaignAction} submitLabel="Save campaign draft">
          <CampaignFields cities={cities} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create a campaign.
        </p>
      )}
    </section>
  );
}

function resolveCity<T extends { id: number }>(cities: readonly T[], rawCityId?: string) {
  if (!rawCityId) return undefined;
  const cityId = Number(rawCityId);
  if (!Number.isInteger(cityId)) return undefined;
  return cities.find((city) => city.id === cityId);
}
