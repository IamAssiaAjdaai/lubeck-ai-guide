import { Images, Languages, MapPin, Megaphone, Route } from "lucide-react";
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
      title: "Tours",
      description: "Curated routes for this city",
      icon: Route,
    },
    {
      href: `/admin/media?city=${city.id}`,
      title: "Media",
      description: "Images, audio, video and rights",
      icon: Images,
    },
    {
      href: `/admin/operations/translations?cityId=${city.id}`,
      title: "Languages",
      description: `${city.localizations.length} authored city locales`,
      icon: Languages,
    },
    ...(hasCityCapability(admin.staff, city.id, "marketing:view")
      ? [{
          href: `/admin/marketing?cityId=${city.id}`,
          title: "Marketing",
          description: "Campaigns, pages and social content",
          icon: Megaphone,
        }]
      : []),
  ];

  return (
    <section>
      <AdminPageHeader
        description="One workspace for the city and everything associated with it."
        eyebrow="City workspace"
        title={cityName}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={city.publicationStatus} />
        <span className="text-sm text-text-secondary">{city.slug} · {city.countryCode ?? "—"}</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      <section className="mt-8">
        <p className="eyebrow">City content</p>
        <h2 className="mt-2 text-xl font-extrabold">Identity & traveler copy</h2>
        <AdminNotice error={query.error} saved={query.saved} />
        <LocaleNavigator authoredLocales={city.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
        <AdminFormShell action={updateCityAction.bind(null, id)} submitLabel="Save city">
          <CityFields city={city} editingLocale={editingLocale} />
        </AdminFormShell>
      </section>

      <ContentSourcesPanel action={addCitySourceAction.bind(null, id)} canManage={hasCityCapability(admin.staff, city.id, "sources:manage")} sourceLinks={city.sourceLinks} subject="city" />
      <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === city.id)} attachments={mediaAttachments} entityId={id} entityType="city" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
      <PublicationActions action={changePublicationAction.bind(null, "city", id)} approveAndPublishAction={approveAndPublishAction.bind(null, "city", id)} cityId={city.id} deleteAction={deleteDraftAction.bind(null, "city", id)} entity="city" id={id} staff={admin.staff} status={city.publicationStatus} />
    </section>
  );
}
