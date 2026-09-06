import { notFound } from "next/navigation";

import { changePublicationAction, deleteDraftAction, updateCityAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, CityFields, LocaleNavigator, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { getAuthorizedCity } from "@/lib/admin/content/service.server";
import { isLocale } from "@/lib/i18n";

export default async function EditCityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const city = await getAuthorizedCity(id);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  return <section>
    <AdminPageHeader description="Edit city metadata and one authored locale at a time. Publication is a separate authorized action." eyebrow="Cities" title={city.localizations[0]?.name ?? city.name} />
    <div className="mt-4"><StatusBadge status={city.publicationStatus} /></div>
    <AdminNotice error={query.error} saved={query.saved} />
    <LocaleNavigator authoredLocales={city.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
    <AdminFormShell action={updateCityAction.bind(null, id)} submitLabel="Save city"><CityFields city={city} editingLocale={editingLocale} /></AdminFormShell>
    <PublicationActions action={changePublicationAction.bind(null, "city", id)} deleteAction={deleteDraftAction.bind(null, "city", id)} entity="city" id={id} status={city.publicationStatus} />
  </section>;
}
