import { notFound } from "next/navigation";

import { changePublicationAction, deleteDraftAction, updatePlaceAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, LocaleNavigator, PlaceFields, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { getAuthorizedPlace, listAuthorizedCities, listAuthorizedTags } from "@/lib/admin/content/service.server";
import { isLocale } from "@/lib/i18n";

export default async function EditPlacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const [place, cities, tags] = await Promise.all([getAuthorizedPlace(id), listAuthorizedCities(), listAuthorizedTags()]);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  return <section>
    <AdminPageHeader description="Operational status and publication status are independent. Saving another locale never materializes fallback text." eyebrow="Places" title={place.localizations[0]?.name ?? place.slug} />
    <div className="mt-4"><StatusBadge status={place.publicationStatus} /></div>
    <AdminNotice error={query.error} saved={query.saved} />
    <LocaleNavigator authoredLocales={place.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
    <AdminFormShell action={updatePlaceAction.bind(null, id)} submitLabel="Save place"><PlaceFields cities={cities} editingLocale={editingLocale} place={place} tags={tags} /></AdminFormShell>
    <PublicationActions action={changePublicationAction.bind(null, "place", id)} deleteAction={deleteDraftAction.bind(null, "place", id)} entity="place" id={id} status={place.publicationStatus} />
  </section>;
}
