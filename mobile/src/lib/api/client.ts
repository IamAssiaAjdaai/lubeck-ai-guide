import {
  parseCityIndexResponse,
  parseCityResponse,
  parseCitySummaryResponse,
  parsePlaceResponse,
  parseGuideAnswerResponse,
  parseGuideAllowance,
  parseGuideEligibilityResponse,
  type GuideAnswerResponse,
  type GuideAllowance,
  type GuideEligibilityResponse,
  type NativeLocale,
  type PublicCityIndexResponse,
  type PublicCityResponse,
  type PublicCitySummaryResponse,
  type PublicPlaceResponse,
} from "./contracts";
import type { PublicContentFetch } from "../publicContentCache";
import { getConfiguredApiOrigin } from "./environment";

export type AuthCookieProvider = () => Promise<string>;
export type VisitorIdProvider = () => Promise<string>;

export type GuideHistoryInput = Readonly<{
  role: "user" | "assistant";
  text: string;
}>;

export type GuideQuestionInput = Readonly<{
  citySlug: string;
  placeSlug: string;
  locale: NativeLocale;
  question: string;
  history?: readonly GuideHistoryInput[];
}>;

export type CitywalkApiClient = Readonly<{
  origin: string;
  getCities(locale: NativeLocale): Promise<PublicCityIndexResponse>;
  getCity(citySlug: string, locale: NativeLocale): Promise<PublicCityResponse>;
  getCitySummary(citySlug: string, locale: NativeLocale): Promise<PublicCitySummaryResponse>;
  getPlace(citySlug: string, placeSlug: string, locale: NativeLocale): Promise<PublicPlaceResponse>;
  loadCities(locale: NativeLocale, etag?: string, signal?: AbortSignal): Promise<PublicContentFetch<PublicCityIndexResponse>>;
  loadCitySummary(citySlug: string, locale: NativeLocale, etag?: string, signal?: AbortSignal): Promise<PublicContentFetch<PublicCitySummaryResponse>>;
  loadPlace(citySlug: string, placeSlug: string, locale: NativeLocale, etag?: string, signal?: AbortSignal): Promise<PublicContentFetch<PublicPlaceResponse>>;
  getGuideEligibility(citySlug: string, placeSlug: string): Promise<GuideEligibilityResponse>;
  askGuide(input: GuideQuestionInput): Promise<GuideAnswerResponse>;
  fetchAuthenticated(path: string, init?: RequestInit): Promise<Response>;
  resolveUrl(pathOrUrl: string): string;
}>;

