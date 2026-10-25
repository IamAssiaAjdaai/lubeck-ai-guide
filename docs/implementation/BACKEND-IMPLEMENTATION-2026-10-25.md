# CITYWALK backend implementation — 25 October 2026

## Source and authority

Integration base: `develop=4a74395838d0064e1fabf21f0f4ac3b9f951ecad`. Protected production base: `main=88191e77e55a489804c49bccccf6307b5876b41d`.
Branch: `codex/backend-core-contracts`, isolated managed worktree. Original dirty checkout and all existing worktrees preserved.

GitHub preflight refreshed #438 and comments, current PR inventory, #448 and its exact-head workflow runs. #432/#434 Admin auth and #436/#437 Preview foundations are merged. #448 remains Draft at `b5a0c644ad2a7a136e59767c53f9dbb80c73b107`; four returned exact-head workflows succeeded. Its real-data policy is not integrated here and green CI does not approve provenance/rights attestations. #424's older inventory is historical.

Mobile Core: shared backend required; iOS and Android device acceptance each unverified. Public Web: preserve existing behavior. Admin Web: separate scoped publishing-queue slice. Phase A needs no visual redesign.

## Backend Implementation Matrix

Implemented means inspected source, not operational readiness. Only the validation below establishes observed behavior.

| Feature | Existing implementation / file paths | Verified working behavior | Missing functionality / uncertainty | Priority and dependency |
| --- | --- | --- | --- | --- |
| Cities/places/stories/locales | `src/lib/content/publicRepository.server.ts`, `src/app/api/content/cities/**` | Compiled local API EN/DE and real local DB integrations | Remote runtime/data provenance unverified | A; Preview acceptance |
| Historic Tour | `src/data/landmarks.ts`, `src/data/places.ts`, ordered CMS `tours`/`tour_stops` | Local API: exactly Holstentor → Marienkirche → Rathaus → Heiligen-Geist-Hospital → Buddenbrookhaus; catalog remains 25 | Public read graph previously accepted malformed/changed routes; fixed here | A; implemented locally |
| Cache/version contract | `src/lib/content/publicHttp.ts` | EN/DE ETag→304 HTTP checks | Remote CDN acceptance unverified | A; reuse existing code |
| Build My Walk | `packages/traveler-core/src/walkPlanner.ts`, `tourBuilder.ts`, native `NativeWalkFlow.tsx` | Existing automated suite | Initial explicit selections not retained as regeneration constraints; no pedestrian route provider | B; selected-place work/provider decision |
| Distance/navigation | Haversine and estimated walking speed; `mobile/src/components/NativeCityMap.tsx` straight segments | Source inspection | Illustrative line is not routed navigation; precise ETAs unavailable | B; approved provider |
| Historic execution | Native tour/place trip flows | Base uses React state only for completion | Durable visited/skipped/resume missing on base; separate local-progress slice underway | B; iOS/Android device acceptance |
| Saved routes/progress/favorites | `/api/account/saved-walks`, `src/lib/account/savedWalks.server.ts`, `src/db/travelerSchema.ts`, mobile AsyncStorage | Ownership/transaction architecture inspected | Saved route definitions deliberately exclude progress; server progress/favorites sync missing | B/E; new persistence/privacy coverage and reviewed write path |
| Admin identity | `src/lib/auth/factory.server.ts`, `adminSecurity.server.ts`, login form, 0027 | Committed migrations applied locally | Passkey/MFA tables/helpers exist but plugins/login not wired; actual session acceptance unverified | C; preserve existing auth |
| RBAC/CRUD | `src/lib/admin/authorization.server.ts`, `permissions.ts`, `content/service.server.ts`, `content/repository.server.ts` | CMS integration suites pass locally | Staff console missing; remote acceptance unverified | C; reuse working services |
| Publishing/revisions | Existing workflow, revisions/events, detail editors | Local CMS graph/transition tests pass | Central publishing queue placeholder on base; separate scoped queue underway; uniform entity revision history incomplete | C; additive UI/query |
| Sources/audit/support | Source trust/chunks and content workflow events; account export/deletion | Source inspection + offline tests | General security/admin audit, source console and user support cases missing | C/E; reviewed persistence/UI |
| Media/audio/R2 | `src/lib/media/**`, `src/lib/admin/operations/**` | Source inspected; no live provider execution | Preview bucket empty per supplied evidence; media rights/upload/playback acceptance unverified | D; licensed content and isolated R2 |
| Grounded AI | `/api/guide`, verified knowledge, `src/lib/guideAllowance.server.ts` | Existing offline suite passes | Persistent token/cost ledger and versioned admin prompts/models missing | D; code then authorized live evaluation |
| Traveler accounts/privacy | Better Auth, native client, `src/lib/auth/lifecycle/**`, erasure outbox | Source + offline tests | Native OAuth/recovery/deletion delivery acceptance unverified | E; identity/provider/device gates |
| Commerce | `src/lib/commerce/**`, entitlements/notifications, read-only Admin commerce | Existing sandbox-gated code inspected | Operational restore/refund/store verification unverified; #375 separate draft | E; Native Preview billing remains off |
| Private Preview | `src/cloudflare/nativePreviewEntrypoint.ts`, `tools/native-api-preview/**` | #448 exact-head CI verified; Hyperdrive roundtrip operator-reported in #438 | TLS verify-full, provenance/license/privacy, secrets, native PKCE/device and release approvals remain | F; keep locked |
| Reliability/operations | Health/limits/failure telemetry/outbox exist | Offline suite and local content HTTP | Complete Admin health/jobs/audit/flags/release console absent; configured storage is not live storage health | G; code + operational acceptance |

