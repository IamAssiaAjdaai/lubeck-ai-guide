# Ask CITYWALK — edge identity and free-launch provider budget

Scope: security hardening #348; initial branch `fix/guide-edge-identity-global-budget-348`. The native/web user-facing guide and verified-knowledge source contract remain unchanged.

## Three independent controls

1. **Abuse rate:** at most 10 AI guide requests per 10 minutes per validated Cloudflare client address via the existing PostgreSQL HMAC + advisory-lock limiter. Only a Worker runtime explicitly configured as `CITYWALK_DATABASE_RUNTIME=hyperdrive` may use the `CF-Connecting-IP` header; never trust `X-Forwarded-For` or `X-Real-IP`. Missing/invalid/untrusted identity shares the intentionally restrictive `unattributed` key.
2. **Traveler daily allowance:** pre-existing 3 free answers/24h per visitor ID, or 20 for a server-confirmed paid entitlement. Visitor IDs are user-controlled and alone are **not** a security/cost boundary.
3. **Global Groq attempt budget:** maximum **120 completion attempts within rolling 24 hours across the entire application**, independent of IP, visitor ID, city, auth and entitlement. Every model attempt, including a grounding retry, reserves an atomic database slot **before** calling Groq. Exhaustion returns HTTP 503, `guide_global_budget_exhausted`, `Cache-Control: no-store`, and `Retry-After`. Database failures fail closed.

All three controls reuse the existing PostgreSQL rate-limit table and existing schema. No migration and no extra secret required.

## Operational limitations and checks

- This is an **attempt ceiling, not a guaranteed euro/dollar spending cap**. Configure Groq project/provider usage and billing alerts/ceilings separately where supported; verify token-cost behavior and incident shutoff before the 28-day free launch.
- A malicious client can rotate IPs or use Cloudflare subrequests; rate limits are abuse reduction, not bot proof. Confirm the edge trust boundary, WAF configuration, and Worker routing on an **isolated Cloudflare Preview**.
- Cloudflare documents special same-zone/cross-zone Worker subrequest rules for `CF-Connecting-IP`. Do not use or rely on an arbitrary proxy forwarding header on alternate hosts.
- A missing/malformed edge IP intentionally groups callers under the common `unattributed` limiter: privacy/safety is prioritized over unlimited service. Monitor false positives on IPv4/IPv6/NAT and investigate if Cloudflare fails to pass edge metadata into the vinext handler.
- Both DB limits and the provider budget reserve slots on failed attempts to prevent billing abuse. A grounding retry can use two global slots for one traveler answer.
- When model provider budget is exhausted, frontend should degrade gracefully; do not advertise uncapped 28-day AI access.

## Manual acceptance before merge/deploy

- [ ] Verify current HEAD CI, typecheck, targeted guide tests and PostgreSQL rate-limit integration tests.
- [ ] With **isolated Preview data only**, verify genuine Cloudflare IPv4/IPv6, forged forwarding header behavior, and a realistic client lacking an edge IP.
- [ ] Exercise global budget exhaustion through injected test configuration/mocks, **not by burning production/provider calls**.
- [ ] Confirm 503/retry messaging in iPhone/Android guide and that tours remain usable without AI.
- [ ] Validate existing verified-knowledge/RAG/paid-access and legacy browser QA paths.
- [ ] Configure provider-side usage alerts/controls and record operator signoff separately.

Cloudflare header docs: https://developers.cloudflare.com/fundamentals/reference/http-headers/
