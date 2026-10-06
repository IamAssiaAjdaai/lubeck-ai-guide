import type { ReactNode } from "react";

import type {
  MarketingCampaignRow,
  MarketingContentRow,
  MarketingPageRow,
} from "@/db/marketingSchema";

export type MarketingCityOption = Readonly<{
  id: number;
  slug: string;
  name: string;
}>;

export type MarketingCampaignOption = Readonly<{
  id: number;
  cityId: number;
  name: string;
  status: string;
}>;

export type MarketingPageOption = Readonly<{
  id: number;
  cityId: number;
  title: string;
  path: string;
  publicationStatus: string;
}>;

type FormAction = (formData: FormData) => Promise<void>;

const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100";

export function MarketingFormShell({
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

export function CampaignFields({
  campaign,
  cities,
}: Readonly<{
  campaign?: MarketingCampaignRow;
  cities: readonly MarketingCityOption[];
}>) {
  return (
    <>
      <EditorSection
        description="Define where this campaign runs and the single message the content should reinforce."
        title="Campaign brief"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CityField cities={cities} defaultCityId={campaign?.cityId} />
          <Field label="Slug">
            <input
              className={inputClass}
              defaultValue={campaign?.slug ?? ""}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="two-hours-in-lubeck"
              required
            />
          </Field>
        </div>
        <Field label="Campaign name">
          <input className={inputClass} defaultValue={campaign?.name ?? ""} name="name" required />
        </Field>
        <Field label="Objective">
          <textarea className={inputClass} defaultValue={campaign?.objective ?? ""} name="objective" required rows={3} />
        </Field>
        <Field label="Audience">
          <textarea className={inputClass} defaultValue={campaign?.audience ?? ""} name="audience" required rows={3} />
        </Field>
        <Field label="Core message">
          <textarea className={inputClass} defaultValue={campaign?.message ?? ""} name="message" required rows={3} />
        </Field>
        <Field label="Primary CTA">
          <input className={inputClass} defaultValue={campaign?.cta ?? ""} name="cta" required />
        </Field>
      </EditorSection>

      <EditorSection
        description="Optional dates help organize launches without changing publication state."
        title="Schedule"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts on">
            <input className={inputClass} defaultValue={campaign?.startsOn ?? ""} name="startsOn" type="date" />
          </Field>
          <Field label="Ends on">
            <input className={inputClass} defaultValue={campaign?.endsOn ?? ""} name="endsOn" type="date" />
          </Field>
        </div>
      </EditorSection>
    </>
  );
}

export function MarketingPageFields({
  campaigns,
  cities,
  page,
}: Readonly<{
  campaigns: readonly MarketingCampaignOption[];
  cities: readonly MarketingCityOption[];
  page?: MarketingPageRow;
}>) {
  return (
    <>
      <EditorSection
        description="Choose the city and optional campaign this landing page or article belongs to."
        title="Page identity"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CityField cities={cities} defaultCityId={page?.cityId} />
          <Field label="Campaign">
            <select className={inputClass} defaultValue={page?.campaignId ?? ""} name="campaignId">
              <option value="">No campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} · {cityName(cities, campaign.cityId)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind">
            <select className={inputClass} defaultValue={page?.kind ?? "landing"} name="kind">
              <option value="landing">Landing page</option>
              <option value="blog">Blog article</option>
            </select>
          </Field>
          <Field label="Slug">
            <input
              className={inputClass}
              defaultValue={page?.slug ?? ""}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="2-hours"
              required
            />
          </Field>
        </div>
        <Field label="Public path">
          <input className={inputClass} defaultValue={page?.path ?? ""} name="path" placeholder="/lubeck/2-hours" required />
          <p className="text-xs font-normal text-text-secondary">
            Reserve the future public URL now. Public rendering is enabled in a later checkpoint.
          </p>
        </Field>
      </EditorSection>

      <EditorSection
        description="Write the human-approved page copy. CITYWALK traveler facts remain sourced from the verified CMS."
        title="Page content"
      >
        <Field label="Title">
          <input className={inputClass} defaultValue={page?.title ?? ""} name="title" required />
        </Field>
        <Field label="Body">
          <textarea className={inputClass} defaultValue={page?.body ?? ""} name="body" required rows={10} />
        </Field>
        <Field label="CTA">
          <input className={inputClass} defaultValue={page?.cta ?? ""} name="cta" placeholder="Build my walk" />
        </Field>
      </EditorSection>

      <EditorSection
        description="Search metadata stays separate from the traveler-facing title and body."
        title="SEO"
      >
        <Field label="SEO title">
          <input className={inputClass} defaultValue={page?.seoTitle ?? ""} maxLength={70} name="seoTitle" />
        </Field>
        <Field label="SEO description">
          <textarea className={inputClass} defaultValue={page?.seoDescription ?? ""} maxLength={180} name="seoDescription" rows={3} />
        </Field>
      </EditorSection>
    </>
  );
}

export function SocialContentFields({
  campaigns,
  cities,
  item,
  pages,
}: Readonly<{
  campaigns: readonly MarketingCampaignOption[];
  cities: readonly MarketingCityOption[];
  item?: MarketingContentRow;
  pages: readonly MarketingPageOption[];
}>) {
  return (
    <>
      <EditorSection
        description="Tie every draft to a city and, when useful, a campaign or landing page."
        title="Attribution"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CityField cities={cities} defaultCityId={item?.cityId} />
          <Field label="Campaign">
            <select className={inputClass} defaultValue={item?.campaignId ?? ""} name="campaignId">
              <option value="">No campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} · {cityName(cities, campaign.cityId)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Linked landing/blog page">
          <select className={inputClass} defaultValue={item?.pageId ?? ""} name="pageId">
            <option value="">No linked page</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title} · {page.path}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Content code">
          <input
            className={inputClass}
            defaultValue={item?.contentCode ?? ""}
            name="contentCode"
            pattern="[A-Z0-9]+(?:-[A-Z0-9]+)*"
            placeholder="CW-LUB-TIME-001"
            required
          />
          <p className="text-xs font-normal text-text-secondary">
            Stable code used later for UTM and PostHog attribution.
          </p>
        </Field>
      </EditorSection>

      <EditorSection
        description="Prepare the creative draft without publishing it automatically."
        title="Creative"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Platform">
            <input className={inputClass} defaultValue={item?.platform ?? ""} list="marketing-platforms" name="platform" placeholder="instagram" required />
            <datalist id="marketing-platforms">
              <option value="instagram" />
              <option value="tiktok" />
              <option value="youtube" />
            </datalist>
          </Field>
          <Field label="Format">
            <input className={inputClass} defaultValue={item?.format ?? ""} list="marketing-formats" name="format" placeholder="reel-short" required />
            <datalist id="marketing-formats">
              <option value="reel-short" />
              <option value="short" />
              <option value="story" />
              <option value="carousel" />
              <option value="post" />
            </datalist>
          </Field>
        </div>
        <Field label="Hook">
          <textarea className={inputClass} defaultValue={item?.hook ?? ""} name="hook" required rows={3} />
        </Field>
        <Field label="Script">
          <textarea className={inputClass} defaultValue={item?.script ?? ""} name="script" rows={7} />
        </Field>
        <Field label="Caption">
          <textarea className={inputClass} defaultValue={item?.caption ?? ""} name="caption" rows={5} />
        </Field>
        <Field label="CTA">
          <input className={inputClass} defaultValue={item?.cta ?? ""} name="cta" placeholder="Build my walk" />
        </Field>
      </EditorSection>
    </>
  );
}

function CityField({
  cities,
  defaultCityId,
}: Readonly<{
  cities: readonly MarketingCityOption[];
  defaultCityId?: number;
}>) {
  const inheritedCity = cities.length === 1 ? cities[0] : undefined;

  if (inheritedCity) {
    return (
      <div className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm">
        <input name="cityId" type="hidden" value={inheritedCity.id} />
        <p className="text-xs font-semibold text-text-secondary">City</p>
        <p className="mt-1 font-bold">{inheritedCity.name}</p>
        <p className="mt-1 text-xs text-text-secondary">Inherited from City Workspace</p>
      </div>
    );
  }

  return (
    <Field label="City">
      <select className={inputClass} defaultValue={defaultCityId} name="cityId" required>
        <option disabled value="">Choose a city</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function EditorSection({
  children,
  description,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  title: string;
}>) {
  return (
    <section className="rounded-2xl border border-border bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-5">
        <h2 className="font-extrabold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ children, label }: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

function cityName(cities: readonly MarketingCityOption[], cityId: number) {
  return cities.find((city) => city.id === cityId)?.name ?? `City ${cityId}`;
}