Open Draft sharing work #365/#370/#373/#377 remains separate. Do not recreate or wholesale merge it. Marketing SaaS, approved landing/legal, Android Auth0, dependency files and unfinished worktrees are preserved.

## Phase A change

`src/lib/content/tourIntegrity.ts` rejects empty routes, unavailable/duplicate stops, duplicate tour identities, non-contiguous/misordered positions and invalid visit durations. The existing Lübeck Historic Tour is checked against canonical landmark slugs; it is never replanned or expanded to all 25 places. Other tour identities/cities remain generic.

`publicRepository.server.ts` applies the guard to database snapshots and explicit canonical-code mode. Database integrity failures retain sanitized non-cacheable 503 responses. A malformed Historic Tour makes that city snapshot unavailable until corrected; the API does not silently rewrite editorial content. Development-only `auto` retains existing wholesale canonical fallback. A city without a published tour does not gain an invented tour.

New unit/PostgreSQL regressions cover healthy, empty, truncated, reordered and substituted Historic routes. Corruption tests always roll back their local transaction. The CMS runner includes these regressions. No schema/DTO/auth/RBAC/dependency/payment/production configuration changed.

## Actual validation

Disposable PostgreSQL16 container `citywalk-backend-20261025`, localhost-only port 56435, DB `citywalk_backend_local`. No remote DB/environment files used.

| Check | Actual result |
| --- | --- |
| Focused tests | 33 passed |
| Full unit suite | 1,916 passed / 244 skipped; 269 files passed / 28 skipped |
| Lint | Pass; 0 errors / 15 existing warnings |
| TypeScript | Pass after build generated Next types; initial clean-checkout run lacked PageProps/LayoutProps |
| Default Next build | Pass with synthetic local build settings |
| db:generate | Pass; no drift/migration |
| db:migrate | Pass; only disposable local DB |
| Seed + CMS import | Pass; 25 Lübeck places, 175 authored localizations, five tour stops |
| db:verify | Pass; canonical two-city catalog |
| CMS integration | 28 passed across four files |
| Generic city integration | Six passed |
| Compiled local HTTP | EN/DE 200, 25 places, exact five Historic stops; ETag→304; invalid locale→400; missing city→404 |
| diff check | Pass |
| Native device/live AI/Preview runtime | Not run; unverified |

No remote mutations, deployment, DNS, billing, secret or lock changes. No operational-readiness claim; skipped tests are not integration passes. Source-only rollback is revert of the change; no data migration to undo.

## Remaining work and publication

This is partial execution of the full backend request. Historic local progress and scoped Admin queue are separate slices. Selected-place regeneration, backend progress/favorites sync, unified audit, full Admin support/operations, wired MFA, AI cost/configuration and external release gates remain. A write-capable Preview environment requires explicit review/authorization; never broaden the current read-only runtime role implicitly.

Automatic approval review rejected the attempted commit: it interpreted Draft PR authorization as insufficiently explicit permission for commit under AGENTS.md. The rejected command did not execute. No commit/push/PR occurred during local validation. The owner subsequently explicitly authorized committing/pushing these three branches and creating Draft PRs; merge and deployment remain unauthorized. Main/develop and production settings remain unchanged.
