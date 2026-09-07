import { notFound } from "next/navigation";

import { approveAndPublishAction, changePublicationAction, deleteDraftAction, updateTourAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, LocaleNavigator, PublicationActions, TourFields } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaAttachmentPanel } from "@/components/admin/MediaAttachmentPanel";
import { getAuthorizedTour, listAuthorizedCities, listAuthorizedPlaces } from "@/lib/admin/content/service.server";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedEntityMedia, listAuthorizedMediaAssets } from "@/lib/media/service.server";
import { requireStaff } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability } from "@/lib/admin/permissions";

export default async function EditTourPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const [tour, cities, places, mediaAssets, mediaAttachments, admin] = await Promise.all([getAuthorizedTour(id), listAuthorizedCities(), listAuthorizedPlaces(), listAuthorizedMediaAssets(), listAuthorizedEntityMedia("tour", id), requireStaff()]);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  return <section>
    <AdminPageHeader description="Edit authored tour content and reorder stops. The deterministic personalized Tour Builder is unchanged." eyebrow="Tours" title={tour.localizations[0]?.title ?? tour.slug} />
    <div className="mt-4"><StatusBadge status={tour.publicationStatus} /></div>
    <AdminNotice error={query.error} saved={query.saved} />
    <LocaleNavigator authoredLocales={tour.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
    <AdminFormShell action={updateTourAction.bind(null, id)} submitLabel="Save tour"><TourFields cities={cities} editingLocale={editingLocale} places={places} tour={tour} /></AdminFormShell>
    <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === tour.cityId)} attachments={mediaAttachments} entityId={id} entityType="tour" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
    <PublicationActions action={changePublicationAction.bind(null, "tour", id)} approveAndPublishAction={approveAndPublishAction.bind(null, "tour", id)} cityId={tour.cityId} deleteAction={deleteDraftAction.bind(null, "tour", id)} entity="tour" id={id} staff={admin.staff} status={tour.publicationStatus} />
  </section>;
}
