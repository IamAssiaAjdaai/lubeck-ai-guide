import { AdminFormShell, AdminNotice, CityFields } from "@/components/admin/AdminContentForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { createCityAction } from "@/app/admin/(protected)/content-actions";

export default async function NewCityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section>
    <AdminPageHeader description="Create a city draft and its first explicitly authored localization." eyebrow="Cities" title="New city" />
    <AdminNotice error={error} />
    <AdminFormShell action={createCityAction} submitLabel="Save city draft"><CityFields /></AdminFormShell>
  </section>;
}
