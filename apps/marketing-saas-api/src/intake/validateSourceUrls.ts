
import type { WebsiteIntakeResult } from "./types";

export function validateSourceUrls(
  website: WebsiteIntakeResult,
): void {
  const websiteUrl = new URL(website.websiteUrl);

  if (
    websiteUrl.protocol !== "https:" ||
    websiteUrl.username ||
    websiteUrl.password
  ) {
    throw new Error("Invalid website URL");
  }

  for (const fact of website.facts) {
    const sourceUrl = new URL(fact.sourceUrl);

    if (
      sourceUrl.protocol !== "https:" ||
      sourceUrl.origin !== websiteUrl.origin ||
      sourceUrl.username ||
      sourceUrl.password
    ) {
      throw new Error("Invalid fact source");
    }
  }
}
