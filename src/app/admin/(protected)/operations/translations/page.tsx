import Link from "next/link";

import {
  Cell,
  ContentTable,
  EmptyContent,
  HeaderCell,
  TableHead,
  AdminPageHeader,
} from "@/components/admin/AdminContentUi";
import { LocaleLabel, OperationsFilters } from "@/components/admin/OperationsFilters";
import {
  TRANSLATION_FIELDS,
  TRANSLATION_FOCUS_LOCALES,
  deriveTranslationState,
  getTranslationCompleteness,
  translationEditorHref,
  translationNeedsAttention,
  type TranslationField,
} from "@/lib/admin/operations/translationOperations";
import { getAuthorizedContentOperations } from "@/lib/admin/operations/service.server";
import { locales, type Locale } from "@/lib/i18n";

type Query = { cityId?: string; languages?: string; view?: string; field?: string };

export default async function TranslationOperationsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const [query, data] = await Promise.all([searchParams, getAuthorizedContentOperations()]);
  const cityId = selectCityId(query.cityId, data.cities.map(({ id }) => id));
  const city = data.cities.find(({ id }) => id === cityId);
  const selectedLocales: readonly Locale[] = query.languages === "all" ? locales : TRANSLATION_FOCUS_LOCALES;
  const languagesMode = query.languages === "all" ? "all" : "focus";
  const view = query.view === "matrix" ? "matrix" : "overview";
  const field = TRANSLATION_FIELDS.includes(query.field as TranslationField)
    ? (query.field as TranslationField)
    : "overall";
  const places = data.places.filter((place) => place.cityId === cityId);
  const cells = places.flatMap((place) => selectedLocales.map((locale) => {
    const working = place.localizations.find((item) => item.locale === locale);
    const published = place.publishedRevision?.snapshot.localizations.find((item) => item.locale === locale);
    const completeness = getTranslationCompleteness(working);
    const state = deriveTranslationState({ working, published, placeStatus: place.publicationStatus });
    return { place, locale, state, completeness, needsAttention: translationNeedsAttention(state, completeness, field) };
  }));

  return (
    <section>
      <AdminPageHeader
        description="Derived from each exact working locale and the current published revision. Open a cell to edit it in the existing Place editor."
        eyebrow="Operations"
        title={`Translation coverage${city ? ` — ${city.localizations[0]?.name ?? city.name}` : ""}`}
      />
      {data.cities.length ? <OperationsFilters cities={data.cities.map((item) => ({ id: item.id, name: item.localizations[0]?.name ?? item.name }))} cityId={cityId} field={field} languagesMode={languagesMode} showField view={view} /> : null}
      {!city ? <EmptyContent>No city is available in your staff scope.</EmptyContent> : view === "matrix" ? (
        <ContentTable>
          <TableHead><HeaderCell>Place</HeaderCell>{selectedLocales.map((locale) => <HeaderCell key={locale}><LocaleLabel locale={locale} /></HeaderCell>)}</TableHead>
          <tbody>{places.map((place) => <tr key={place.id}><Cell><strong>{place.localizations.find(({ locale }) => locale === "en")?.name ?? place.slug}</strong></Cell>{selectedLocales.map((locale) => {
            const cell = cells.find((item) => item.place.id === place.id && item.locale === locale)!;
            return <Cell key={locale}><Link className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-primary hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary" href={translationEditorHref(place.id, locale)}>{field !== "overall" && !cell.completeness.fields[field] ? "Missing" : stateLabel(cell.state)}</Link></Cell>;
          })}</tr>)}</tbody>
        </ContentTable>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {selectedLocales.map((locale) => {
              const localeCells = cells.filter((cell) => cell.locale === locale);
              const complete = localeCells.filter((cell) => cell.completeness.requiredComplete).length;
              const percent = localeCells.length ? Math.round((complete / localeCells.length) * 100) : 0;
              return <div className="surface-card p-4" key={locale}><p className="text-xs font-bold uppercase text-text-secondary"><LocaleLabel locale={locale} /></p><p className="mt-2 text-2xl font-extrabold">{percent}%</p></div>;
            })}
          </div>
          <section className="mt-8"><h2 className="text-xl font-extrabold">Needs attention</h2>{cells.some(({ needsAttention }) => needsAttention) ? <ul className="mt-4 grid gap-3">{cells.filter(({ needsAttention }) => needsAttention).map((cell) => <li className="surface-card flex flex-wrap items-center justify-between gap-3 p-4" key={`${cell.place.id}-${cell.locale}`}><div><strong>{cell.place.localizations.find(({ locale }) => locale === "en")?.name ?? cell.place.slug}</strong><p className="mt-1 text-sm text-text-secondary"><LocaleLabel locale={cell.locale} /> · {stateLabel(cell.state)}{!cell.completeness.requiredComplete ? " · required fields incomplete" : ""}</p></div><Link className="button-secondary min-h-11 px-4" href={translationEditorHref(cell.place.id, cell.locale)}>Open translation</Link></li>)}</ul> : <EmptyContent>All selected translations are up to date.</EmptyContent>}</section>
        </>
      )}
    </section>
  );
}

function selectCityId(raw: string | undefined, cityIds: readonly number[]): number {
  const requested = Number(raw);
  return cityIds.includes(requested) ? requested : (cityIds[0] ?? -1);
}

function stateLabel(state: string): string {
  if (state === "in_review") return "In review";
  return `${state.charAt(0).toUpperCase()}${state.slice(1)}`;
}
