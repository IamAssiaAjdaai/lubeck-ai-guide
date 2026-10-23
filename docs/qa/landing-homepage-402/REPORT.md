# Approved #402 landing as homepage — preparation only

Based exactly on approved commit `4a2586aab5a440254be6cfd57945d677481d4264`. Branch: `codex/landing-homepage-402-20261021`. Public Web required; no Mobile Core/Admin Web functional changes. **Production NO-GO. No merge/deployment or production infrastructure access.**

## Implementation

- Move `Navbar.tsx`, `Footer.tsx`, `cities.tsx`, `sections.tsx` and `landing-next.module.css` from the preview route to `src/components/landing-next/` without changing a byte. `LandingNext.tsx` extracts the original composition unchanged.
- Both `/` and `/landing-next-preview` return the same reusable `LandingNext` component, retaining all nine approved sections, brand/logo, illustration, source-controlled city availability, internal destinations, menu/FAQ behavior and disabled prelaunch store links.
- `/` now describes the approved headline with an honest prelaunch description, canonical `https://getcitywalk.com/`, index/follow, matching Open Graph/Twitter metadata and a first-party 1200×630 PNG social image. The social image uses the existing authentic SVG mark and approved headline; it adds no legal identity, social handles, ratings or availability claims.
- The preview retains noindex/nofollow and canonicalizes to `/`. Robots additionally disallows the new preview path. Existing sitemap behavior, including withholding unconfigured legal pages, remains unchanged. Noindex/robots are not access controls.
- Update the existing homepage/SEO tests and only the homepage headline assertion in each of two smoke scripts. No assertions are removed. The original `/landing-preview` and all original LandingPreview files are preserved.

## Actual focused verification

| Check | Result |
| --- | --- |
| Presentation integrity | PASS — all five relocated presentation files byte-identical to #402; original JSX composition preserved |
| Pixel parity | PASS — `/` and `/landing-next-preview` versus approved #402 preview, at 320/390/768/1024/1440/1920px: 12/12 comparisons, **zero differing pixels**, equal full-page dimensions |
| Homepage/explore, SEO/sitemap, support, associations, store guards | PASS — 35 tests in five existing affected suites |
| Native handoff rules | PASS — three additional existing unit tests; **38 total focused tests** |
| TypeScript | PASS — full project with fresh generated route types |
| Lint | PASS — changed homepage/preview/shared components/tests/robots and both updated smoke scripts; zero warnings |
| Full Next.js build | PASS — `next build --webpack`, full type checking, **785/785** static pages, optimization/traces; no route filtering or error suppression |
| Existing launch-route smoke | PASS — nine page routes, content/auth endpoints, unauthenticated export rejection, legal noindex/canonical/reflow and dropped unauthenticated analytics event |
| SEO in rendered HTML | PASS — root title/canonical/indexing, OG/Twitter asset URLs, decoded 1200×630 image; preview canonical/noindex and robots output |
| Native route runtime | PASS — unconfigured `.well-known` associations remain 503; syntactically safe `/open/...` returns 200 with the exact same native scheme URI as #402 |
| Browser errors / external requests | PASS — zero in focused parity/SEO checks |
| Whitespace | PASS — checked including newly added source files before commit |

The `/open/...` route is intentionally a safe-segment app handoff and does not validate whether its marketing slug is published. Its existing status/URI were checked against the approved baseline, rather than imposing a new 404 behavior. No native route source changed. Physical-device/native-store acceptance is not claimed.

Open Graph root URLs are normalized by Next to `https://getcitywalk.com`; the canonical is `https://getcitywalk.com/`. These identify the same root resource and were checked semantically.

## Test isolation and provenance

A fresh local snapshot excluded `.env*`, prior generated types and nested review checkouts. It used curated code content, fresh synthetic process-local auth configuration, an unreachable loopback database placeholder, disabled telemetry and bundled local root-font fixtures. Node guards blocked database/external connections. Browser requests were restricted to the loopback candidate and approved baseline. No DB was provisioned, queried or mutated; no real providers/secrets were used.

Acceptance ran against the completed local production-mode Next server to avoid development hot-reload interruptions. A development-mode attempt was not accepted as evidence. This is local Webpack/Chromium verification, not remote CI, a Cloudflare upload/acceptance, a production schema check or proof of production compatibility.

`results.json` preserves sanitized actual results; `manifest.json` records source/capture/asset hashes. Raw PNGs, development attempts, build outputs and disposable helpers remain ignored locally. Existing #402 audit files and screenshots are untouched.

[Homepage at 390px](homepage-390.webp) · [Homepage at 1440px](homepage-1440.webp)

## Review and remaining gates

The Draft PR targets `develop` per repository workflow and explicitly depends on unmerged Draft PR #402. Its homepage-only commit/compare is identified separately for focused owner review; it does not merge #402.

1. Owner review of homepage metadata/social presentation and required CI on the final commit; keep Draft until separately authorized.
2. Private legal/operator/support readiness and approval remain a separate launch gate. Existing legal pages still advertise their unconfigured status in this isolated environment.
3. Production backend/source/schema compatibility, Worker acceptance, rollback and final explicit owner GO remain separate release gates. No API/auth Worker configuration changed.
4. Genuine iOS/Android listings and physical-device native acceptance are required before enabling store links; prelaunch labels remain honest meanwhile.

No production deployment or merge is authorized by this preparation.
