import { notFound } from "next/navigation";

import { archiveMediaAction, deleteMediaObjectAction, reviewMediaAction } from "@/app/admin/(protected)/media-actions";
import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminMediaPreview } from "@/components/admin/AdminMediaPreview";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { getAuthorizedMediaAsset } from "@/lib/media/service.server";
import { requireStaff } from "@/lib/admin/authorization.server";
import { hasActiveStaffCapability } from "@/lib/admin/permissions";

export default async function MediaDetailPage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}>) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [asset, admin] = await Promise.all([getAuthorizedMediaAsset(id), requireStaff()]);
  const canApprove = hasActiveStaffCapability(admin.staff, "publishing:publish");
  const canReview = hasActiveStaffCapability(admin.staff, "publishing:review");
  const canManage = hasActiveStaffCapability(admin.staff, "media:manage");
  return <section>
    <AdminPageHeader description="Immutable asset identity, verification state, review controls, and current content usages." eyebrow="Media" title={asset.originalFilename} />
    <AdminNotice error={query.error} saved={query.saved} />
    <div className="mt-5"><StatusBadge status={asset.approvalStatus} /></div>
    <div className="surface-card mt-6 p-5 sm:p-7"><AdminMediaPreview externalProvider={asset.externalVideoProvider ?? undefined} externalVideoId={asset.externalVideoId ?? undefined} kind={asset.kind} previewUrl={asset.previewUrl} /></div>
    <dl className="surface-card mt-6 grid gap-5 p-5 text-sm sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
      <Meta label="Stable asset key" value={asset.assetKey} mono /><Meta label="Object key" value={asset.objectKey ?? "External provider asset"} mono /><Meta label="City" value={`#${asset.cityId}`} /><Meta label="Kind" value={asset.kind} /><Meta label="MIME" value={asset.mimeType} /><Meta label="Size" value={asset.sizeBytes === null ? "Not finalized" : `${asset.sizeBytes} bytes`} /><Meta label="Locale" value={asset.locale ?? "Locale-neutral"} /><Meta label="Checksum" value={asset.checksumSha256 ?? "Not supplied by storage"} mono /><Meta label="Usage count" value={String(asset.usageCount)} /><Meta label="Created by" value={asset.createdByUserId ?? "Unknown actor"} mono /><Meta label="Updated by" value={asset.updatedByUserId ?? "Unknown actor"} mono /><Meta label="Updated" value={asset.updatedAt.toLocaleString("en")} />
    </dl>
    <section className="surface-card mt-6 p-5 sm:p-7"><h2 className="text-lg font-bold">Usages</h2>{asset.usages.length === 0 ? <p className="mt-3 text-sm text-text-secondary">Not attached to content.</p> : <ul className="mt-3 space-y-2 text-sm">{asset.usages.map(({ attachment, entitySlug, entityType }) => <li key={`${entityType}-${attachment.id}`}><strong>{entityType}</strong> · {entitySlug} · {attachment.purpose}{attachment.locale ? ` · ${attachment.locale}` : ""}</li>)}</ul>}</section>
    <div className="mt-6 flex flex-wrap gap-3">
      {canApprove && asset.approvalStatus !== "uploading" && asset.approvalStatus !== "archived" ? <form action={reviewMediaAction.bind(null, id, "approved")}><button className="button-primary min-h-11 px-4" type="submit">Approve</button></form> : null}
      {canReview && asset.approvalStatus !== "uploading" && asset.approvalStatus !== "archived" ? <form action={reviewMediaAction.bind(null, id, "rejected")}><button className="button-secondary min-h-11 px-4" type="submit">Reject</button></form> : null}
      {canManage && asset.approvalStatus !== "archived" ? <form action={archiveMediaAction.bind(null, id)}><ConfirmSubmitButton className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700" confirmation="Archive this unreferenced media asset?">Archive asset</ConfirmSubmitButton></form> : null}
      {canManage && asset.approvalStatus === "archived" && asset.objectKey ? <form action={deleteMediaObjectAction.bind(null, id)}><ConfirmSubmitButton className="min-h-11 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-800" confirmation="Permanently delete this unreferenced stored object? The asset metadata will remain archived.">Delete stored object</ConfirmSubmitButton></form> : null}
    </div>
  </section>;
}

function Meta({ label, mono, value }: Readonly<{ label: string; mono?: boolean; value: string }>) {
  return <div><dt className="font-semibold text-text-secondary">{label}</dt><dd className={`mt-1 break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</dd></div>;
}
