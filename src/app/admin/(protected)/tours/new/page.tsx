import { createTourAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, TourFields } from "@/components/admin/AdminContentForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { listAuthorizedCities, listAuthorizedPlaces } from "@/lib/admin/content/service.server";

export default async function NewTourPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, cities, places] = await Promise.all([searchParams, listAuthorizedCities(), listAuthorizedPlaces()]);
  return <section>
    <AdminPageHeader description="Create a curated tour draft and arrange trusted place records in a deterministic order." eyebrow="Tours" title="New tour" />
    <AdminNotice error={error} />
    <AdminFormShell action={createTourAction} submitLabel="Save tour draft"><TourFields cities={cities} places={places} /></AdminFormShell>
  </section>;
}
