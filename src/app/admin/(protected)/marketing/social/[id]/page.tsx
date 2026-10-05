import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  SocialContentFields,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminContentUi";
import { updateMarketingContentAction } from "@/app/admin/(protected)/marketing/actions";
import {
  getMarketingContentItem,
  getMarketingEditorOptions,
  MarketingNotFoundError,
} from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "Social draft | CITYWALK Control Center",
};

export default async function MarketingSocialEditor({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}>) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let item;
  try {
    item = await getMarketingContentItem(id);
  } catch (error) {
    if (error instanceof MarketingNotFoundError) notFound();
    throw error;
  }
  const options = await getMarketingEditorOptions();
  const canEdit =
    options.canManage && (item.status === "idea" || item.status === "draft");

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href="/admin/marketing">
        ← Marketing
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          description="Edit the hook, script, caption and attribution while the content is still an idea or draft."
          eyebrow="Marketing · Social"
          title={item.contentCode}
        />
        <StatusBadge status={item.status} />
      </div>
      <AdminNotice error={query.error} saved={query.saved} />
      {canEdit ? (
        <MarketingFormShell
          action={updateMarketingContentAction.bind(null, item.id)}
          submitLabel="Save social changes"
        >
          <SocialContentFields
            campaigns={options.campaigns}
            cities={options.cities}
            item={item}
            pages={options.pages}
          />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm leading-6 text-text-secondary">
          This content is read-only here. Only idea or draft social content can be edited in the draft editor.
        </p>
      )}
    </section>
  );
}
