import Link from "next/link";
import { AdminPageHeader, EmptyContent } from "@/components/admin/AdminContentUi";
import { listBrandProjects } from "@/lib/marketing/brandContext/service.server";
import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
export const metadata = { title: "Marken & Projekte | CITYWALK Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  let page;
  try { page = await listBrandProjects(after ? { after } : {}); }
  catch (error) { if (error instanceof AdminAuthorizationError) return <EmptyContent>Keine Berechtigung für den Markenbereich.</EmptyContent>; throw error; }
  return <section><Link href="/admin/marketing" className="text-sm font-semibold text-primary">← Marketing</Link><AdminPageHeader eyebrow="Marketing · Marken" title="Marken & Projekte" description="Eine Marke, mehrere Kampagnen. Sichtbar sind nur Projekte mit Zugriff auf alle dauerhaft zugeordneten Städte." actionHref="/admin/marketing/brands/new" actionLabel="Marke anlegen" />
    {!page.items.length ? <EmptyContent>Noch keine zugänglichen Marken auf dieser Seite. Beginnen Sie mit einer bestehenden Kampagne.</EmptyContent> : <ul className="mt-6 grid gap-4 sm:grid-cols-2">{page.items.map(item => <li key={item.projectId} className="surface-card min-w-0 p-5"><Link href={`/admin/marketing/brands/${item.projectId}/${item.contextId}`} className="block break-words text-lg font-bold text-primary hover:underline">{item.name}</Link><p className="mt-2 text-sm text-text-secondary">Revision {item.revision} · Menschliche Prüfung</p></li>)}</ul>}
    {page.next ? <Link className="button-secondary mt-6 min-h-11 px-5" href={`/admin/marketing/brands?after=${page.next}`}>Weitere Marken</Link> : null}
  </section>;
}
