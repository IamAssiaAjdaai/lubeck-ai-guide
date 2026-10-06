import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  MarketingPageFields,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { createMarketingPageAction } from "@/app/admin/(protected)/marketing/actions";
import { getMarketingEditorOptions } from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "New marketing page | CITYWALK Control Center",
};

export default async function NewMarketingPage({
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
  const backHref = city ? `/admin/marketing?cityId=${city.id}` : "/admin/marketing";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href={backHref}>
        ← {city ? `${city.name} Marketing` : "Marketing"}
      </Link>
      <AdminPageHeader
        description={city ? `Create a landing page or blog draft for ${city.name}. The city is inherited from the workspace.` : "Create a landing page or blog draft and reserve its future public path."}
        eyebrow="Marketing · Pages"
        title="New page"
      />
      <AdminNotice error={query.error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingPageAction} submitLabel="Save page draft">
          <MarketingPageFields campaigns={campaigns} cities={cities} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create a page.
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
