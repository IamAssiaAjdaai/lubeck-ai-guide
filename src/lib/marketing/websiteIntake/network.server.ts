import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { WebsiteIntakeError } from "./errors";

export function publicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed.range() !== "unicast") return false;
    // Only currently routable global IPv6; reject transition, documentation and reserved space.
    if (parsed.kind() === "ipv6") return parsed.match(ipaddr.parse("2000::"), 3)
      && !parsed.match(ipaddr.parse("2001::"), 23)
      && !parsed.match(ipaddr.parse("2001:db8::"), 32)
      && !parsed.match(ipaddr.parse("2002::"), 16)
      && !parsed.match(ipaddr.parse("3fff::"), 20);
    return true;
  } catch { return false; }
}
export function safeWebsiteUrl(raw: string, origin?: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new WebsiteIntakeError("INVALID_URL"); }
  const host = url.hostname.toLowerCase();
  if (raw.length > 2048 || url.protocol !== "https:" || url.username || url.password
    || url.port || isIP(host.replace(/^\[|\]$/g, "")) || !host.includes(".")
    || /(?:^|\.)(?:localhost|local|internal|test|invalid|onion)$/.test(host)
    || host.endsWith(".") || (origin && url.origin !== origin)) throw new WebsiteIntakeError("INVALID_URL");
  url.hash = "";
  return url;
}
export type Resolved = { address: string; family: number };
export type ResponseData = { status: number; headers: Record<string, string | undefined>; body: string };
export interface WebsiteNetwork {
  resolve(host: string): Promise<Resolved[]>;
  get(url: URL, pinned: Resolved, signal: AbortSignal, maxBytes: number): Promise<ResponseData>;
}
// Pin the validated IP at the socket lookup. TLS SNI and certificate verification use
// the original hostname; no second DNS resolution, pooling, proxy or ambient headers.
export const pinnedHttpsNetwork: WebsiteNetwork = {
  resolve: host => lookup(host, { all: true, verbatim: true }),
  get: (url, pinned, signal, maxBytes) => new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET", agent: false, signal, servername: url.hostname,
      rejectUnauthorized: true, family: pinned.family,
      lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family),
      headers: { "User-Agent": "MarketingBriefBot/1.0", Accept: "text/html,text/plain;q=0.5", "Accept-Encoding": "identity" },
      maxHeaderSize: 16_384,
    }, res => {
      let bytes = 0;
      const chunks: Buffer[] = [];
      res.on("error", reject);
      if (Number(res.headers["content-length"]) > maxBytes) { req.destroy(new WebsiteIntakeError("TOO_LARGE")); return; }
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) req.destroy(new WebsiteIntakeError("TOO_LARGE"));
        else chunks.push(chunk);
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0,
        headers: Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value])),
        body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end();
  }),
};
export async function safeRead(url: URL, network: WebsiteNetwork, signal: AbortSignal, maxBytes = 262_144, allowed: (url: URL) => boolean = () => true): Promise<ResponseData & { sourceUrl: string }> {
  const origin = url.origin;
  for (let redirects = 0; redirects <= 2; redirects++) {
    signal.throwIfAborted();
    if (!allowed(url)) throw new WebsiteIntakeError("POLICY");
    const addresses = await network.resolve(url.hostname);
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(a => !publicAddress(a.address) || isIP(a.address) !== a.family)) throw new WebsiteIntakeError("UNSAFE_DESTINATION");
    const response = await network.get(url, addresses[0], signal, maxBytes);
    if (Buffer.byteLength(response.body) > maxBytes) throw new WebsiteIntakeError("TOO_LARGE");
    if ([301,302,303,307,308].includes(response.status)) {
      if (!response.headers.location || redirects === 2) throw new WebsiteIntakeError("NETWORK");
      url = safeWebsiteUrl(new URL(response.headers.location, url).href, origin);
      continue;
    }
    return { ...response, sourceUrl: url.href };
  }
  throw new WebsiteIntakeError("NETWORK");
}
