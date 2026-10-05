import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  SocialContentFields,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { createMarketingContentAction } from "@/app/admin/(protected)/marketing/actions";
import { getMarketingEditorOptions } from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "New social draft | CITYWALK Control Center",
};

export default async function NewMarketingSocialPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ error }, options] = await Promise.all([
    searchParams,
    getMarketingEditorOptions(),
  ]);

  return (
    <section>
      <Link className="text-sm font-semibold text-primary hover:underline" href="/admin/marketing">
        ← Marketing
      </Link>
      <AdminPageHeader
        description="Create a human-reviewed social draft with a stable content code for attribution."
        eyebrow="Marketing · Social"
        title="New social draft"
      />
      <AdminNotice error={error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingContentAction} submitLabel="Save social draft">
          <SocialContentFields
            campaigns={options.campaigns}
            cities={options.cities}
            pages={options.pages}
          />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create social content.
        </p>
      )}
    </section>
  );
}
