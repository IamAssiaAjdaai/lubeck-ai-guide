import {
  parseCityIndexResponse,
  parseCityResponse,
  parseGuideAnswerResponse,
  parseGuideEligibilityResponse,
  type GuideAnswerResponse,
  type GuideEligibilityResponse,
  type NativeLocale,
  type PublicCityIndexResponse,
  type PublicCityResponse,
} from "./contracts";
import { getConfiguredApiOrigin } from "./environment";

export type AuthCookieProvider = () => Promise<string>;

export type GuideQuestionInput = Readonly<{
  citySlug: string;
  placeSlug: string;
  locale: NativeLocale;
  question: string;
}>;

export type CitywalkApiClient = Readonly<{
  origin: string;
  getCities(locale: NativeLocale): Promise<PublicCityIndexResponse>;
  getCity(citySlug: string, locale: NativeLocale): Promise<PublicCityResponse>;
  getGuideEligibility(citySlug: string, placeSlug: string): Promise<GuideEligibilityResponse>;
  askGuide(input: GuideQuestionInput): Promise<GuideAnswerResponse>;
  fetchAuthenticated(path: string, init?: RequestInit): Promise<Response>;
  resolveUrl(pathOrUrl: string): string;
}>;

export function createCitywalkApiClient(input: Readonly<{
  origin?: string;
  fetchImpl?: typeof fetch;
  getAuthCookie?: AuthCookieProvider;
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
    async getCity(citySlug, locale) {
      return parseCityResponse(
        await getJson(`/api/content/cities/${encodeURIComponent(citySlug)}?locale=${encodeURIComponent(locale)}`),
      );
    },
    async getGuideEligibility(citySlug, placeSlug) {
      return parseGuideEligibilityResponse(await getJson(
        `/api/guide/eligibility?citySlug=${encodeURIComponent(citySlug)}&placeSlug=${encodeURIComponent(placeSlug)}`,
      ));
    },
    async askGuide(questionInput) {
      const response = await fetchAuthenticated("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionInput),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new CitywalkApiError(response.status, readPublicError(data));
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
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "CitywalkApiError";
  }
}

function readPublicError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value &&
      typeof value.error === "string" && value.error.trim()) {
    return value.error;
  }
  return "CITYWALK API request failed.";
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
