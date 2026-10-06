import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  SocialContentFields,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { createMarketingContentAction } from "@/app/admin/(protected)/marketing/actions";
import { getMarketingEditorOptions } from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "New social draft | CITYWALK Control Center",
};

export default async function NewMarketingSocialPage({
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
  const campaigns = city
    ? options.campaigns.filter((campaign) => campaign.cityId === city.id)
    : options.campaigns;
  const pages = city
    ? options.pages.filter((page) => page.cityId === city.id)
    : options.pages;
  const backHref = city ? `/admin/marketing?cityId=${city.id}` : "/admin/marketing";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href={backHref}>
        ← {city ? `${city.name} Marketing` : "Marketing"}
      </Link>
      <AdminPageHeader
        description={city ? `Create a human-reviewed social draft for ${city.name}. The city is inherited from the workspace.` : "Create a human-reviewed social draft with a stable content code for attribution."}
        eyebrow="Marketing · Social"
        title="New social draft"
      />
      <AdminNotice error={query.error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingContentAction} submitLabel="Save social draft">
          <SocialContentFields campaigns={campaigns} cities={cities} pages={pages} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create social content.
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
