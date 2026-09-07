import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { getAuthorizedPlace } from "@/lib/admin/content/service.server";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AdminPlacePreviewPage({
  params,
}: PageProps<"/admin/preview/places/[id]">) {
  await connection();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const place = await getAuthorizedPlace(id);
  const localization =
    place.localizations.find(({ locale }) => locale === "en") ??
    place.localizations.find(({ locale }) => locale === "de") ??
    place.localizations[0];

  return (
    <section>
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900" role="status">
        Preview — Not published
      </div>
      <div className="mt-6">
        <AdminPageHeader
          description="This protected preview reads CMS draft data directly. It is not available through the public content repository."
          eyebrow="Editorial preview"
          title={localization?.name ?? place.slug}
        />
      </div>
      <div className="mt-4"><StatusBadge status={place.publicationStatus} /></div>
      {localization ? (
        <article className="surface-card mt-6 space-y-4 p-6">
          <p className="text-sm font-semibold text-text-secondary" lang={localization.locale}>{localization.shortDescription}</p>
          {localization.description ? <p className="leading-7" lang={localization.locale}>{localization.description}</p> : null}
          {localization.story ? <p className="leading-7" lang={localization.locale}>{localization.story}</p> : null}
        </article>
      ) : <p className="mt-6">No authored localization is available to preview.</p>}
    </section>
  );
}
