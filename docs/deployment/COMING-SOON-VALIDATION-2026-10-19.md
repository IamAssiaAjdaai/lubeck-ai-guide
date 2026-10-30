# Coming Soon validation — 19 October 2026

Candidate manifest: [five-file patch](./coming-soon-candidate.patch), [source hashes](./coming-soon-candidate.json). Integration baseline `3679a0d6322cb7947aa185df50750f26e51fb9ab` plus this patch; no commit or push. That baseline in the build evidence is not a claim that these uncommitted changes were deployed.

## Actual checks

| Check | Result |
| --- | --- |
| Core `npm run test:run` | PASS: 238 files / 1,500 tests. 19 DB integration files / 143 tests skipped. |
| Final focused homepage, production shell, consent failure/initialization/UI | PASS: 5 files / 36 tests, after final Link change |
| Mobile `npm run mobile:test` | PASS: 93 files / 773 tests; mocked/native domain/UI evidence only |
| Full ESLint | PASS: 0 errors, 8 existing warnings |
| Next type generation + app TypeScript | PASS; regenerated after Vinext to avoid generated route-type collision |
| Cloudflare TypeScript | PASS |
| Vinext production build | PASS in secret-free temporary snapshot |
| Cloudflare bundle check | PASS: 9 pages / 7 API handlers; new homepage content assertion |
| Cloudflare binding contract | PASS: 16 preserved / 6 previously reviewed additions; no values inspected |
| Patch / diff | `git apply --reverse --check` and `git diff --check` PASS |
| Built local browser | PASS: 320 / 390 / 768 / 1440 widths, one h1, conditional date, no overflow, canonical origin, no form/video/iframe/fake store links, zero page errors or outbound requests |
| Preserved local routes | HTTP 200: `/privacy`, `/terms`, `/imprint`, `/support`, `/account-deletion`, `/explore`, `/robots.txt`, `/sitemap.xml` |
| Database | Committed migrations applied only to fresh generated `cw_teaser_*` loopback DB; DB removed afterward. No existing development or production DB mutation. |

[Machine evidence](../qa/coming-soon-2026-10-19/browser-evidence.json), [mobile screenshot](../qa/coming-soon-2026-10-19/coming-soon-320.png), [desktop screenshot](../qa/coming-soon-2026-10-19/coming-soon-1440.png). Desktop and 320px screenshots visually inspected; all four widths automatically checked. This is Chrome desktop emulation, not iPhone/Android device proof.

Temporary snapshot copied tracked source and the new page files, excluded private environment files and used an explicit child environment allowlist. The tracked `.env.example` was copied from Git for the test that reads that public template. No owner identity or provider credentials loaded. Local Worker used a distinct name, synthetic auth and loopback Hyperdrive. Browser requests outside loopback were blocked; zero attempted external requests in the successful run. Generated Worker configuration was restored and local server stopped after rehearsal.

Initial failures were investigated, not counted as passes: old homepage expectation and built-content assertion; Next internal-link lint rule; absent tracked template in test snapshot; mobile workspace package symlink pointing at original checkout. Corrected tests/harness and reran relevant checks. Initial browser attempts failed because the shared Worker unconditionally requires/connects Hyperdrive before rendering even `/`; a disposable DB resolved that without modifying production code. Canonical trailing-slash normalization was a harness correction. No evidence of a production incident.

## Performance and remaining acceptance

The new component has no client directive, state/effects, data fetch, raster media or additional SDK. Existing shared layout and analytics consent consumers still ship. Local full-page resource transfer measured **1,299,121 bytes**, DOMContentLoaded **37.1 ms** in one desktop run: these are local development-preview transport figures, not production compression, mobile-network results, LCP/CLS/INP, a Lighthouse score or a performance SLA. Shared-shell payload and the existing unconditional DB connection remain material performance/availability considerations. Measure compressed cold loads, mobile throttling, LCP/CLS and interaction behavior on the production-based candidate before accepting “fast”; isolate any shared-shell optimization as its own reviewed change.

READY: homepage implementation and checks above. BLOCKED: exact production baseline/artifact verification, production-based candidate regression, legal/operator/support-operation approval, security review and separate explicit deployment approval. Legal links point to existing pages; HTTP 200 is not legal clearance. No private operator values or deliverability check used. Incomplete configuration was used in browser acceptance; synthetic legal configuration cases are covered by existing core tests, not repeated as a browser state matrix here.

NOT TESTED in this task: live auth callbacks, real API/account ownership flows, real universal/app-link association verification, provider erasure, live PostHog, provider purchases, iOS/Android physical devices, Safari/Firefox and production Core Web Vitals. APIs/auth/association resources and existing saved-city route code are unchanged; core/bundle checks provide limited regression evidence, not end-to-end production proof. The deployment plan requires their isolated acceptance on the exact production-based candidate. No production request, provider event, payment, erasure, deployment, merge, DNS change, cron activation or Actions billing change.

No schema changes; `db:generate`/`db:verify` and DB integration suite were not rerun for the homepage. `db:migrate` succeeded only in the disposable browser database. Alternate Next production build and native signing/build/submission were not run. See [release plan and platform gates](./COMING-SOON-RELEASE-2026-10-19.md).
