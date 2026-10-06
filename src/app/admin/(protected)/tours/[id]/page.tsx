import { CheckCircle2, ImageIcon, ListOrdered, MapPinned, Route } from "lucide-react";
import Link from "next/link";
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
  const city = cities.find((candidate) => candidate.id === tour.cityId);
  const cityName = city?.localizations[0]?.name ?? city?.name ?? "City";
  const cityPlaces = places.filter((place) => place.cityId === tour.cityId);

  return <section>
    <Link className="text-sm font-bold text-primary" href={`/admin/tours?city=${city?.slug ?? ""}`}>← Back to {cityName} walks</Link>
    <AdminPageHeader description="Build the walk step by step: explain the experience, choose the stops, arrange the route, add media, then review it before publishing." eyebrow={`${cityName} · Walk`} title={tour.localizations[0]?.title ?? tour.slug} />

    <div className="mt-5 flex flex-wrap items-center gap-3">
      <StatusBadge status={tour.publicationStatus} />
      <span className="text-sm text-text-secondary">{tour.stops.length} stops{tour.estimatedDurationMinutes ? ` · ${tour.estimatedDurationMinutes} min` : ""}</span>
    </div>

    <div className="surface-card mt-6 p-5">
      <p className="eyebrow">Walk workflow</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <a className="rounded-xl border border-border p-3" href="#basics"><Route className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">1 · BASICS</p></a>
        <a className="rounded-xl border border-border p-3" href="#stops"><MapPinned className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">2 · CHOOSE STOPS</p></a>
        <a className="rounded-xl border border-border p-3" href="#stops"><ListOrdered className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">3 · ARRANGE ROUTE</p></a>
        <a className="rounded-xl border border-border p-3" href="#media"><ImageIcon className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">4 · MEDIA</p></a>
        <a className="rounded-xl border border-border p-3" href="#publish"><CheckCircle2 className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">5 · REVIEW & PUBLISH</p></a>
      </div>
    </div>

    <AdminNotice error={query.error} saved={query.saved} />
    <section id="basics" className="mt-8 scroll-mt-6">
      <p className="eyebrow">1 · Basics</p>
      <h2 className="mt-1 text-xl font-extrabold">What kind of walk is this?</h2>
      <p className="mt-2 text-sm text-text-secondary">Give travelers a clear title, description and expected duration.</p>
      <LocaleNavigator authoredLocales={tour.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
      <div id="stops">
        <AdminFormShell action={updateTourAction.bind(null, id)} submitLabel="Save & continue"><TourFields cities={[...(city ? [city] : cities)]} editingLocale={editingLocale} initialCityId={tour.cityId} places={cityPlaces} tour={tour} /></AdminFormShell>
      </div>
    </section>

    <section id="media" className="mt-10 scroll-mt-6">
      <div className="mb-4"><p className="eyebrow">4 · Media</p><h2 className="mt-1 text-xl font-extrabold">Show the walk</h2><p className="mt-2 text-sm text-text-secondary">Attach approved photos, audio or video from {cityName}.</p></div>
      <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === tour.cityId)} attachments={mediaAttachments} entityId={id} entityType="tour" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
    </section>

    <section id="publish" className="surface-card mt-10 scroll-mt-6 p-5 sm:p-7">
      <p className="eyebrow">5 · Review & publish</p>
      <h2 className="mt-1 text-xl font-extrabold">Ready for travelers?</h2>
      <p className="mt-2 text-sm text-text-secondary">Check the title, description, stop order and media. When the route feels right, move it through review and publishing.</p>
      <PublicationActions action={changePublicationAction.bind(null, "tour", id)} approveAndPublishAction={approveAndPublishAction.bind(null, "tour", id)} cityId={tour.cityId} deleteAction={deleteDraftAction.bind(null, "tour", id)} entity="tour" id={id} staff={admin.staff} status={tour.publicationStatus} />
    </section>
  </section>;
}
