import { FileAudio, FileImage, FileText, FileVideo } from "lucide-react";

import { requireStaff } from "@/lib/admin/authorization.server";
import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader, Cell, ContentTable, EmptyContent, HeaderCell, StatusBadge, TableHead } from "@/components/admin/AdminContentUi";
import { MediaRowActions } from "@/components/admin/MediaRowActions";
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
  const cityIds = [...new Set(authorizedAssets.map(({ cityId }) => cityId))].sort((a, b) => a - b);
  return <section>
    <AdminPageHeader actionHref="/admin/media/new" actionLabel="Upload media" description="Upload, verify, review, and reuse immutable media assets without committing binaries to Git." eyebrow="Content" title="Media library" />
    <AdminNotice error={query.error} saved={query.saved} />
    <form className="surface-card mt-6 grid gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
      <input aria-label="Search media" className={inputClass} defaultValue={query.q} name="q" placeholder="Filename or asset key" />
      <select aria-label="Kind filter" className={inputClass} defaultValue={query.kind} name="kind"><option value="">All kinds</option><option>image</option><option>audio</option><option>video</option><option>document</option></select>
      <select aria-label="Status filter" className={inputClass} defaultValue={query.status} name="status"><option value="">All states</option><option>uploading</option><option>pending_review</option><option>approved</option><option>rejected</option><option>archived</option></select>
      <select aria-label="Locale filter" className={inputClass} defaultValue={query.locale} name="locale"><option value="">All locales</option>{[...new Set(authorizedAssets.flatMap(({ locale }) => isLocale(locale) ? [locale] : []))].map((locale) => <option key={locale}>{locale}</option>)}</select>
      <select aria-label="City filter" className={inputClass} defaultValue={query.city} name="city"><option value="">All cities</option>{cityIds.map((id) => <option key={id} value={id}>City #{id}</option>)}</select>
      <button className="button-secondary min-h-11 px-4" type="submit">Filter</button>
    </form>
    {assets.length === 0 ? <EmptyContent>No matching media assets.</EmptyContent> : <ContentTable>
      <TableHead><HeaderCell>Asset</HeaderCell><HeaderCell>Kind</HeaderCell><HeaderCell>Type / size</HeaderCell><HeaderCell>Locale</HeaderCell><HeaderCell>Status</HeaderCell><HeaderCell>Uses</HeaderCell><HeaderCell>Created</HeaderCell><HeaderCell>Action</HeaderCell></TableHead>
      <tbody>{assets.map((asset) => <tr key={asset.id}>
        <Cell><span className="flex items-center gap-3">{icon(asset.kind)}<span><strong className="block">{asset.originalFilename}</strong><span className="font-mono text-xs text-text-secondary">{asset.assetKey}</span></span></span></Cell>
        <Cell>{asset.kind}</Cell><Cell>{asset.mimeType}<span className="mt-1 block text-xs text-text-secondary">{formatBytes(asset.sizeBytes ?? asset.expectedSizeBytes)}</span></Cell><Cell>{asset.locale ?? "—"}</Cell><Cell><StatusBadge status={asset.approvalStatus} /></Cell><Cell>{asset.usageCount}</Cell><Cell>{asset.createdAt.toLocaleDateString("en")}</Cell><Cell>
          <MediaRowActions
            assetId={asset.id}
            canManage={hasCityCapability(admin.staff, asset.cityId, "media:manage")}
            canReview={
              hasCityCapability(admin.staff, asset.cityId, "publishing:review") ||
              hasCityCapability(admin.staff, asset.cityId, "publishing:publish")
            }
            hasStoredObject={Boolean(asset.objectKey)}
            sourceType={asset.sourceType}
            status={asset.approvalStatus}
            usageCount={asset.usageCount}
          />
        </Cell>
      </tr>)}</tbody>
    </ContentTable>}
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

