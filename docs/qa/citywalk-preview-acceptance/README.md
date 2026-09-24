# CITYWALK Preview acceptance

## Initial audit (before implementation)

Branch `feat/citywalk-preview-acceptance` starts at fetched `origin/develop` (`7866154`), which includes the prior V2/data work. Working tree was clean. Existing ready Preview: https://lubeck-ai-guide-xsam5ftqz-iamassiaajdaais-projects.vercel.app (deployment `dpl_72Rj5J4B5THowyfR2jJBkk4vMgp7`, commit `78661548bccdf88dd1c5050a1682ca8730f5d3ac`). User confirmed Preview database and storage are isolated from production.

| Area | Required env/config | Local status | Preview status | Blocking? |
| --- | --- | --- | --- | --- |
| Deployment | Next.js detection, npm lockfile, Node 22, `npm run vercel-build` | Node 22.22.2, existing dependencies/build | Ready Git Preview at exact develop commit; no local CLI login/link | Updated uncommitted code needs a new deployment |
| PostgreSQL | `DATABASE_URL`, committed Drizzle migrations | Existing Docker database | Published city API returns 200 and managed media metadata; user confirms isolated DB | No for public reads; direct remote migration/env inspection unavailable |
| Content | `CITYWALK_CONTENT_SOURCE=database` | Explicit database | Managed media proves DB-backed response; no fixture substitution observed | Verify runtime routes |
| Auth / app URL | `BETTER_AUTH_SECRET`; explicit `BETTER_AUTH_URL` or validated `VERCEL_URL` + `VERCEL_BRANCH_URL` | Unique ignored local secret, localhost origin | Session and account acceptance pending | Pending runtime checks |
| Maps | Optional build-time `NEXT_PUBLIC_CITY_MAP_STYLE_URL`; default OpenFreeMap Liberty HTTPS | Earlier Python probe 403 | Browser-origin HTTP probes succeed with CORS `*` | Need browser tile/error checks |
| AI | Runtime `GROQ_API_KEY`, Upstash REST URL/token, verified DB knowledge; model configured in code | Credentials absent | Unknown; real assistant acceptance pending | Feature-specific |
| Media | Runtime S3 endpoint/region/bucket/access/secret, approved DB assets | No S3; canonical local assets | Published DB hero asset exists; delivery pending | Feature-specific |
| Payments | Runtime Stripe secret/webhook secret; price/product mappings in DB | Credentials absent | Test-mode credentials not confirmed | No live charges; sandbox acceptance blocked until verified |
| Analytics | Build-time public PostHog token/host; server commerce analytics | Optional absent | Unknown | Not core blocking |

No `vercel.json`, Node engine pin or local `.vercel` project link exists. CI uses Node 22 and `npm ci`. `vercel-build` already runs committed migrations then `next build`; no automatic editorial imports. Media is delivered through same-origin `/api/media` and entitlement-protected `/api/commerce/media` routes, not unrestricted Next image remote domains. Better Auth uses email/password (no OAuth callback provider) and exact deployment/branch hosts, plus existing native origins. Secrets remain server-only.

Vercel connector can list projects/deployments and fetch Preview. Its project-settings call has inconsistent schema validation and build-log tool reports unavailable; no secret values were requested or printed. Deployment READY does not prove runtime acceptance.