export function createCitywalkApiClient(input: Readonly<{
  origin?: string;
  fetchImpl?: typeof fetch;
  getAuthCookie?: AuthCookieProvider;
  getVisitorId?: VisitorIdProvider;
}> = {}): CitywalkApiClient {
  const origin = input.origin ?? getConfiguredApiOrigin();
  const fetchImpl = input.fetchImpl ?? fetch;

  async function getJson(path: string): Promise<unknown> {
    const response = await fetchImpl(new URL(path, origin), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`CITYWALK API request failed (${response.status}).`);
    return response.json();
  }

  async function getPublicJson<T>(
    path: string,
    parse: (value: unknown) => T,
    etag?: string,
    signal?: AbortSignal,
  ): Promise<PublicContentFetch<T>> {
    const headers = new Headers({ Accept: "application/json" });
    if (etag) headers.set("If-None-Match", etag);
    const response = await fetchImpl(new URL(path, origin), { headers, signal });
    const responseEtag = response.headers.get("etag") ?? undefined;
    if (response.status === 304) {
      return { status: 304, ...(responseEtag ? { etag: responseEtag } : {}) };
    }
    if (!response.ok) throw new Error(`CITYWALK API request failed (${response.status}).`);
    return {
      status: 200,
      data: parse(await response.json()),
      ...(responseEtag ? { etag: responseEtag } : {}),
    };
  }

  async function fetchAuthenticated(path: string, init: RequestInit = {}): Promise<Response> {
    if (!input.getAuthCookie) throw new Error("Authenticated API client is not configured.");
    const requestUrl = resolveAuthenticatedRequestUrl(path, origin);
    const cookie = await input.getAuthCookie();
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    headers.delete("Cookie");
    if (cookie) headers.set("Cookie", cookie);
    return fetchImpl(requestUrl, {
      ...init,
      // Better Auth's Expo integration manages cookies in SecureStore. Native
      // requests forward that cookie explicitly, so browser credential mode
      // must not compete with or obscure the native session boundary.
      credentials: "omit",
      headers,
    });
  }

  return {
    origin,
    async getCities(locale) {
      return parseCityIndexResponse(
        await getJson(`/api/content/cities?locale=${encodeURIComponent(locale)}`),
      );
    },
    async loadCities(locale, etag, signal) {
      return getPublicJson(
        `/api/content/cities?locale=${encodeURIComponent(locale)}`,
        parseCityIndexResponse,
        etag,
        signal,
      );
    },
    async getCity(citySlug, locale) {
      return parseCityResponse(
        await getJson(`/api/content/cities/${encodeURIComponent(citySlug)}?locale=${encodeURIComponent(locale)}`),
      );
    },
    async getCitySummary(citySlug, locale) {
      return parseCitySummaryResponse(await getJson(
        `/api/content/cities/${encodeURIComponent(citySlug)}/summary?locale=${encodeURIComponent(locale)}`,
      ));
    },
    async loadCitySummary(citySlug, locale, etag, signal) {
      return getPublicJson(
        `/api/content/cities/${encodeURIComponent(citySlug)}/summary?locale=${encodeURIComponent(locale)}`,
        parseCitySummaryResponse,
        etag,
        signal,
      );
    },
    async getPlace(citySlug, placeSlug, locale) {
      return parsePlaceResponse(await getJson(
        `/api/content/cities/${encodeURIComponent(citySlug)}/places/${encodeURIComponent(placeSlug)}?locale=${encodeURIComponent(locale)}`,
      ));
    },
    async loadPlace(citySlug, placeSlug, locale, etag, signal) {
      return getPublicJson(
        `/api/content/cities/${encodeURIComponent(citySlug)}/places/${encodeURIComponent(placeSlug)}?locale=${encodeURIComponent(locale)}`,
        parsePlaceResponse,
        etag,
        signal,
      );
    },
    async getGuideEligibility(citySlug, placeSlug) {
      return parseGuideEligibilityResponse(await getJson(
        `/api/guide/eligibility?citySlug=${encodeURIComponent(citySlug)}&placeSlug=${encodeURIComponent(placeSlug)}`,
      ));
    },
    async askGuide(questionInput) {
      if (!input.getVisitorId) {
        throw new Error("Anonymous visitor identity is not configured.");
      }
      const visitorId = await input.getVisitorId();
      const response = await fetchAuthenticated("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...questionInput, visitorId }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const error = readPublicError(data);
        throw new CitywalkApiError(response.status, error.message, error.code, error.allowance);
      }
      return parseGuideAnswerResponse(data);
    },
    fetchAuthenticated,
    resolveUrl(pathOrUrl) {
      return new URL(pathOrUrl, origin).toString();
    },
  };
}

export class CitywalkApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly allowance?: GuideAllowance,
  ) {
    super(message);
    this.name = "CitywalkApiError";
  }
}

function readPublicError(value: unknown): Readonly<{
  message: string;
  code?: string;
  allowance?: GuideAllowance;
}> {
  if (value && typeof value === "object" && "error" in value &&
      typeof value.error === "string" && value.error.trim()) {
    const object = value as Record<string, unknown>;
    let allowance: GuideAllowance | undefined;
    try {
      allowance = object.allowance === undefined
        ? undefined
        : parseGuideAllowance(object.allowance);
    } catch {
      allowance = undefined;
    }
    return {
      message: value.error,
      ...(typeof object.code === "string" ? { code: object.code } : {}),
      ...(allowance ? { allowance } : {}),
    };
  }
  return { message: "CITYWALK API request failed." };
}

function resolveAuthenticatedRequestUrl(path: string, origin: string): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Authenticated CITYWALK requests must use a relative server path.");
  }
  const requestUrl = new URL(path, origin);
  if (requestUrl.origin !== origin) {
    throw new Error("Authenticated CITYWALK requests must stay on the configured API origin.");
  }
  return requestUrl;
}
