import {
  BadgeCheck,
  Images,
  Languages,
  MapPin,
  Megaphone,
  Route,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addCitySourceAction, approveAndPublishAction, changePublicationAction, deleteDraftAction, updateCityAction } from "@/app/admin/(protected)/content-actions";
import { AdminFormShell, AdminNotice, CityFields, ContentSourcesPanel, LocaleNavigator, PublicationActions } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaAttachmentPanel } from "@/components/admin/MediaAttachmentPanel";
import { getAuthorizedCity, listAuthorizedCities } from "@/lib/admin/content/service.server";
import { requireStaff } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability, hasCityCapability } from "@/lib/admin/permissions";
import { getCityReadinessReport } from "@/lib/content/cityReadiness.server";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedEntityMedia, listAuthorizedMediaAssets } from "@/lib/media/service.server";

export default async function EditCityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; locale?: string }> }) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  const city = await getAuthorizedCity(id);
  const [citySummaries, mediaAssets, mediaAttachments, admin, readiness] = await Promise.all([
    listAuthorizedCities(),
    listAuthorizedMediaAssets(),
    listAuthorizedEntityMedia("city", id),
    requireStaff(),
    loadReadiness(city.slug),
  ]);
  const summary = citySummaries.find((item) => item.id === city.id);
  const editingLocale = isLocale(query.locale) ? query.locale : "en";
  const workspaceLinks = [
    {
      href: `/admin/places?city=${city.slug}`,
      title: "Places",
      description: `${summary?.placeCount ?? 0} places in this city`,
      icon: MapPin,
    },
    {
      href: `/admin/tours?city=${city.slug}`,
      title: "Tours",
      description: `${summary?.tourCount ?? 0} curated tours`,
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
          href: `/admin/marketing?city=${city.slug}`,
          title: "Marketing",
          description: "Campaigns, pages and social content",
          icon: Megaphone,
        }]
      : []),
  ] as const;

  return <section>
    <AdminPageHeader description="One workspace for the city itself, its content operations and launch readiness." eyebrow="City workspace" title={city.localizations[0]?.name ?? city.name} />

    <div className="mt-5 flex flex-wrap items-center gap-3">
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
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </Link>
      ))}
    </div>

    <section className="surface-card mt-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Launch readiness</p>
          <h2 className="mt-2 text-xl font-extrabold">
            {readiness?.launchReady ? "Ready for launch" : readiness ? "Work still required" : "Readiness not configured"}
          </h2>
        </div>
        {readiness ? (
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
            readiness.launchReady
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-800"
          }`}>
            {readiness.launchReady ? "Ready" : `${readiness.blockers.length} blockers`}
          </span>
        ) : null}
      </div>

      {readiness ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReadinessMetric label="Sources" value={`${readiness.sourceCoveragePercent}%`} />
            <ReadinessMetric label="Key imagery" value={`${readiness.keyImageryCoveragePercent}%`} />
            <ReadinessMetric label="Published places" value={`${readiness.publishedPlaceCount}/${readiness.targetPlaceCount}`} />
            <ReadinessMetric label="Verified AI places" value={`${readiness.verifiedAiEligiblePlaceCount}/${readiness.minimumVerifiedAiPlaceCount}`} />
          </div>
          {readiness.blockers.length > 0 ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <BadgeCheck aria-hidden="true" size={18} />
                Needs attention
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-amber-900 sm:grid-cols-2">
                {readiness.blockers.slice(0, 8).map((blocker) => (
                  <li key={blocker}>• {humanizeBlocker(blocker)}</li>
                ))}
              </ul>
              {readiness.blockers.length > 8 ? (
                <p className="mt-2 text-xs text-amber-800">
                  +{readiness.blockers.length - 8} more readiness checks
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">
          This city has no launch-readiness profile yet. Content editing remains available.
        </p>
      )}
    </section>

    <section className="mt-8">
      <p className="eyebrow">City content</p>
      <h2 className="mt-2 text-xl font-extrabold">Identity & traveler copy</h2>
      <AdminNotice error={query.error} saved={query.saved} />
      <LocaleNavigator authoredLocales={city.localizations.map(({ locale }) => locale)} currentLocale={editingLocale} />
      <AdminFormShell action={updateCityAction.bind(null, id)} submitLabel="Save city"><CityFields city={city} editingLocale={editingLocale} /></AdminFormShell>
    </section>

    <ContentSourcesPanel action={addCitySourceAction.bind(null, id)} canManage={hasCityCapability(admin.staff, city.id, "sources:manage")} sourceLinks={city.sourceLinks} subject="city" />
    <MediaAttachmentPanel assets={mediaAssets.filter((asset) => asset.cityId === city.id)} attachments={mediaAttachments} entityId={id} entityType="city" readOnly={!hasActiveStaffCapability(admin.staff, "media:manage")} />
    <PublicationActions action={changePublicationAction.bind(null, "city", id)} approveAndPublishAction={approveAndPublishAction.bind(null, "city", id)} cityId={city.id} deleteAction={deleteDraftAction.bind(null, "city", id)} entity="city" id={id} staff={admin.staff} status={city.publicationStatus} />
  </section>;
}

function ReadinessMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

async function loadReadiness(citySlug: string) {
  try {
    return await getCityReadinessReport(citySlug);
  } catch {
    return null;
  }
}

function humanizeBlocker(blocker: string): string {
  return blocker
    .replaceAll(":", " · ")
    .replaceAll("_", " ");
}
