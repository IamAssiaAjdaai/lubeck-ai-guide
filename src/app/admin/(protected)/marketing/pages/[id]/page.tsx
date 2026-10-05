import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  MarketingPageFields,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { updateMarketingPageAction } from "@/app/admin/(protected)/marketing/actions";
import {
  getMarketingEditorOptions,
  getMarketingPage,
  MarketingNotFoundError,
} from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "Marketing page | CITYWALK Control Center",
};

export default async function MarketingPageEditor({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}>) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let page;
  try {
    page = await getMarketingPage(id);
  } catch (error) {
    if (error instanceof MarketingNotFoundError) notFound();
    throw error;
  }
  const options = await getMarketingEditorOptions();
  const canEdit = options.canManage && page.publicationStatus === "draft";

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href="/admin/marketing">
        ← Marketing
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          description="Edit traveler-facing marketing copy while this page is still a draft. Review and publish stay separate."
          eyebrow={`Marketing · ${page.kind}`}
          title={page.title}
        />
        <StatusBadge status={page.publicationStatus} />
      </div>
      <AdminNotice error={query.error} saved={query.saved} />
      {canEdit ? (
        <MarketingFormShell
          action={updateMarketingPageAction.bind(null, page.id)}
          submitLabel="Save page changes"
        >
          <MarketingPageFields
            campaigns={options.campaigns}
            cities={options.cities}
            page={page}
          />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm leading-6 text-text-secondary">
          This page is read-only here. Only draft marketing pages can be edited in the draft editor.
        </p>
      )}
    </section>
  );
}
