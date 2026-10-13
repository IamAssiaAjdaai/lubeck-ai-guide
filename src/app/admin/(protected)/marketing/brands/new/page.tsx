import Link from "next/link";
import { AdminPageHeader, EmptyContent } from "@/components/admin/AdminContentUi";
import { BrandBriefForm } from "@/components/admin/BrandBriefForm";
import { getMarketingEditorOptions } from "@/lib/admin/marketing/service.server";
import { createBrandAction } from "../actions";
export const metadata = { title: "Marke anlegen | CITYWALK Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function NewBrandPage() {
  const options = await getMarketingEditorOptions();
  return <section><Link href="/admin/marketing/brands" className="text-sm font-semibold text-primary">← Marken & Projekte</Link><AdminPageHeader eyebrow="Marketing · Marken" title="Marke anlegen" description="Geschäftsbrief und strukturierte Angaben erfassen. Nichts wird automatisch bestätigt, verifiziert oder veröffentlicht." />{!options.canManage ? <EmptyContent>Keine Berechtigung zum Anlegen einer Marke.</EmptyContent> : !options.campaigns.length ? <EmptyContent>Bitte zuerst eine autorisierte Marketingkampagne anlegen. Es wird keine Kampagne automatisch erstellt.</EmptyContent> : <BrandBriefForm action={createBrandAction} campaigns={options.campaigns} />}</section>;
}
