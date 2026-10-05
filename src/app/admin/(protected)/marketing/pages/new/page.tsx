import Link from "next/link";

import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  MarketingFormShell,
  MarketingPageFields,
} from "@/components/admin/MarketingForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { createMarketingPageAction } from "@/app/admin/(protected)/marketing/actions";
import { getMarketingEditorOptions } from "@/lib/admin/marketing/service.server";

export const metadata = {
  title: "New marketing page | CITYWALK Control Center",
};

export default async function NewMarketingPage({
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
        description="Create a landing page or blog draft and reserve its future public path."
        eyebrow="Marketing · Pages"
        title="New page"
      />
      <AdminNotice error={error} />
      {options.canManage ? (
        <MarketingFormShell action={createMarketingPageAction} submitLabel="Save page draft">
          <MarketingPageFields campaigns={options.campaigns} cities={options.cities} />
        </MarketingFormShell>
      ) : (
        <p className="surface-card mt-6 p-5 text-sm text-text-secondary">
          Marketing edit access is required to create a page.
        </p>
      )}
    </section>
  );
}
