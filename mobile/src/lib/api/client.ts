import {
  parseCityIndexResponse,
  parseCityResponse,
  type NativeLocale,
  type PublicCityIndexResponse,
  type PublicCityResponse,
} from "./contracts";
import { getConfiguredApiOrigin } from "./environment";

export type AuthCookieProvider = () => Promise<string>;

export type CitywalkApiClient = Readonly<{
  origin: string;
  getCities(locale: NativeLocale): Promise<PublicCityIndexResponse>;
  getCity(citySlug: string, locale: NativeLocale): Promise<PublicCityResponse>;
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
    async fetchAuthenticated(path, init = {}) {
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
    },
    resolveUrl(pathOrUrl) {
      return new URL(pathOrUrl, origin).toString();
    },
  };
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
