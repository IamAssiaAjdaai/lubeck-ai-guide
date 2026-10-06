import Link from "next/link";
import { notFound } from "next/navigation";

import { createTourAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, TourFields } from "@/components/admin/AdminContentForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { listAuthorizedCities, listAuthorizedPlaces } from "@/lib/admin/content/service.server";

export default async function NewTourPage({ searchParams }: { searchParams: Promise<{ error?: string; city?: string }> }) {
  const [query, cities, places] = await Promise.all([searchParams, listAuthorizedCities(), listAuthorizedPlaces()]);
  const selectedCity = query.city ? cities.find((city) => city.slug === query.city) : undefined;
  if (query.city && !selectedCity) notFound();
  const cityName = selectedCity ? (selectedCity.localizations[0]?.name ?? selectedCity.name) : undefined;
  const availablePlaces = selectedCity ? places.filter((place) => place.cityId === selectedCity.id) : places;

  return <section>
    {selectedCity ? <Link className="text-sm font-bold text-primary" href={`/admin/tours?city=${selectedCity.slug}`}>← Back to {cityName} walks</Link> : null}
    <AdminPageHeader
      description={selectedCity ? `Build a walk in ${cityName} by choosing trusted places and putting them in the right order.` : "Build a city walk by choosing places and arranging the stops."}
      eyebrow={selectedCity ? `${cityName} · Walks` : "Walks"}
      title="Create walk"
    />
    <AdminNotice error={query.error} />
    <AdminFormShell action={createTourAction} submitLabel="Save & continue">
      <TourFields cities={selectedCity ? [selectedCity] : cities} initialCityId={selectedCity?.id} places={availablePlaces} />
    </AdminFormShell>
  </section>;
}
