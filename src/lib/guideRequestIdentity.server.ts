import "server-only";

import { isIP } from "node:net";

/**
 * Only Cloudflare's own edge can be trusted to identify the visitor.
 * Never derive an abuse-control identity from client-supplied X-Forwarded-For,
 * X-Real-IP, visitorId or an unverified runtime pretending to be the Worker.
 *
 * The unattributed fallback deliberately shares an abuse quota rather than
 * trusting arbitrary headers on localhost or an alternate preview host.
 */
export function getTrustedGuideAbuseIdentifier(
  headers: Pick<Headers, "get">,
  databaseRuntime = process.env.CITYWALK_DATABASE_RUNTIME,
): string {
  if (databaseRuntime !== "hyperdrive") return "unattributed";

  const candidate = headers.get("cf-connecting-ip")?.trim();
  if (!candidate || isIP(candidate) === 0) return "unattributed";

  return `cloudflare:${candidate.toLowerCase()}`;
}
