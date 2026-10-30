import {
  parseCityIndexResponse,
  type NativeLocale,
} from "./api/contracts";
import {
  getPreviewTesterToken,
  clearPreviewTesterToken,
} from "./previewTesterAuth0";

const PREVIEW_ORIGIN = "https://api-preview.getcitywalk.com";

type Dependencies = {
  environment?: string;
  configuredOrigin?: string;
  getToken: () => string | null;
  clearToken: () => void;
  fetchImpl: typeof fetch;
};

export function createPreviewTesterReadClient(deps: Dependencies) {
  return {
    async getCities(locale: NativeLocale) {
      if (
        deps.environment !== "preview" ||
        deps.configuredOrigin !== PREVIEW_ORIGIN
      ) {
        throw new Error("Preview tester API is disabled.");
      }

      const token = deps.getToken();
      if (!token) {
        throw new Error("Preview tester login required.");
      }

      if (
        token.length > 8192 ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
      ) {
        deps.clearToken();
        throw new Error("Invalid Preview tester token format.");
      }

      const url = new URL("/api/content/cities", PREVIEW_ORIGIN);
      url.searchParams.set("locale", locale);

      const response = await deps.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Citywalk-Tester-Token": token,
        },
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
      });

      if (response.status === 401) {
        deps.clearToken();
        throw new Error("Preview tester authentication expired.");
      }

      if (response.status === 503) {
        throw new Error("Preview API remains locked or unavailable.");
      }

      if (response.status >= 300 && response.status < 400) {
        throw new Error("Preview API redirects are not permitted.");
      }

      if (!response.ok) {
        throw new Error(
          `Preview API request failed (${response.status}).`
        );
      }

      return parseCityIndexResponse(await response.json());
    },
  };
}

export const previewTesterReadClient =
  createPreviewTesterReadClient({
    environment: process.env.EXPO_PUBLIC_CITYWALK_ENV,
    configuredOrigin: process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
    getToken: getPreviewTesterToken,
    clearToken: clearPreviewTesterToken,
    fetchImpl: fetch,
  });
