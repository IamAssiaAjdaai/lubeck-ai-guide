import { notFound } from "next/navigation";
import { CheckCircle2, FileText, ImageIcon, Info, MapPin } from "lucide-react";

import Link from "next/link";
import { addPlaceSourceAction, approveAndPublishAction, changePublicationAction, deleteDraftAction, updatePlaceAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, LocaleNavigator, PlaceFields, PlaceSourcesPanel, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaAttachmentPanel } from "@/components/admin/MediaAttachmentPanel";
import { getAuthorizedPlace, listAuthorizedCities, listAuthorizedTags } from "@/lib/admin/content/service.server";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedEntityMedia, listAuthorizedMediaAssets } from "@/lib/media/service.server";
import { requireStaff } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability, hasCityCapability } from "@/lib/admin/permissions";

export default async function EditPlacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const [place, cities, tags, mediaAssets, mediaAttachments, admin] = await Promise.all([getAuthorizedPlace(id), listAuthorizedCities(), listAuthorizedTags(), listAuthorizedMediaAssets(), listAuthorizedEntityMedia("place", id), requireStaff()]);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  const city = cities.find((candidate) => candidate.id === place.cityId);
  const cityName = city?.localizations[0]?.name ?? city?.name ?? "City";
  return <section>
    <Link className="text-sm font-bold text-primary" href={`/admin/places?city=${city?.slug ?? ""}`}>← Back to {cityName} places</Link>
    <AdminPageHeader description="Build the traveler experience step by step. Save your content, add media and references, then review it before publishing." eyebrow={`${cityName} · Place`} title={place.localizations[0]?.name ?? place.slug} />

    <div className="mt-5 flex flex-wrap items-center gap-3">
      <StatusBadge status={place.publicationStatus} />
      <Link className="button-secondary inline-flex min-h-11 px-4" href={`/admin/preview/places/${id}`}>Preview as traveler</Link>
      {place.publishedRevision ? <span className="text-xs text-text-secondary">Last published {place.publishedRevision.publishedAt.toLocaleDateString("en")}</span> : null}
    </div>

    <div className="surface-card mt-6 p-5">
      <p className="eyebrow">Place workflow</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <a className="rounded-xl border border-border p-3" href="#content"><Info className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">1 · BASICS & STORY</p></a>
        <a className="rounded-xl border border-border p-3" href="#visit"><MapPin className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">2 · VISIT INFO</p></a>
        <a className="rounded-xl border border-border p-3" href="#media"><ImageIcon className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">3 · MEDIA</p></a>
        <a className="rounded-xl border border-border p-3" href="#references"><FileText className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">4 · REFERENCES</p></a>
        <a className="rounded-xl border border-border p-3" href="#publish"><CheckCircle2 className="text-primary" size={18} /><p className="mt-2 text-xs font-bold text-text-secondary">5 · REVIEW & PUBLISH</p></a>
      </div>
    </div>

    <AdminNotice error={query.error} saved={query.saved} />
    <section id="content">
      <div className="mt-8"><p className="eyebrow">1 · Basics & story</p><h2 className="mt-1 text-xl font-extrabold">What should travelers know?</h2><p className="mt-2 text-sm text-text-secondary">Write the place name, story and essential details in the selected language.</p></div>
      <LocaleNavigator authoredLocales={place.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
      <div id="visit">
        <AdminFormShell action={updatePlaceAction.bind(null, id)} submitLabel="Save & continue"><PlaceFields cities={cities} editingLocale={editingLocale} place={place} tags={tags} /></AdminFormShell>
      </div>
    </section>

    <section id="media" className="mt-10 scroll-mt-6">
      <div className="mb-4"><p className="eyebrow">3 · Media</p><h2 className="mt-1 text-xl font-extrabold">Show the place</h2><p className="mt-2 text-sm text-text-secondary">Attach approved photos, audio or video from {cityName}.</p></div>
      <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === place.cityId)} attachments={mediaAttachments} entityId={id} entityType="place" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
    </section>

    <section id="references" className="mt-10 scroll-mt-6">
      <div className="mb-4"><p className="eyebrow">4 · References</p><h2 className="mt-1 text-xl font-extrabold">Verify the information</h2><p className="mt-2 text-sm text-text-secondary">Add reliable sources so reviewers can check important facts.</p></div>
      <PlaceSourcesPanel action={addPlaceSourceAction.bind(null, id)} canManage={hasCityCapability(admin.staff, place.cityId, "sources:manage")} sourceLinks={place.sourceLinks} />
    </section>

    <section id="publish" className="surface-card mt-10 scroll-mt-6 p-5 sm:p-7">
      <p className="eyebrow">5 · Review & publish</p>
      <h2 className="mt-1 text-xl font-extrabold">Ready for travelers?</h2>
      <p className="mt-2 text-sm text-text-secondary">Preview the place, check the story, visit information, media and references, then move it through review and publishing.</p>
      <PublicationActions action={changePublicationAction.bind(null, "place", id)} approveAndPublishAction={approveAndPublishAction.bind(null, "place", id)} cityId={place.cityId} deleteAction={deleteDraftAction.bind(null, "place", id)} entity="place" id={id} staff={admin.staff} status={place.publicationStatus} />
    </section>

    {place.workflowEvents.length ? <details className="surface-card mt-6 p-5"><summary className="cursor-pointer font-bold">Activity history</summary><ol className="mt-3 space-y-2 text-sm text-text-secondary">{place.workflowEvents.map((event) => <li key={event.id}>{event.action}: {event.fromStatus} → {event.toStatus} · {event.createdAt.toLocaleString("en")}</li>)}</ol></details> : null}
  </section>;}
