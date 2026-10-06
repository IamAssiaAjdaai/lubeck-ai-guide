import { FileAudio, FileImage, FileText, FileVideo, Plus } from "lucide-react";

import { requireStaff } from "@/lib/admin/authorization.server";
import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, EmptyContent, StatusBadge } from "@/components/admin/AdminContentUi";
import { MediaRowActions } from "@/components/admin/MediaRowActions";
import Link from "next/link";
import { hasCityCapability } from "@/lib/admin/permissions";
import { isLocale } from "@/lib/i18n";
import { listAuthorizedMediaAssets } from "@/lib/media/service.server";
import type { MediaKind } from "@/lib/media/types";

export default async function MediaLibraryPage({ searchParams }: Readonly<{
  searchParams: Promise<{ error?: string; saved?: string; q?: string; kind?: string; status?: string; locale?: string; city?: string }>;
}>) {
  const query = await searchParams;
  const [authorizedAssets, admin] = await Promise.all([
    listAuthorizedMediaAssets(),
    requireStaff(),
  ]);
  const assets = authorizedAssets.filter((asset) =>
    (!query.q || `${asset.originalFilename} ${asset.assetKey}`.toLowerCase().includes(query.q.toLowerCase())) &&
    (!query.kind || asset.kind === query.kind) &&
    (!query.status || asset.approvalStatus === query.status) &&
    (!query.locale || asset.locale === query.locale) &&
    (!query.city || String(asset.cityId) === query.city));
  const cityScoped = Boolean(query.city);
  const uploadHref = cityScoped ? `/admin/media/new?cityId=${query.city}` : "/admin/media/new";
  const cityIds = [...new Set(authorizedAssets.map(({ cityId }) => cityId))].sort((a, b) => a - b);
  return <section>
    <AdminPageHeader
      actionHref={uploadHref}
      actionLabel="Add media"
      description={cityScoped ? "Photos, audio and video for this city. Add media, review it, then reuse it across places and walks." : "Browse media across all cities. Open a city workspace for the simplest flow."}
      eyebrow={cityScoped ? "City workspace" : "All cities"}
      title="Media"
    />
    <AdminNotice error={query.error} saved={query.saved} />
    {!cityScoped ? (
      <form className="surface-card mt-6 grid gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
        <input aria-label="Search media" className={inputClass} defaultValue={query.q} name="q" placeholder="Search media" />
        <select aria-label="Kind filter" className={inputClass} defaultValue={query.kind} name="kind"><option value="">Photos, audio & video</option><option>image</option><option>audio</option><option>video</option><option>document</option></select>
        <select aria-label="Status filter" className={inputClass} defaultValue={query.status} name="status"><option value="">Any status</option><option>uploading</option><option>pending_review</option><option>approved</option><option>rejected</option><option>archived</option></select>
        <select aria-label="Locale filter" className={inputClass} defaultValue={query.locale} name="locale"><option value="">Any language</option>{[...new Set(authorizedAssets.flatMap(({ locale }) => isLocale(locale) ? [locale] : []))].map((locale) => <option key={locale}>{locale}</option>)}</select>
        <select aria-label="City filter" className={inputClass} defaultValue={query.city} name="city"><option value="">All cities</option>{cityIds.map((id) => <option key={id} value={id}>City #{id}</option>)}</select>
        <button className="button-secondary min-h-11 px-4" type="submit">Filter</button>
      </form>
    ) : null}
    {assets.length === 0 ? (
      <div className="surface-card mt-6 p-7">
        <FileImage aria-hidden="true" className="text-primary" size={24} />
        <h2 className="mt-4 text-lg font-extrabold">No media yet</h2>
        <p className="mt-2 text-sm text-text-secondary">Add the first photo, audio clip or video for this city.</p>
        <Link className="button-primary mt-5 inline-flex min-h-11 items-center gap-2 px-4" href={uploadHref}><Plus size={16} /> Add media</Link>
      </div>
    ) : (
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => <article className="surface-card p-5" key={asset.id}>
          <div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary">{icon(asset.kind)}</span><StatusBadge status={asset.approvalStatus} /></div>
          <h2 className="mt-4 truncate font-extrabold">{asset.originalFilename}</h2>
          <p className="mt-1 text-sm capitalize text-text-secondary">{asset.kind}{asset.locale ? ` · ${asset.locale}` : ""}{asset.usageCount ? ` · used ${asset.usageCount}×` : ""}</p>
          <div className="mt-4">
            <MediaRowActions
              assetId={asset.id}
              canManage={hasCityCapability(admin.staff, asset.cityId, "media:manage")}
              canReview={hasCityCapability(admin.staff, asset.cityId, "publishing:review") || hasCityCapability(admin.staff, asset.cityId, "publishing:publish")}
              hasStoredObject={Boolean(asset.objectKey)}
              sourceType={asset.sourceType}
              status={asset.approvalStatus}
              usageCount={asset.usageCount}
            />
          </div>
        </article>)}
      </div>
    )}
  </section>;
}

function icon(kind: MediaKind) {
  const Icon = kind === "image" ? FileImage : kind === "audio" ? FileAudio : kind === "video" ? FileVideo : FileText;
  return <Icon aria-hidden="true" className="shrink-0 text-primary" size={20} />;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "Pending verification";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const inputClass = "min-h-11 rounded-xl border border-border bg-white px-3 text-sm";