Map diagnosis: configured endpoint matches the [provider quick start](https://openfreemap.org/quick_start/). Plain Python request returns Cloudflare HTTP 403 / code 1010; requests using browser headers with localhost and this Preview origin return 200 and `Access-Control-Allow-Origin: *`. This implicates request fingerprint/provider filtering, not an incorrect style URL. Follow-up: style/TileJSON/sprites returned 200 in the browser, but basemap initialization stalled; see final findings below. Existing map code ignores tile/source errors after style load, so a loaded style can hide a failed basemap.


## Acceptance outcome (2026-09-24)

**Not yet merge-ready.** Public/auth/traveler acceptance ran on the existing READY Preview at `7866154`. The current branch's fixes are uncommitted and have only been verified locally. No commit, push, merge, production-data operation, or live payment was performed. The Vercel connector's deployment tool returns `Tool deploy_to_vercel not found`; no CLI login/token is available in this workspace. A new branch Preview must be deployed before accepting these fixes remotely.

### Verified against real Preview

- Anonymous Home → Lübeck → Explore → Holstentor → planner → loading → preview → active walk; Read and Listen navigate to the real place and preserve the active session. Confirmed skip removes the stop without adding it to visited history. Shorten requires confirmation. Return to trip start requires confirmation; Finish clears the active trip. Saved walks survive reload and saving the same generated walk twice does not duplicate it.
- Return-by 17:45: 11 real published stops, 446 minutes, ~3.3 km, estimated finish around 17:30 and 14 whole minutes buffer. Calculation uses the actual generation timestamp, route visits and estimated walking legs. The browser timezone was Europe/Berlin. Distances are straight-line estimates with a walking-speed assumption, not live street directions. A target less than two minutes ahead returns the existing no-route state and creates no active session.
- Loading screenshot captures the real processing state by temporarily holding its animation-frame continuation, then releasing it. No artificial success data was supplied. A separate injected client processing exception shows the existing retry/back-to-city error state. Missing city and place URLs return 404; an unavailable Hamburg cannot enter a trip. Home still lists Lübeck, Hamburg and Düsseldorf with correct availability.
- Account creation, email/password login, session persistence after reload and logout passed. After logout, guest-link returns 401. The deployment and branch origins reach credential validation (401 for deliberately nonexistent credentials); a foreign origin returns 403. See `auth-origins.json`. No session-token values or passwords are retained. Synthetic account `citywalk-preview-1790236199@example.invalid` remains in the isolated Preview database; remove it through authorized account administration when finished.
- German Holstentor audio plays (72.7 seconds, advancing playback). EN/AR show exact-locale unavailability, without substituting German. Aborting the German audio request shows the existing localized unavailable state, and free navigation remains accessible.
- DE 320×740, EN 430×932, AR 390×844 and AR 768×1024 city hubs and planners have no horizontal overflow. Active screens were also checked at these widths and DE tablet 768×1024. Arabic interface uses `main[lang=ar][dir=rtl]`, with English content fallback explicitly marked LTR/English. Root HTML remains English, but localized content has its own language/direction scope. Bottom navigation remains fixed; lower controls are scrollable.

### Changes prepared locally

- Keep OpenFreeMap. A style-loaded event no longer cancels the full map startup timeout. Denied source/tile requests and repeated source failures enter the calm fallback. Retry recreates markers. The traveler retains current-stop context, remaining-stop links/durations, itinerary, Read/Listen and external Navigate.
- Add saved-walk removal with refresh persistence, cross-tab refresh, storage-error feedback, and city-qualified identity so equal IDs in different cities do not overwrite/remove each other. Account cloud sync is deliberately not introduced; recommend a separate authenticated saved-walk sync ticket.
- Replace the invalid return-only `Stop 1 of 0` label with the localized remaining-walk label.
- Failed city/place images now use a neutral location placeholder. Remove the invisible city-hero image request from the illustrated V2 header; visible design is unchanged.
- Pin Node 22.x and explicit Vercel install/build commands. Document configuration in [environment.md](environment.md), with public build-time settings separated from server/runtime secrets.

### External blockers and limits

| Area | Evidence | Remaining acceptance |
| --- | --- | --- |
| Maps | Plain Python style fetch: Cloudflare 403/code 1010; browser headers + local/Preview origins: 200 with CORS `*`. Actual browser style, TileJSON and sprites: 200. Basemap remained blank and `loaded()`/`isStyleLoaded()` stayed false, so successful tile rendering is **not** claimed. | Request-fingerprint filtering explains the original command-line 403; the browser's stalled initialization is an additional unresolved environment/provider/worker issue. Updated local build reaches fallback after 30s, keeps trip usable and allows retry. Retry can still hit the same initialization failure. Verify final branch Preview on a normal mobile browser. |
| AI | Real `/api/guide` request carried validated remaining place IDs/interests and returned a safe 500. Vercel runtime logs show missing `UPSTASH_REDIS_REST_URL` and Redis URL/token initialization failure. | Configure both Upstash REST values securely in Preview and redeploy, then repeat place and contextual questions. Provider/model success is unverified. No fake AI success or rate-limit bypass. “I'm tired” and food-break controls are deterministic itinerary actions, not evidence of live model success. |
| S3/media | Managed city hero `/api/media/d90f55b7-14ff-4fb5-b196-b7afec17d825?variant=hero` returns safe 502, while bundled/derived public place thumbnails return 200. | Verify isolated bucket, endpoint, credentials and object existence, then exercise public/signed/entitled delivery and uploads. Cannot infer exact S3 misconfiguration from the intentionally sanitized response. |
| Payments | No confirmed Preview Stripe test-mode setup. Local DB webhook/entitlement suite runs without live charges. | Sandbox hosted checkout, success/cancel return, signed real webhook and entitlement update remain blocked. No live payment was attempted. Core free flow passes without checkout. |
| Deployment | Existing Preview READY and tested; connector deploy tool unavailable, no local Vercel CLI authentication. | Deploy this working tree/branch through an authenticated Preview workflow, then repeat screenshots and map/image/removal checks on that exact revision. |

### Performance and privacy

`performance.json` records actual Preview requests with five warm samples per endpoint. Catalog 613 B; full Lübeck content ~19.6 KB. Warm catalog/content responses usually ~28–67ms after warm-up, with CDN HIT observed; cold requests ~0.85–1.9s. Place thumbnails returned WebP (35–121 KB). Managed city hero returned 502. Browser timing is a warm, non-throttled automation observation, not Lighthouse or a cold mobile benchmark; cached scripts report zero transfer bytes, which does not mean zero bundle size. Planner runs over already loaded published data in the browser; measured completion upper bound includes automation overhead. Removed one proven waste: fetching an image hidden by CSS.

Reviewed public DTO boundaries, same-origin media authorization, validated server-side auth origins, and analytics payloads. Map/AI analytics carry city/place/category/locale and question counts, not question text, raw GPS, session tokens or provider secrets. Structured AI context can include route coordinates for the server/provider; this is distinct from analytics. No new public credentials, wildcard origins or production fallback fixtures were introduced. Sample unavailable-media/AI responses contain friendly text, no SQL, credentials or stack traces.

### Screenshot index

All `preview-*` files show the existing remote commit, not the local changes. `local-*` files show the working-tree production build. Main flow screenshots are 390×844 unless otherwise stated. Filenames carrying a width use the viewports listed above.

| State | Route | Evidence | Status |
| --- | --- | --- | --- |
| Home | `/` | `preview-home-final.png` | Real multi-city availability |
| City hub | `/en/lubeck` | `preview-city-hub.png`, `preview-hub-*.png` | Responsive; S3 hero request failure documented |
| Explore | `/en/lubeck#places` | `preview-explore.png` | Real eligible places |
| Place detail | `/en/lubeck/holstentor` | `preview-place-detail.png` | Public detail/image, exact-locale audio fallback |
| Planner | `/en/lubeck#build-walk` | `preview-planner.png`, `preview-planner-*.png` | Duration/preferences/start/end; RTL |
| Loading | same | `preview-loading.png` | Real state held briefly for capture |
| Route preview | same | `preview-route-preview.png`, `preview-return-by.png` | Real IDs and calculated deadline buffer |
| Active walk | same | `preview-active-walk.png`, `preview-map-settled.png` | Controls pass; old build can leave blank basemap |
| Assistant | same | `preview-assistant.png`, `preview-live-assistant.png` | Deterministic controls work; live AI blocked |
| Empty/error | same | `preview-no-route.png`, `preview-planner-failure.png` | Impossible budget and injected processing failure |
| Map fallback | local `/en/lubeck#build-walk` | `local-map-fallback.png`, `local-map-settled.png` | Local recovery only; requires new Preview |
| Saved | `/en/walks` | `preview-saved.png`, `local-saved-removed.png` | Save/reload remote; remove/reload local |
| Finish | `/en/lubeck#build-walk` | `preview-finish.png` | Active session cleared |
| Auth | `/en/account` | `preview-account.png` | Test account session |
| Audio failure | `/de/lubeck/holstentor` | `preview-audio-failure.png` | Injected request abort, safe UI |

Raw acceptance observations are in `browser-results.json`. Locally injected failures are labelled; none are used as evidence of successful external services.


### Final pre-commit validation (2026-09-24)

The complete suites were rerun on `feat/citywalk-preview-acceptance`, with no product/code/configuration changes during this pass. Test suites ran sequentially with one unit-test worker and the original test timeouts; no focused-only substitute, disabled assertions, or timeout increase. Results below supersede the earlier partial reruns.

| Check | Final result |
| --- | --- |
| Entire web/shared unit suite | `npm run test:run -- --maxWorkers=1`: **803 passed, 0 failed, 22 gated DB tests skipped**; **137 files passed, 5 DB files skipped**. 529.72s. All skipped DB suites were explicitly run below. |
| Entire mobile unit suite | `npm --prefix mobile run test:run -- --maxWorkers=1`: **170 passed, 0 failed, 0 skipped**, **31 files passed**. 19.69s. Initially unable to load missing `expo/tsconfig.base`; resolved by `npm ci --prefix mobile --ignore-scripts` using the existing lockfile (902 packages). No mobile source/lockfile changes. |
| Total unit tests | **973 passed, 0 failed** (803 web/shared + 170 mobile). |
| CMS PostgreSQL | `npm run cms:test:integration`: **5 passed, 0 failed**. |
| City-content PostgreSQL | `npm run content:test:integration`: **6 passed, 0 failed**. |
| Media PostgreSQL | `npm run media:test:integration`: **7 passed, 0 failed**. Local integration harness, not Preview S3 acceptance. |
| Commerce PostgreSQL | `npm run commerce:test:integration`: **3 passed, 0 failed**. Local integration harness, not live Stripe sandbox acceptance. |
| Verified knowledge PostgreSQL | `npm run knowledge:test:integration`: **1 passed, 0 failed**. |
| Total DB integration tests | **22 passed, 0 failed, 0 skipped**, all **5 suites**. Confirmed local target: `localhost:5432/citywalk`. |
| Database schema/migrations | `db:generate`: no schema changes or new migrations. `db:migrate`: passed. `db:verify`: passed, 2 cities / 44 places (Lübeck 25, Hamburg 19). No seed, import or reset. |
| TypeScript | `npx tsc --noEmit`: **passed**, exit 0. |
| Lint | `npm run lint`: **passed**, exit 0. |
| Production build | `npm run build`: **passed**, exit 0, with the existing real local DB/auth configuration. Expected optional Upstash warnings remain; no fabricated provider configuration. |
| Git/diff audit | **22 modified tracked files, 51 untracked files, nothing staged**. Reviewed 73 candidate paths and their source/configuration/QA text changes; acceptance screenshots are intentional evidence. `git diff --check` passed. No unintended generated files, newly introduced credentials, production fixture fallback or product debug code found. Only `.env.example` is a candidate environment file; its existing local Docker example is not a production secret. |
| Files to exclude | `.env.local`, `.next/`, `node_modules/`, `mobile/node_modules/`, `next-env.d.ts`, and `*.tsbuildinfo` remain ignored and must not be force-added. Temporary runner scripts/logs/screenshots remain under `/tmp`, outside the repository. No file in the reviewed change set needs exclusion. |
| Fresh-build browser recheck | **4/4 passed** at `http://localhost:3031`, 390×844: map fallback retained five real stop links and Navigate without raw errors; saved removal persisted after reload (0 remaining); failed images rendered three placeholders; return-only header read “Remaining walk”, not “Stop 1 of 0”. Image failures were triggered with nonexistent local URLs; map fallback testing is not proof of successful provider rendering. |
| External acceptance | Upstash, Preview S3 502, full map rendering and real Stripe sandbox acceptance remain unresolved and documented. No success was fabricated and no security boundary was bypassed. This pass does not deploy the branch or establish merge readiness. |

Total executed unit + DB tests: **995 passed, 0 failed**. Earlier resource-contention failures and missing mobile dependencies are superseded by the complete successful runs above. No commit or push was made.

Recommended follow-up: deploy this branch's reviewed changes to isolated Preview; repair Upstash and S3 configuration; verify map tiles on a normal mobile browser; run Stripe sandbox checkout/webhook acceptance only after test-mode confirmation. Authenticated saved-walk cloud sync is a separate ticket.


### Final local browser checks

Final production build is available at `http://localhost:3011` while the local server remains running. Pointing the rendered city images at nonexistent local URLs triggers their real load-error handlers and shows neutral location placeholders without broken images (`local-image-fallback.png`). Map failure exposes five remaining real stop links plus Navigate, without raw errors (`local-map-itinerary.png`). Return-only heading reads “Remaining walk”. A separate local process pointed at a deliberately closed localhost database port returns HTTP 503 `{ "error": "Content is temporarily unavailable." }`, and the page shows a retry action without connection details (`local-db-outage.png`). No real database was stopped or modified to simulate this outage.

Screenshots `local-map-itinerary.png`, `local-image-fallback.png`, and `local-db-outage.png` are from the final local build, 390×844. Existing earlier `local-map-fallback.png`/`local-map-settled.png` precede the additional remaining-stop list and are retained as diagnostic evidence.
