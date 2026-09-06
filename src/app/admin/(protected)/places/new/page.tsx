import { createPlaceAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, PlaceFields } from "@/components/admin/AdminContentForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { listAuthorizedCities, listAuthorizedTags } from "@/lib/admin/content/service.server";

export default async function NewPlacePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, cities, tags] = await Promise.all([searchParams, listAuthorizedCities(), listAuthorizedTags()]);
  return <section>
    <AdminPageHeader description="Create a transactional place draft with metadata, tags, and explicitly authored content." eyebrow="Places" title="New place" />
    <AdminNotice error={error} />
    <AdminFormShell action={createPlaceAction} submitLabel="Save place draft"><PlaceFields cities={cities} tags={tags} /></AdminFormShell>
  </section>;
}
