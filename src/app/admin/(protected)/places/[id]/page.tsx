import Link from "next/link";
import { notFound } from "next/navigation";

import { addPlaceSourceAction, approveAndPublishAction, changePublicationAction, deleteDraftAction, updatePlaceAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, LocaleNavigator, PlaceFields, PlaceSourcesPanel, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaAttachmentPanel } from "@/components/admin/MediaAttachmentPanel";
import { requireStaff } from "@/lib/admin/authorization.server";
import { getAuthorizedPlace, listAuthorizedCities, listAuthorizedTags } from "@/lib/admin/content/service.server";
import { hasActiveStaffCapability, hasCityCapability } from "@/lib/admin/permissions";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedEntityMedia, listAuthorizedMediaAssets } from "@/lib/media/service.server";

export default async function EditPlacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  const [place, cities, tags, mediaAssets, mediaAttachments, admin] = await Promise.all([
    getAuthorizedPlace(id),
    listAuthorizedCities(),
    listAuthorizedTags(),
    listAuthorizedMediaAssets(),
    listAuthorizedEntityMedia("place", id),
    requireStaff(),
  ]);
  const city = cities.find(({ id: cityId }) => cityId === place.cityId);
  const cityName = city?.localizations[0]?.name ?? city?.name ?? place.city?.slug ?? "City";
  const editingLocale = isLocale(query.locale) ? query.locale : "en";

  return <section>
    <AdminPageHeader
      description="Keep the traveler-facing place clear, verified and reusable across the app, city pages and future marketing content."
      eyebrow="Place workspace"
      title={place.localizations[0]?.name ?? place.slug}
    />

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <StatusBadge status={place.publicationStatus} />
      <span className="text-sm text-text-secondary">
        {cityName} · {place.category} · {place.durationMinutes} min
      </span>
    </div>

    <div className="mt-5 flex flex-wrap gap-3">
      <Link className="button-secondary inline-flex min-h-11 px-4" href={`/admin/cities/${place.cityId}`}>
        Back to {cityName}
      </Link>
      <Link className="button-secondary inline-flex min-h-11 px-4" href={`/admin/preview/places/${id}`}>
        Preview traveler view
      </Link>
    </div>

    {place.publishedRevision ? (
      <p className="mt-3 text-xs text-text-secondary">
        Last published: {place.publishedRevision.publishedAt.toLocaleString()}
      </p>
    ) : null}

    <AdminNotice error={query.error} saved={query.saved} />

    <section className="mt-8">
      <div>
        <p className="eyebrow">Edit</p>
        <h2 className="mt-2 text-xl font-extrabold">Place content</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          Start with the basics, then write the traveler content. Media, sources and publishing stay separate below so they are easier to review.
        </p>
      </div>
      <LocaleNavigator authoredLocales={place.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
      <AdminFormShell action={updatePlaceAction.bind(null, id)} submitLabel="Save draft">
        <PlaceFields cities={cities} editingLocale={editingLocale} place={place} tags={tags} />
      </AdminFormShell>
    </section>

    <section className="mt-8">
      <p className="eyebrow">Assets</p>
      <h2 className="mt-2 text-xl font-extrabold">Media</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Attach approved images, audio or video without mixing media review into the writing form.
      </p>
      <MediaAttachmentPanel
        assets={mediaAssets.filter((asset) => asset.cityId === place.cityId)}
        attachments={mediaAttachments}
        entityId={id}
        entityType="place"
        readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")}
      />
    </section>

    <section className="mt-8">
      <p className="eyebrow">Trust</p>
      <h2 className="mt-2 text-xl font-extrabold">Sources</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Keep reliable references with the place. Publishing still validates required sources server-side.
      </p>
      <PlaceSourcesPanel
        action={addPlaceSourceAction.bind(null, id)}
        canManage={hasCityCapability(admin.staff, place.cityId, "sources:manage")}
        sourceLinks={place.sourceLinks}
      />
    </section>

    <section className="mt-8">
      <p className="eyebrow">Editorial workflow</p>
      <h2 className="mt-2 text-xl font-extrabold">Review & publishing</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Saving content and publishing it remain separate actions.
      </p>
      <PublicationActions
        action={changePublicationAction.bind(null, "place", id)}
        approveAndPublishAction={approveAndPublishAction.bind(null, "place", id)}
        cityId={place.cityId}
        deleteAction={deleteDraftAction.bind(null, "place", id)}
        entity="place"
        id={id}
        staff={admin.staff}
        status={place.publicationStatus}
      />
    </section>

    {place.workflowEvents.length ? (
      <section className="surface-card mt-8 p-5">
        <h2 className="font-extrabold">Workflow history</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {place.workflowEvents.map((event) => (
            <li key={event.id}>
              {event.action}: {event.fromStatus} → {event.toStatus} · {event.createdAt.toISOString()}
            </li>
          ))}
        </ol>
      </section>
    ) : null}
  </section>;
}
