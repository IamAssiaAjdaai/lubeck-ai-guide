import "server-only";
import { intakeRequestSchema } from "./contracts";
import { extractPage } from "./extract.server";
import { WebsiteIntakeError } from "./errors";
import { safeRead, safeWebsiteUrl, pinnedHttpsNetwork, type WebsiteNetwork } from "./network.server";
import { buildWebsiteBrief } from "./buildBrief";

// Instance-scoped, bounded process limits. The authenticated host adds tenant/user
// limits; this is not a distributed admission-control substitute.
export function createWebsiteImporter(network: WebsiteNetwork = pinnedHttpsNetwork, now = () => Date.now()) {
  const origins = new Map<string, number>();
  let active = 0;
  return async (input: unknown) => {
    const parsed = intakeRequestSchema.safeParse(input);
    if (!parsed.success) throw new WebsiteIntakeError("INVALID_URL");
    const request = parsed.data;
    const home = safeWebsiteUrl(request.websiteUrl);
    const urls = [home, ...request.selectedPages.map(p => safeWebsiteUrl(p, home.origin))];
    if (new Set(urls.map(u => u.href)).size !== urls.length) throw new WebsiteIntakeError("INVALID_URL");
    for (const [key, timestamp] of origins) if (now() - timestamp >= 60_000) origins.delete(key);
    if (active >= 2 || origins.size >= 1000 || now() - (origins.get(home.origin) ?? -Infinity) < 60_000) throw new WebsiteIntakeError("LIMIT", 429);
    origins.set(home.origin, now()); active++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const timeout = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new WebsiteIntakeError("TIMEOUT")), { once: true }));
    try {
      return await Promise.race([timeout, (async () => {
        const robots = await safeRead(new URL("/robots.txt", home), network, controller.signal, 16_384);
        if (robots.status !== 404 && robots.status !== 200) throw new WebsiteIntakeError("POLICY");
        // Conservative robots policy: any matching Disallow in any group blocks.
        const disallowed = robots.status === 200 ? robots.body.split(/\r?\n/).map(line => /^\s*disallow\s*:\s*([^#]*)/i.exec(line)?.[1].trim()).filter(Boolean) as string[] : [];
        const allowed = (url: URL) => !disallowed.some(rule => {
          const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g,".*");
          return new RegExp("^" + escaped).test(url.pathname + url.search);
        });
        const pages = [];
        for (const url of urls) {
          if (!allowed(url)) throw new WebsiteIntakeError("POLICY");
          const res = await safeRead(url, network, controller.signal, 262_144, allowed);
          if (!allowed(new URL(res.sourceUrl)) || /noindex|nofollow|none/i.test(res.headers["x-robots-tag"] ?? "")) throw new WebsiteIntakeError("POLICY");
          if (res.status !== 200) throw new WebsiteIntakeError("NETWORK");
          if (!/^text\/html(?:;|$)/i.test(res.headers["content-type"] ?? "") || res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") throw new WebsiteIntakeError("UNSUPPORTED_CONTENT");
          pages.push(extractPage(res.body, res.sourceUrl, new Date(now()).toISOString()));
        }
        const facts = pages.flatMap((page, pageIndex) => page.candidates.map((snippet, index) => ({
          id: `web-${pageIndex + 1}-${index + 1}`, statement: snippet, evidence: snippet, sourceUrl: page.sourceUrl,
        })));
        if (!facts.length) throw new WebsiteIntakeError("EMPTY_PAGE");
        const result = buildWebsiteBrief({ websiteUrl: home.href, title: pages[0].title || undefined, fetchedAt: pages[0].fetchedAt, facts }, request.businessName);
        return { ...result, pages, missingInformation: ["Bitte Zielgruppe, gewünschte Tonalität und Kampagnenziel ergänzen.", "Alle Website-Angaben vor der Nutzung ausdrücklich prüfen und bestätigen."] };
      })()]);
    } catch (error) {
      controller.abort();
      if (error instanceof WebsiteIntakeError) throw error;
      throw new WebsiteIntakeError("NETWORK");
    } finally { clearTimeout(timer); active--; }
  };
}
