import type { Locale } from "@/lib/i18n";
import { languages } from "@/lib/i18n";
import type { TranslationField } from "@/lib/admin/operations/translationOperations";

export function OperationsFilters({
  cities,
  cityId,
  languagesMode,
  view,
  field,
  showField = false,
}: Readonly<{
  cities: readonly Readonly<{ id: number; name: string }>[];
  cityId: number;
  languagesMode: "focus" | "all";
  view: "overview" | "matrix";
  field?: TranslationField;
  showField?: boolean;
}>) {
  return (
    <form className="surface-card mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
      <Filter label="City">
        <select className={inputClass} defaultValue={cityId} name="cityId">
          {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
        </select>
      </Filter>
      <Filter label="Languages">
        <select className={inputClass} defaultValue={languagesMode} name="languages">
          <option value="focus">Focus languages</option>
          <option value="all">All 27 languages</option>
        </select>
      </Filter>
      <Filter label="View">
        <select className={inputClass} defaultValue={view} name="view">
          <option value="overview">Overview</option>
          <option value="matrix">Matrix</option>
        </select>
      </Filter>
      {showField ? (
        <Filter label="Field">
          <select className={inputClass} defaultValue={field ?? "overall"} name="field">
            <option value="overall">Overall</option>
            <option value="name">Name</option>
            <option value="shortDescription">Short description</option>
            <option value="description">Description</option>
            <option value="story">Story</option>
            <option value="facts">Facts</option>
            <option value="visitNotes">Visitor notes</option>
          </select>
        </Filter>
      ) : null}
      <button className="button-secondary min-h-11 px-4 sm:self-end" type="submit">Apply filters</button>
    </form>
  );
}

export function LocaleLabel({ locale }: Readonly<{ locale: Locale }>) {
  return <><span className="uppercase">{locale}</span><span className="sr-only"> {languages[locale].nativeName}</span></>;
}

function Filter({ children, label }: Readonly<{ children: React.ReactNode; label: string }>) {
  return <label className="grid gap-2 text-sm font-semibold"><span>{label}</span>{children}</label>;
}

const inputClass = "min-h-11 rounded-xl border border-border bg-white px-3 text-sm";
