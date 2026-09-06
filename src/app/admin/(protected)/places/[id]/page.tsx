import { notFound } from "next/navigation";

import { changePublicationAction, deleteDraftAction, updatePlaceAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, LocaleNavigator, PlaceFields, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaAttachmentPanel } from "@/components/admin/MediaAttachmentPanel";
import { getAuthorizedPlace, listAuthorizedCities, listAuthorizedTags } from "@/lib/admin/content/service.server";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedEntityMedia, listAuthorizedMediaAssets } from "@/lib/media/service.server";
import { requireStaff } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability } from "@/lib/admin/permissions";

export default async function EditPlacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const [place, cities, tags, mediaAssets, mediaAttachments, admin] = await Promise.all([getAuthorizedPlace(id), listAuthorizedCities(), listAuthorizedTags(), listAuthorizedMediaAssets(), listAuthorizedEntityMedia("place", id), requireStaff()]);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  return <section>
    <AdminPageHeader description="Operational status and publication status are independent. Saving another locale never materializes fallback text." eyebrow="Places" title={place.localizations[0]?.name ?? place.slug} />
    <div className="mt-4"><StatusBadge status={place.publicationStatus} /></div>
    <AdminNotice error={query.error} saved={query.saved} />
    <LocaleNavigator authoredLocales={place.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
    <AdminFormShell action={updatePlaceAction.bind(null, id)} submitLabel="Save place"><PlaceFields cities={cities} editingLocale={editingLocale} place={place} tags={tags} /></AdminFormShell>
    <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === place.cityId)} attachments={mediaAttachments} entityId={id} entityType="place" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
    <PublicationActions action={changePublicationAction.bind(null, "place", id)} deleteAction={deleteDraftAction.bind(null, "place", id)} entity="place" id={id} status={place.publicationStatus} />
  </section>;
}
