import "server-only";

import type { ExternalAccountEraser } from "@/lib/auth/lifecycle/externalAccountErasure";

const REVENUECAT_API_BASE_URL = "https://api.revenuecat.com/v1";

export class RevenueCatCustomerErasureError extends Error {
  constructor(readonly code: "NOT_CONFIGURED" | "REQUEST_FAILED") {
    super(code);
    this.name = "RevenueCatCustomerErasureError";
  }
}

export function createRevenueCatCustomerEraser(input: Readonly<{
  apiKey?: string;
  fetchImpl?: typeof fetch;
}> = {}): ExternalAccountEraser {
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    provider: "revenuecat",
    async erase({ userId }) {
      const apiKey = input.apiKey ?? process.env.COMMERCE_REVENUECAT_SECRET_API_KEY;
      if (!apiKey?.trim()) {
        throw new RevenueCatCustomerErasureError("NOT_CONFIGURED");
      }

      const response = await fetchImpl(
        `${REVENUECAT_API_BASE_URL}/subscribers/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );

      if (response.status === 200) return "erased" as const;
      if (response.status === 404) return "not_found" as const;
      throw new RevenueCatCustomerErasureError("REQUEST_FAILED");
    },
  };
}
