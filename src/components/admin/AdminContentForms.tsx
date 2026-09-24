import type { ReactNode } from "react";
import Link from "next/link";

import {
  PLACE_CATEGORIES,
  PLACE_ENVIRONMENTS,
  PLACE_PRICING,
  PLACE_STATUSES,
} from "@/data/places";
import type {
  CityLocalizationRow,
  CityRow,
  ContentTagRow,
  PlaceLocalizationRow,
  PlaceRow,
  TourLocalizationRow,
  TourRow,
  TourStopRow,
} from "@/db/schema";
import { locales, type Locale } from "@/lib/i18n";
import { TourStopEditor } from "@/components/admin/TourStopEditor";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import type { ContentSourceRow } from "@/db/schema";
import type { PublicationStatus } from "@/lib/admin/content/validation";
import {
  EDITORIAL_TRANSITIONS,
  type EditorialWorkflowState,
} from "@/lib/admin/content/editorialWorkflow";
import {
  hasCityCapability,
  type AdminCapability,
  type StaffAccess,
} from "@/lib/admin/permissions";

type FormAction = (formData: FormData) => Promise<void>;
type AdminPlaceFormRecord = Omit<PlaceRow, "tags"> & {
  localizations: PlaceLocalizationRow[];
  tags: ContentTagRow[];
};

export function AdminNotice({
  error,
  saved,
}: Readonly<{ error?: string; saved?: string }>) {
  if (!error && !saved) return null;
  return (
    <p
      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
      role="status"
    >
      {error ?? "Changes saved."}
    </p>
  );
}

