# Website intake implementation / 2026-10-21

Scope: #399 host-side ingestion, local synthetic QA only. SaaS UI/backend integration is a subsequent branch. No customer endpoint added to CITYWALK. Mobile Core, iOS, Android, Public Web and Admin Web are not applicable; independent SaaS host is required.

## Audit

Source branch `feat/mkt-mvp-01-website-intake` at `d080f51`. Its four untracked websiteIntake files were copied into an isolated checkout, leaving originals unchanged. The original ten tests are retained byte-for-byte. Existing landing/legal work in the main checkout is untouched.

Remote PR metadata checked: #364, #383, #385 and #386 are open unmerged Drafts. Dependencies: #383 → #385 → #386. #364 uses CITYWALK staff identity/persistence and is not an external SaaS backend. #386 contains only an isolated DB compose file and README. No real auth or tenant backend exists in those drafts. Existing @marketing/core schemas, adapter, explicit fact confirmation and revision contracts are reused. #329/#330/#319/#378/#379/#384/#399 read for scope; this local intake slice does not complete them.

## Security boundaries

Only explicit public HTTPS origins on port 443; credentials, IP literals (including alternate spellings), local hostnames and non-HTTPS are rejected. All DNS answers must be public unicast; IPv6 is further limited to global space excluding reserved/transition/documentation ranges. Every redirect remains same-origin and gets fresh DNS validation. The actual TLS request's socket lookup returns only the validated address, with original-host SNI and certificate validation. No ambient cookies, authorization, proxies, pooled sockets, assets or website JavaScript.

One homepage plus at most two selected pages; each ≤256 KiB, robots ≤16 KiB; at most two redirects per request; eight seconds for the complete operation; sequential page fetches, two imports per process, one request batch per origin per minute, bounded origin cache. The authenticated host must also enforce distributed tenant/user limits. Robots denial and X-Robots-Tag are handled conservatively. Parser excludes scripts/templates/forms/navigation/footer/explicit hidden content, returns ≤8 verbatim candidates per page, never AI interpretation. Description/title are unverified source metadata. CSS rendering, independent truth verification and full DLP are not claimed.

Evidence stays an unconfirmed proposal. Missing audience/tone/goals remain gaps. Instruction-like text is filtered defensively, but no lexical filter proves prompt-injection immunity: the security boundary is that this module never invokes a model, executes text or grants approval. No raw HTML is returned or stored. No source bodies/URL secrets are logged. A future host persists only selected evidence and must provide deletion and retention controls before customer use. Manual brief reuses rawBusinessBriefSchema and is always available to the host after import failure.

## Test evidence

Original ten tests plus hostile URL/DNS/redirect/byte/timeout/robots/visibility cases and an explicit actual HTTPS lookup/TLS-configuration test. Full suite counts, lint/typecheck/build outcomes are recorded below after execution. Skipped DB suites are not integration passes. No root DB migration is run against ambient configuration. No production DB/service, provider request, email, billing, deployment or merge is involved.

Executed baseline: original tests plus security/transport tests **57 passed**; full repository **1,497 passed / 133 skipped** before the final transport-only test was added; lint **0 errors / 8 existing warnings**; `next typegen` and `tsc --noEmit --incremental false` passed. Default Turbopack build stalled and was terminated; supported webpack build is recorded separately.

`db:generate` exposed pre-existing snapshot drift: generated 0027 attempted to recreate shared_walk_links already in committed 0026. Generated SQL/snapshot were inspected and removed; journal restored byte-for-byte. No unrelated schema repair is included. Root `db:migrate` / `db:verify` are not applicable to this schema-free slice and were not pointed at ambient databases.

Production build result: `next build --webpack` compiled successfully in 14.5s, then failed generated route type checks because unchanged CITYWALK page exports `GenericPlaceContent` and `GenericCityContent` are invalid App Router exports. Build is **not green**; keep Draft. `tsc` passed before webpack generated these stricter validators. No type check is disabled.
