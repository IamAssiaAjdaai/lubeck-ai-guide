import { createExternalVideoAction } from "@/app/admin/(protected)/media-actions";
import { AdminNotice } from "@/components/admin/AdminContentForms";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { listAuthorizedCities } from "@/lib/admin/content/service.server";
import { isLocale, locales } from "@/lib/i18n";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media/types";
import { getAdminCapabilityOutcome } from "@/lib/admin/authorization.server";
import { redirect } from "next/navigation";

export default async function NewMediaPage({ searchParams }: Readonly<{ searchParams: Promise<{ error?: string; cityId?: string; placeId?: string; kind?: string; locale?: string }> }>) {
  const [query, cities, access] = await Promise.all([searchParams, listAuthorizedCities(), getAdminCapabilityOutcome("media:manage")]);
  if (access.kind !== "authorized") redirect("/admin/unauthorized?reason=capability");
  const options = cities.map((city) => ({ id: city.id, name: city.localizations[0]?.name ?? city.name }));
  const initialKind = MEDIA_KINDS.includes(query.kind as MediaKind)
    ? (query.kind as MediaKind)
    : "image";
  const initialCityId = Number(query.cityId);
  const candidatePlaceId = Number(query.placeId);
  return <section>
    <AdminPageHeader description="Binary files upload directly to configured S3-compatible storage. Every asset is city-scoped and requires review before public use." eyebrow="Media" title="Add media" />
    <AdminNotice error={query.error} />
    <MediaUploadForm
      candidatePlaceId={Number.isInteger(candidatePlaceId) && candidatePlaceId > 0 ? candidatePlaceId : undefined}
      cities={options}
      initialCityId={options.some(({ id }) => id === initialCityId) ? initialCityId : undefined}
      initialKind={initialKind}
      initialLocale={isLocale(query.locale) ? query.locale : "de"}
    />
    <form action={createExternalVideoAction} className="surface-card mt-6 space-y-5 p-5 sm:p-7">
      <div><h2 className="text-lg font-bold">Approved external video provider</h2><p className="mt-2 text-sm text-text-secondary">YouTube and Vimeo URLs are canonicalized server-side. Raw iframe HTML is never accepted.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold"><span>City</span><select className={inputClass} name="cityId" required>{options.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold"><span>Locale (optional)</span><select className={inputClass} name="locale"><option value="">Locale-neutral</option>{locales.map((locale) => <option key={locale}>{locale}</option>)}</select></label>
      </div>
      <label className="grid gap-2 text-sm font-semibold"><span>Display title</span><input className={inputClass} maxLength={255} name="title" /></label>
      <label className="grid gap-2 text-sm font-semibold"><span>Canonical YouTube or Vimeo URL</span><input className={inputClass} name="url" required type="url" /></label>
      <button className="button-primary min-h-11 px-5" type="submit">Add video for review</button>
    </form>
  </section>;
}

const inputClass = "min-h-11 rounded-xl border border-border bg-white px-3 text-sm";
