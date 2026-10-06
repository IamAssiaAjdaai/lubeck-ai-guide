import { CheckCircle2, Images, Languages, MapPin, Megaphone, Route, Settings2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addCitySourceAction, approveAndPublishAction, changePublicationAction, deleteDraftAction, updateCityAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, CityFields, ContentSourcesPanel, LocaleNavigator, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaAttachmentPanel } from "@/components/admin/MediaAttachmentPanel";
import { getAuthorizedCity } from "@/lib/admin/content/service.server";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedEntityMedia, listAuthorizedMediaAssets } from "@/lib/media/service.server";
import { requireStaff } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability, hasCityCapability } from "@/lib/admin/permissions";

export default async function EditCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; locale?: string }>;
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  const [city, mediaAssets, mediaAttachments, admin] = await Promise.all([
    getAuthorizedCity(id),
    listAuthorizedMediaAssets(),
    listAuthorizedEntityMedia("city", id),
    requireStaff(),
  ]);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  const cityName = city.localizations[0]?.name ?? city.name;
  const workspaceLinks = [
    {
      href: `/admin/places?city=${city.slug}`,
      title: "Places",
      description: "Places and traveler-facing content",
      icon: MapPin,
    },
    {
      href: `/admin/tours?city=${city.slug}`,
      title: "Walks",
      description: "Create and manage city walks",
      icon: Route,
    },
    {
      href: `/admin/media?city=${city.id}`,
      title: "Media",
      description: "Photos, audio and video",
      icon: Images,
    },
    {
      href: `/admin/operations/translations?cityId=${city.id}`,
      title: "Languages",
      description: `${city.localizations.length} language versions`,
      icon: Languages,
    },
    ...(hasCityCapability(admin.staff, city.id, "marketing:view")
      ? [{
          href: `/admin/marketing?cityId=${city.id}`,
          title: "Marketing",
          description: "Promote this city",
          icon: Megaphone,
        }]
      : []),
  ];

  return (
    <section>
      <AdminPageHeader
        description="Manage this city from one place. Start with content, prepare it, then review and publish."
        eyebrow="City workspace"
        title={cityName}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={city.publicationStatus} />
        <span className="text-sm text-text-secondary">{city.slug} · {city.countryCode ?? "—"}</span>
      </div>

      <div className="surface-card mt-6 p-5">
        <p className="eyebrow">Simple workflow</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div><p className="text-xs font-bold text-primary">1 · BUILD</p><p className="mt-1 font-bold">Add places & walks</p><p className="mt-1 text-sm text-text-secondary">Create what travelers can discover.</p></div>
          <div><p className="text-xs font-bold text-primary">2 · PREPARE</p><p className="mt-1 font-bold">Media, languages & marketing</p><p className="mt-1 text-sm text-text-secondary">Make the city complete and ready to launch.</p></div>
          <div><p className="text-xs font-bold text-primary">3 · PUBLISH</p><p className="mt-1 font-bold">Review & go live</p><p className="mt-1 text-sm text-text-secondary">Check the city before travelers see it.</p></div>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-extrabold">What do you want to work on?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {workspaceLinks.map(({ description, href, icon: Icon, title }) => (
          <Link
            className="surface-card p-5 transition hover:border-primary/30 hover:shadow-md"
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" className="text-primary" size={21} />
            <h2 className="mt-4 font-extrabold">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-text-secondary">{description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 border-t border-border pt-8">
        <div className="flex items-center gap-3">
          <Settings2 aria-hidden="true" className="text-text-secondary" size={20} />
          <div><p className="eyebrow">City settings</p><h2 className="mt-1 text-xl font-extrabold">City name & traveler introduction</h2></div>
        </div>
        <AdminNotice error={query.error} saved={query.saved} />
        <LocaleNavigator authoredLocales={city.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
        <AdminFormShell action={updateCityAction.bind(null, id)} submitLabel="Save city">
          <CityFields city={city} editingLocale={editingLocale} />
        </AdminFormShell>
      </section>

      <div className="mt-10 border-t border-border pt-8">
        <div className="mb-4 flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="text-primary" size={20} /><div><p className="eyebrow">Review & publish</p><h2 className="mt-1 text-xl font-extrabold">Ready for travelers?</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><p className="text-xs font-bold text-text-secondary">PLACES</p><p className="mt-1 font-extrabold">{city.placeCount ?? 0}</p><p className="mt-1 text-xs text-text-secondary">{(city.placeCount ?? 0) > 0 ? "Content added" : "Add at least one place"}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs font-bold text-text-secondary">WALKS</p><p className="mt-1 font-extrabold">{city.tourCount ?? 0}</p><p className="mt-1 text-xs text-text-secondary">{(city.tourCount ?? 0) > 0 ? "Walks created" : "Create a walk when ready"}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs font-bold text-text-secondary">LANGUAGES</p><p className="mt-1 font-extrabold">{city.localizations.length}</p><p className="mt-1 text-xs text-text-secondary">{city.localizations.length > 0 ? "Traveler copy added" : "Add traveler copy"}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs font-bold text-text-secondary">MEDIA</p><p className="mt-1 font-extrabold">{mediaAssets.filter((asset) => asset.cityId === city.id).length}</p><p className="mt-1 text-xs text-text-secondary">Photos, audio & video</p></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-text-secondary">When the city content looks right, use the publishing action below. CITYWALK keeps review and publish permissions enforced in the background.</p>
      </div>
      <ContentSourcesPanel action={addCitySourceAction.bind(null, id)} canManage={hasCityCapability(admin.staff, city.id, "sources:manage")} sourceLinks={city.sourceLinks} subject="city" />
      <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === city.id)} attachments={mediaAttachments} entityId={id} entityType="city" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
      <PublicationActions action={changePublicationAction.bind(null, "city", id)} approveAndPublishAction={approveAndPublishAction.bind(null, "city", id)} cityId={city.id} deleteAction={deleteDraftAction.bind(null, "city", id)} entity="city" id={id} staff={admin.staff} status={city.publicationStatus} />
    </section>
  );
}