export function AdminFormShell({
  action,
  children,
  submitLabel,
}: Readonly<{
  action: FormAction;
  children: ReactNode;
  submitLabel: string;
}>) {
  return (
    <form action={action} className="surface-card mt-6 space-y-6 p-5 sm:p-7">
      {children}
      <button className="button-primary min-h-11 px-5" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}

export function CityFields({
  city,
  editingLocale,
}: Readonly<{
  city?: CityRow & { localizations: CityLocalizationRow[] };
  editingLocale?: Locale;
}>) {
  const localization = selectedLocalization(city?.localizations, editingLocale);
  return (
    <>
      <input name="publicationStatus" type="hidden" value={city?.publicationStatus ?? "draft"} />
      {city ? <input name="expectedUpdatedAt" type="hidden" value={city.updatedAt.toISOString()} /> : null}
      <Field label="Slug">
        <input className={inputClass} defaultValue={city?.slug} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country code">
          <input className={inputClass} defaultValue={city?.countryCode ?? ""} maxLength={2} name="countryCode" pattern="[A-Za-z]{2}" placeholder="DE" required />
        </Field>
        <Field label="Timezone">
          <input className={inputClass} defaultValue={city?.timezone ?? ""} name="timezone" placeholder="Europe/Berlin" required />
        </Field>
      </div>
      <LocalizationFields
        editingLocale={editingLocale}
        locale={localization?.locale}
        name={localization?.name}
        shortDescription={localization?.shortDescription ?? undefined}
      >
        <Field label="Traveler introduction">
          <textarea className={inputClass} defaultValue={localization?.description ?? ""} name="description" rows={7} />
        </Field>
      </LocalizationFields>
      <AuthoredLocales rows={city?.localizations} />
    </>
  );
}

export function PlaceFields({
  cities,
  editingLocale,
  place,
  tags,
}: Readonly<{
  cities: readonly (CityRow & { localizations: CityLocalizationRow[] })[];
  editingLocale?: Locale;
  place?: AdminPlaceFormRecord;
  tags: readonly ContentTagRow[];
}>) {
  const localization = selectedLocalization(place?.localizations, editingLocale);
  return (
    <>
      <input name="publicationStatus" type="hidden" value={place?.publicationStatus ?? "draft"} />
      {place ? <input name="expectedUpdatedAt" type="hidden" value={place.updatedAt.toISOString()} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City">
          <select className={inputClass} defaultValue={place?.cityId} name="cityId" required>
            {cities.map((city) => <option key={city.id} value={city.id}>{cityDisplayName(city)}</option>)}
          </select>
        </Field>
        <Field label="Slug">
          <input className={inputClass} defaultValue={place?.slug} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        </Field>
        <Field label="Category">
          <select className={inputClass} defaultValue={place?.category ?? "see"} name="category">
            {PLACE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Duration (minutes)">
          <input className={inputClass} defaultValue={place?.durationMinutes ?? 30} max={1440} min={1} name="durationMinutes" required type="number" />
        </Field>
        <Field label="Latitude">
          <input className={inputClass} defaultValue={place?.latitude} max={90} min={-90} name="latitude" required step="any" type="number" />
        </Field>
        <Field label="Longitude">
          <input className={inputClass} defaultValue={place?.longitude} max={180} min={-180} name="longitude" required step="any" type="number" />
        </Field>
        <Field label="Environment">
          <select className={inputClass} defaultValue={place?.environment ?? "outdoor"} name="environment">
            {PLACE_ENVIRONMENTS.map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Pricing">
          <select className={inputClass} defaultValue={place?.pricing ?? "unknown"} name="pricing">
            {PLACE_PRICING.map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Operational status">
          <select className={inputClass} defaultValue={place?.status ?? ""} name="status">
            <option value="">Not specified</option>
            {PLACE_STATUSES.map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Status verified">
          <input className={inputClass} defaultValue={place?.statusVerifiedAt ?? ""} name="statusVerifiedAt" type="date" />
        </Field>
        <Field label="Visit note verified">
          <input className={inputClass} defaultValue={place?.visitNoteVerifiedAt ?? ""} name="visitNoteVerifiedAt" type="date" />
        </Field>
        <Field label="Visit note valid until">
          <input className={inputClass} defaultValue={place?.visitNoteValidUntil ?? ""} name="visitNoteValidUntil" type="date" />
        </Field>
      </div>
      <Field label="Image reference">
        <input className={inputClass} defaultValue={place?.image ?? ""} name="image" />
      </Field>
      <Field label="Tags (comma-separated slugs)">
        <input
          className={inputClass}
          defaultValue={(place?.tags.map(({ slug }) => slug) ?? []).join(", ")}
          list="content-tag-options"
          name="tagSlugs"
        />
        <datalist id="content-tag-options">
          {tags.map((tag) => <option key={tag.id} value={tag.slug} />)}
        </datalist>
      </Field>
      <LocalizationFields
        editingLocale={editingLocale}
        locale={localization?.locale}
        name={localization?.name}
        shortDescription={localization?.shortDescription}
      >
        <Field label="Description">
          <textarea className={inputClass} defaultValue={localization?.description ?? ""} name="description" rows={5} />
        </Field>
        <Field label="Story">
          <textarea className={inputClass} defaultValue={localization?.story ?? ""} name="story" rows={8} />
        </Field>
        <Field label="Visit notes">
          <textarea className={inputClass} defaultValue={localization?.visitNotes ?? ""} name="visitNotes" rows={4} />
        </Field>
        <Field label="Facts (one Label | Value per line)">
          <textarea
            className={inputClass}
            defaultValue={(localization?.facts ?? []).map((fact) => `${fact.label} | ${fact.value}`).join("\n")}
            name="facts"
            rows={6}
          />
        </Field>
      </LocalizationFields>
      <AuthoredLocales rows={place?.localizations} />
    </>
  );
}

export function TourFields({
  cities,
  editingLocale,
  places,
  tour,
}: Readonly<{
  cities: readonly (CityRow & { localizations: CityLocalizationRow[] })[];
  editingLocale?: Locale;
  places: readonly AdminPlaceFormRecord[];
  tour?: TourRow & {
    localizations: TourLocalizationRow[];
    stops: TourStopRow[];
  };
}>) {
  const localization = selectedLocalization(tour?.localizations, editingLocale);
  return (
    <>
      <input name="publicationStatus" type="hidden" value={tour?.publicationStatus ?? "draft"} />
      {tour ? <input name="expectedUpdatedAt" type="hidden" value={tour.updatedAt.toISOString()} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City">
          <select className={inputClass} defaultValue={tour?.cityId} name="cityId" required>
            {cities.map((city) => <option key={city.id} value={city.id}>{cityDisplayName(city)}</option>)}
          </select>
        </Field>
        <Field label="Slug">
          <input className={inputClass} defaultValue={tour?.slug} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        </Field>
        <Field label="Estimated duration (minutes)">
          <input className={inputClass} defaultValue={tour?.estimatedDurationMinutes ?? ""} max={1440} min={1} name="estimatedDurationMinutes" type="number" />
        </Field>
      </div>
      <LocalizationFields
        editingLocale={editingLocale}
        locale={localization?.locale}
        name={localization?.title}
        nameLabel="Title"
        shortDescription={localization?.shortDescription ?? undefined}
      >
        <Field label="Description">
          <textarea className={inputClass} defaultValue={localization?.description ?? ""} name="description" rows={7} />
        </Field>
      </LocalizationFields>
      <AuthoredLocales rows={tour?.localizations} />
      <TourStopEditor
        initialStopIds={[...(tour?.stops ?? [])]
          .sort((a, b) => a.position - b.position)
          .map(({ placeId }) => placeId)}
        places={places.map((place) => ({
          id: place.id,
          cityId: place.cityId,
          name: preferredLocalization(place.localizations)?.name ?? place.slug,
        }))}
      />
    </>
  );
}

export function PublicationActions({
  entity,
  id,
  status,
  action,
  deleteAction,
  approveAndPublishAction,
  cityId,
  staff,
}: Readonly<{
  entity: "city" | "place" | "tour";
  id: number;
  status: PublicationStatus;
  action: FormAction;
  deleteAction?: () => Promise<void>;
  approveAndPublishAction?: () => Promise<void>;
  cityId: number;
  staff: StaffAccess;
}>) {
  const canReview = hasCityCapability(staff, cityId, "publishing:review");
  const canPublish = hasCityCapability(staff, cityId, "publishing:publish");
  const showCombinedAction = status === "in_review" && canReview && canPublish && approveAndPublishAction;
  const transitions = EDITORIAL_TRANSITIONS.filter(
    (transition) =>
      transition.from === status &&
      transition.to !== "archived" &&
      !(showCombinedAction && transition.to === "approved") &&
      hasCityCapability(
        staff,
        cityId,
        transitionCapability(entity, transition.from, transition.action),
      ),
  );
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {transitions.map((transition) => (
        <form action={action} key={transition.to}>
          <input name="publicationStatus" type="hidden" value={transition.to} />
          <button className="button-secondary min-h-11 px-4" type="submit">
            {transitionLabel(transition.from, transition.to)} {entity}
          </button>
        </form>
      ))}
      {showCombinedAction ? (
        <form action={approveAndPublishAction}>
          <button className="button-primary min-h-11 px-4" type="submit">Approve &amp; Publish {entity}</button>
        </form>
      ) : null}
      {status === "draft" && deleteAction && hasCityCapability(staff, cityId, entityManageCapability(entity)) ? (
        <form action={deleteAction}>
          <ConfirmSubmitButton
            className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700"
            confirmation={`Permanently delete this ${entity} draft? This cannot be undone.`}
          >
            Permanently delete draft
          </ConfirmSubmitButton>
        </form>
      ) : null}
      <span className="self-center text-xs text-text-secondary">Record #{id}</span>
      {status === "published" && canPublish ? (
        <details className="relative self-center">
          <summary className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold">⋯ More</summary>
          <form action={action} className="absolute end-0 z-10 mt-2 min-w-44 rounded-xl border border-border bg-white p-2 shadow-lg">
            <input name="publicationStatus" type="hidden" value="archived" />
            <ConfirmSubmitButton
              className="w-full rounded-lg px-3 py-2 text-start text-sm font-semibold text-red-700 hover:bg-red-50"
              confirmation={`Archive this ${entity}? It will disappear from public CITYWALK content.`}
            >
              Archive {entity}
            </ConfirmSubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}

export function ContentSourcesPanel({
  action,
  canManage,
  sourceLinks,
  subject,
}: Readonly<{
  action: FormAction;
  canManage: boolean;
  sourceLinks: readonly Readonly<{ source: ContentSourceRow; required: boolean }>[];
  subject: "city" | "place";
}>) {
  return (
    <section className="surface-card mt-6 p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">References</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Add links that editors and reviewers can use to verify this {subject}.
      </p>
      {sourceLinks.length ? (
        <ul className="mt-4 space-y-3">
          {sourceLinks.map(({ source, required }) => (
            <li className="rounded-xl border border-border p-4" key={source.id}>
              <a className="font-bold text-primary underline-offset-2 hover:underline" href={source.canonicalUrl} rel="noreferrer" target="_blank">
                {source.title}
              </a>
              <p className="mt-1 text-sm text-text-secondary">
                {source.publisher}{required ? " · required for publishing" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Add a reliable source before this content can be published.</p>}
      {canManage ? (
        <form action={action} className="mt-6 grid gap-4">
          <Field label="Reference link"><input className={inputClass} name="referenceUrl" placeholder="https://…" required type="url" /></Field>
          <button className="button-secondary min-h-11 justify-self-start px-4" type="submit">+ Add another reference</button>
        </form>
      ) : null}
    </section>
  );
}

export function PlaceSourcesPanel(
  props: Omit<Parameters<typeof ContentSourcesPanel>[0], "subject">,
) {
  return <ContentSourcesPanel {...props} subject="place" />;
}

function transitionLabel(
  from: EditorialWorkflowState,
  to: EditorialWorkflowState,
): string {
  if (to === "in_review") return "Send for review";
  if (to === "approved") return "Approve";
  if (to === "published") return "Publish";
  return from === "archived" ? "Return to draft" : "Request changes";
}

function entityManageCapability(entity: "city" | "place" | "tour"): AdminCapability {
  return `${entity === "city" ? "cities" : `${entity}s`}:manage` as AdminCapability;
}

function transitionCapability(
  entity: "city" | "place" | "tour",
  from: EditorialWorkflowState,
  action: "submitted_for_review" | "returned_to_draft" | "approved" | "published" | "archived",
): AdminCapability {
  if (action === "submitted_for_review") return entityManageCapability(entity);
  if (from === "archived") return "publishing:publish";
  if (action === "approved" || action === "returned_to_draft") return "publishing:review";
  return "publishing:publish";
}

function LocalizationFields({
  children,
  editingLocale,
  locale,
  name,
  nameLabel = "Name",
  shortDescription,
}: Readonly<{
  children?: ReactNode;
  editingLocale?: Locale;
  locale?: string;
  name?: string;
  nameLabel?: string;
  shortDescription?: string;
}>) {
  return (
    <fieldset className="space-y-5 rounded-xl border border-border p-4">
      <legend className="px-2 text-sm font-bold">Authored localization</legend>
      <Field label="Locale">
        {editingLocale ? (
          <>
            <input name="locale" type="hidden" value={editingLocale} />
            <span className="flex min-h-11 items-center rounded-xl border border-border bg-slate-50 px-3 font-mono text-sm">
              {editingLocale}
            </span>
          </>
        ) : (
          <select className={inputClass} defaultValue={locale ?? "en"} name="locale">
            {locales.map((value) => <option key={value}>{value}</option>)}
          </select>
        )}
      </Field>
      <Field label={nameLabel}>
        <input className={inputClass} defaultValue={name} name={nameLabel === "Title" ? "title" : "name"} required />
      </Field>
      <Field label="Short description">
        <textarea className={inputClass} defaultValue={shortDescription ?? ""} name="shortDescription" rows={3} />
      </Field>
      {children}
    </fieldset>
  );
}

function AuthoredLocales({ rows }: Readonly<{ rows?: readonly { locale: string }[] }>) {
  if (!rows?.length) return <p className="text-xs text-text-secondary">No authored locales yet.</p>;
  return <p className="text-xs text-text-secondary">Authored locales: {rows.map(({ locale }) => locale).join(", ")}. Saving another locale adds it without generating fallback rows.</p>;
}

export function LocaleNavigator({
  authoredLocales,
  currentLocale,
}: Readonly<{
  authoredLocales: readonly string[];
  currentLocale: Locale;
}>) {
  const authored = new Set(authoredLocales);
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-text-secondary">
        Choose the locale to edit. Outlined locales are not authored yet.
      </p>
      <nav aria-label="Authored localization editor" className="mt-2 flex flex-wrap gap-2">
        {locales.map((locale) => (
          <Link
            aria-current={locale === currentLocale ? "page" : undefined}
            className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold ${
              locale === currentLocale
                ? "border-primary bg-primary text-white"
                : authored.has(locale)
                  ? "border-blue-200 bg-blue-50 text-primary"
                  : "border-border bg-white text-text-secondary"
            }`}
            href={`?locale=${locale}`}
            key={locale}
          >
            {locale}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Field({ children, label }: Readonly<{ children: ReactNode; label: string }>) {
  return <label className="grid gap-2 text-sm font-semibold">{label}{children}</label>;
}

function preferredLocalization<T extends { locale: string }>(rows?: readonly T[]): T | undefined {
  return rows?.find(({ locale }) => locale === "en") ?? rows?.find(({ locale }) => locale === "de") ?? rows?.[0];
}

function selectedLocalization<T extends { locale: string }>(
  rows: readonly T[] | undefined,
  locale: Locale | undefined,
): T | undefined {
  return locale
    ? rows?.find((row) => row.locale === locale)
    : preferredLocalization(rows);
}

function cityDisplayName(city: CityRow & { localizations: CityLocalizationRow[] }): string {
  return preferredLocalization(city.localizations)?.name ?? city.name;
}

const inputClass = "min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";
