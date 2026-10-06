import Link from "next/link";
import { notFound } from "next/navigation";

import { createPlaceAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, PlaceFields } from "@/components/admin/AdminContentForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { listAuthorizedCities, listAuthorizedTags } from "@/lib/admin/content/service.server";

export default async function NewPlacePage({ searchParams }: { searchParams: Promise<{ error?: string; city?: string }> }) {
  const [query, cities, tags] = await Promise.all([searchParams, listAuthorizedCities(), listAuthorizedTags()]);
  const selectedCity = query.city ? cities.find((city) => city.slug === query.city) : undefined;
  if (query.city && !selectedCity) notFound();
  const cityName = selectedCity ? (selectedCity.localizations[0]?.name ?? selectedCity.name) : undefined;

  return <section>
    {selectedCity ? <Link className="text-sm font-bold text-primary" href={`/admin/places?city=${selectedCity.slug}`}>← Back to {cityName} places</Link> : null}
    <AdminPageHeader
      description={selectedCity ? `Add a place travelers can discover in ${cityName}. Start with the essentials; you can add media and publishing details next.` : "Add a place travelers can discover. Start with the essentials and save it as a draft."}
      eyebrow={selectedCity ? `${cityName} · Places` : "Places"}
      title="Add place"
    />
    <AdminNotice error={query.error} />
    <AdminFormShell action={createPlaceAction} submitLabel="Save & continue">
      <PlaceFields cities={selectedCity ? [selectedCity] : cities} initialCityId={selectedCity?.id} tags={tags} />
    </AdminFormShell>
  </section>;
}
