import Link from "next/link";

import { generateAudioDraftAction, makeAudioLiveAction } from "@/app/admin/(protected)/operations/actions";
import { AdminNotice } from "@/components/admin/AdminContentForms";
import {
  AdminPageHeader,
  Cell,
  ContentTable,
  EmptyContent,
  HeaderCell,
  TableHead,
} from "@/components/admin/AdminContentUi";
import { LocaleLabel, OperationsFilters } from "@/components/admin/OperationsFilters";
import {
  deriveAudioOperationsStatus,
  exactLocaleStory,
  type AudioOperationsAsset,
} from "@/lib/admin/operations/audioOperations";
import { getAuthorizedContentOperations } from "@/lib/admin/operations/service.server";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { TRANSLATION_FOCUS_LOCALES } from "@/lib/admin/operations/translationOperations";

type Query = { cityId?: string; languages?: string; view?: string; error?: string; saved?: string };

export default async function AudioOperationsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const [query, data] = await Promise.all([searchParams, getAuthorizedContentOperations()]);
  const cityIds = data.cities.map(({ id }) => id);
  const requestedCity = Number(query.cityId);
  const cityId = cityIds.includes(requestedCity) ? requestedCity : (cityIds[0] ?? -1);
  const city = data.cities.find(({ id }) => id === cityId);
  const selectedLocales: readonly Locale[] = query.languages === "all" ? locales : TRANSLATION_FOCUS_LOCALES;
  const languagesMode = query.languages === "all" ? "all" : "focus";
  const view = query.view === "overview" ? "overview" : "matrix";
  const places = data.places.filter((place) => place.cityId === cityId);
  const cells = places.flatMap((place) => selectedLocales.map((locale) => {
    const story = exactLocaleStory(place.localizations, locale);
    const assets = place.audio.flatMap(({ attachment, asset, generation }) => {
      if (
        !isLocale(asset.locale) ||
        attachment.locale !== locale ||
        asset.locale !== locale ||
        (attachment.position !== 0 && attachment.position !== 1)
      ) return [];
      return [{
        id: asset.id,
        locale: asset.locale,
        approvalStatus: asset.approvalStatus,
        position: attachment.position,
        ...(generation?.sourceLocale === locale && generation.sourceField === "story"
          ? { sourceTextHash: generation.sourceTextHash }
          : {}),
      } satisfies AudioOperationsAsset];
    });
    return { place, locale, story, ...deriveAudioOperationsStatus({ locale, story, assets }) };
  }));

  return (
    <section>
      <AdminPageHeader
        description="Audio coverage is exact-language. Replacement candidates stay private until approved and explicitly made live by a publisher."
        eyebrow="Operations"
        title={`Audio coverage${city ? ` — ${city.localizations[0]?.name ?? city.name}` : ""}`}
      />
      <AdminNotice error={query.error} saved={query.saved} />
      {!data.generationConfigured ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Audio generation is not configured. Uploads remain available.</p> : null}
      {data.cities.length ? <OperationsFilters cities={data.cities.map((item) => ({ id: item.id, name: item.localizations[0]?.name ?? item.name }))} cityId={cityId} languagesMode={languagesMode} view={view} /> : null}
      {!city ? <EmptyContent>No city is available in your staff scope.</EmptyContent> : view === "overview" ? (
        <section className="mt-8"><h2 className="text-xl font-extrabold">Needs attention</h2><ul className="mt-4 grid gap-3">{cells.filter(({ status }) => status !== "live").map((cell) => <li className="surface-card p-4" key={`${cell.place.id}-${cell.locale}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{placeName(cell.place)}</strong><p className="mt-1 text-sm text-text-secondary"><LocaleLabel locale={cell.locale} /> · {audioStatusLabel(cell.status)}</p>{cell.status === "stale" ? <p className="mt-1 text-xs text-amber-800">Audio may be outdated because the story changed.</p> : null}</div><AudioActions cell={cell} capabilities={data.capabilities} cityId={cityId} generationConfigured={data.generationConfigured} /></div></li>)}</ul></section>
      ) : (
        <ContentTable>
          <TableHead><HeaderCell>Place</HeaderCell>{selectedLocales.map((locale) => <HeaderCell key={locale}><LocaleLabel locale={locale} /></HeaderCell>)}</TableHead>
          <tbody>{places.map((place) => <tr key={place.id}><Cell><strong>{placeName(place)}</strong></Cell>{selectedLocales.map((locale) => {
            const cell = cells.find((item) => item.place.id === place.id && item.locale === locale)!;
            return <Cell key={locale}><p className="font-bold">{audioStatusLabel(cell.status)}</p>{cell.status === "stale" ? <p className="mt-1 max-w-40 text-xs text-amber-800">Audio may be outdated because the story changed.</p> : null}<div className="mt-2"><AudioActions cell={cell} capabilities={data.capabilities} cityId={cityId} generationConfigured={data.generationConfigured} /></div></Cell>;
          })}</tr>)}</tbody>
        </ContentTable>
      )}
    </section>
  );
}

function AudioActions({ cell, capabilities, cityId, generationConfigured }: Readonly<{
  cell: ReturnType<typeof deriveAudioOperationsStatus> & { place: { id: number; slug: string }; locale: Locale; story?: string };
  capabilities: { canManageMedia: boolean; canReview: boolean; canPublish: boolean };
  cityId: number;
  generationConfigured: boolean;
}>) {
  const uploadHref = `/admin/media/new?cityId=${cityId}&placeId=${cell.place.id}&kind=audio&locale=${cell.locale}`;
  return <div className="flex flex-wrap gap-2 text-xs">
    {cell.live ? <Link className="font-bold text-primary underline-offset-2 hover:underline" href={`/admin/media/${cell.live.id}`}>Listen</Link> : null}
    {cell.candidate ? <Link className="font-bold text-primary underline-offset-2 hover:underline" href={`/admin/media/${cell.candidate.id}`}>{cell.status === "needs_review" && capabilities.canReview ? "Review" : "Listen"}</Link> : null}
    {capabilities.canManageMedia && !cell.candidate ? <Link className="font-bold text-primary underline-offset-2 hover:underline" href={uploadHref}>{cell.live ? "Replace" : "Upload audio"}</Link> : null}
    {capabilities.canManageMedia && !cell.candidate && generationConfigured && cell.story ? <form action={generateAudioDraftAction.bind(null, cell.place.id, cell.locale)}><button className="font-bold text-primary hover:underline" type="submit">Generate draft</button></form> : null}
    {capabilities.canManageMedia && !cell.story ? <span className="max-w-44 text-text-secondary">Add a story in this language before generating audio.</span> : null}
    {cell.status === "ready" && capabilities.canPublish ? <form action={makeAudioLiveAction.bind(null, cell.place.id, cell.locale)}><button className="font-bold text-primary hover:underline" type="submit">Make live</button></form> : null}
  </div>;
}

function audioStatusLabel(status: string): string {
  if (status === "needs_review") return "Needs review";
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function placeName(place: { slug: string; localizations?: readonly { locale: string; name: string }[] }): string {
  return place.localizations?.find(({ locale }) => locale === "en")?.name ?? place.slug;
}
