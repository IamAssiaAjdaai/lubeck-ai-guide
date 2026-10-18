# CITYWALK native release readiness — 18 October 2026

**Decision: NO-GO for RC acceptance or public release. Controlled beta preparation only.**

Scope: #387 execution tracker, #187 canonical checklist, #112 acceptance, #33 beta, #34 release, #128 metadata, #129 screenshots. Issues were read from GitHub on this audit date. Mobile Core: required on iOS and Android. Public Web: required only for acquisition, intentional previews, app handoff, legal/support/account management. Admin Web: required for publication/security operations, not native UI replication. Lübeck is the validation city; preserve multi-city identity. Launch UI languages: EN/DE/DA/SV/NL/ES. Arabic/RTL remains experimental, non-blocking for v1.

## Candidate and evidence boundary

- Latest fetched `origin/develop`: `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`.
- Dedicated branch: `codex/mobile-release-readiness`, separate managed worktree. Original develop checkout and its untracked review directory were preserved.
- This branch contains SDK 57 patch alignment, a read-only beta configuration check, its negative tests/CI step, and these release documents. No traveler feature, schema, entitlement, RAG, audio or permission behavior was changed.
- The Draft PR head is the QA candidate, **not an accepted signed RC**. Record its full SHA with `git rev-parse HEAD` in the build evidence record. Any runtime/dependency/config change invalidates affected binary acceptance.
- No physical iPhone, Android, simulator UI flow or Lübeck field acceptance was executed in this audit. No approved backend origin, EAS environment inspection, current signed artifact or store console access was supplied. Historical screenshots/builds under other QA folders do not establish acceptance of this candidate.
- No EAS build/upload, TestFlight upload, Play submission, production API request/deployment, live DB operation, DNS, secret or billing modification was performed.

## Scorecard

This is an evidence scorecard; automated source coverage is not native acceptance. No percentage implies release approval.

| Gate | Implementation/local evidence | iOS acceptance | Android acceptance | Exit requirement |
| --- | --- | --- | --- | --- |
| Native shell/shared domain | Expo Router + RN + traveler-core/i18n, native MapLibre | Unverified | Unverified | Install exact candidate; complete matrix |
| SDK 57 compatibility | Baseline Doctor 20/21; patch-aligned 21/21 | Binary unverified | Binary unverified | Fresh native compilation/signature inspection |
| Home→Finish→Save | 773 mobile tests pass; native bridges mocked | Unverified | Unverified | Full guest journey, account save, restart, feedback |
| Preview backend isolation | Runtime HTTPS checks exist; new operator-evidence preflight | Blocked | Blocked | Approved isolated HTTPS deployment + DB/storage/provider evidence |
| GPS/maps/adaptation | Native source and unit/interaction tests exist | Unverified | Unverified | Permission/lifecycle + Lübeck field walk |
| Narration | Exact-locale rules; foreground audio only | Unverified | Unverified | Human foreground/interruption QA; resolve background scope |
| Auth/erasure | Better Auth Expo/SecureStore + server lifecycle | Unverified | Unverified | Real callback/session/delete + provider erasure evidence |
| AI trust/cost | Verified corpus/provider boundaries present | Unverified | Unverified | Live grounded/insufficient/503 tests; #354 safety gate |
| Accessibility/languages | 681 keys per locale, zero catalog errors | Unverified | Unverified | Six locales, largest text, VoiceOver/TalkBack |
| Stores/legal/media | Icon files + privacy inventory/draft exist | Blocked | Blocked | Approved declarations, metadata, native screenshots, URLs |
| CI/operations | Local evidence in RESULTS.md; backend gates incomplete | Blocked | Blocked | Exact-SHA CI + backend recovery/monitoring sign-off |

## Architecture/config audit

`mobile/` owns native React Native screens and Expo Router routes, not a WebView. `packages/traveler-core` owns shared planner/adaptation/eligibility rules; `packages/i18n` owns catalogs. `mobile/src/lib/api` validates DTOs and fixes the backend origin at build time. PostgreSQL/Drizzle, CMS publication, media approval, auth authorization, verified RAG and entitlements remain server authoritative. Current backend is Next.js/vinext targeting Cloudflare; the original `NATIVE_APP_SHELL.md` is historical and contains obsolete Vercel-only Preview, foreground-only location and future-audio descriptions. Current app/config and newer deployment docs take precedence over that historical description.

SDK 57 targets RN 0.86 / React 19.2.3. The locked app uses RN 0.86.3, React 19.2.3, TypeScript 6.0.3 and Node 22.23.3 for this audit. [Expo's versioned reference](https://docs.expo.dev/versions/v57.0.0/) lists Node 22.13+, iOS 16.4+, Xcode 26.4+, Android 7+, compile/target SDK 36. Native library effective minimums and actual generated/signed artifact manifests must also be inspected; an SDK table is not proof of store acceptance.

Configuration: `com.citywalk.app.dev` in development; `com.citywalk.app` for Preview/store-beta/production; version 1.0.0; portrait, light UI, iPad support currently enabled. EAS project `assixacity/citywalk-mobile` / `ce652902-908a-4e73-8c2c-9ee5aafbfd53`. EAS uses remote app version state and auto-increments beta builds. No remote build-number state was read or changed. Universal/App Links claim `getcitywalk.com` for `/open/` in current native config; shared-walk native handling is a draft feature, not this release baseline. Preview and production use the same identifier, so installing beta may replace an existing install: back up test evidence, use dedicated test accounts and verify upgrade persistence.

Native flags: audio recording/microphone and background narration disabled; iOS background location enabled for opt-in Premium Live Walk; Android background location disabled. This is an intentional platform capability difference requiring explicit scope acceptance if enabled. Native observability dispatch is hard-disabled on SDK 57. Do not enable it to manufacture monitoring evidence. Local toolchain readiness passed (Xcode 26.6, CocoaPods 1.17.0, Java 17, Android SDK/adb present); no native compilation or device installation is implied.

## Prioritized blockers and next owners

| Priority | Evidence/finding | Required next action / owner |
| --- | --- | --- |
| P0 beta | No approved isolated backend/environment record available | Backend operator: approve HTTPS deployment SHA, isolated DB/bucket/provider test configuration, auth callbacks, media + AI readiness; complete BETA.md |
| P0 RC | No current real-device or field evidence | QA: execute MATRIX.csv separately on physical iPhone/Android and FIELD scenarios; attach build/SHA evidence |
| P0 RC | Exact-SHA CI not established; #387 reports runner quota block | Repository owner: restore runner allowance without changing billing here; obtain genuine job results. Baseline SHA workflow lookup returned no runs, not a pass |
| P0 backend | `db:generate` creates duplicate `shared_walk_links` despite committed `0026_shared_walk_links.sql` | DB owner: repair/reconcile missing 0026 snapshot metadata in a dedicated reviewed migration task. Do not ship generated duplicate 0027. No drift repair is included here |
| P0 safety | #354 global AI budget/trusted-edge hardening remains open draft | Security/backend: review, PostgreSQL + isolated Cloudflare negative tests, then explicit merge decision; do not cherry-pick blindly |
| P0 release | Legal identity/provider retention/production URL acceptance remain unresolved in existing legal drafts | Operator/legal: approve real identity, disclosures, deletion operations and live URL evidence; no fabricated identity or legal sign-off |
| P0 store | No current accepted signed binaries, native screenshot set, declarations or store metadata approvals | Release owner: complete STORE.md after native acceptance; separately authorize distribution/submission |
| P1 security | Fresh mobile npm audit: 21 high / 11 moderate / 0 critical | Security: triage actual reachability; review #374 brace-expansion patch. No forced SDK downgrade or blanket exception |
| P1 product | Background narration explicitly disabled; #112 lists persistent/background audio where supported | Product + QA: approve foreground-only v1 scope/defer #64, or deliver separate background-audio ticket before claiming support |
| P1 native | Prebuild warns Apple sign-in native module absent; EAS enables Apple/Google auth flags | Auth owner: verify current web-browser OAuth callback architecture on both devices; install no module solely to silence a warning without design review |
| P1 native | iPad enabled, no candidate iPad screenshots/acceptance; Android adaptive icon/splash unverified | Product/release: accept tablet support + QA/assets or explicitly change scope in separate reviewed config work |
| P1 access | #387 proposed 28-day free policy #347 is not evidenced enabled/implemented here; paid access is deferred | Product/backend: prove server-authoritative launch eligibility/default-OFF policy; beta must not accidentally activate checkout/billing or QA unlocks |

Zero unresolved Blocker/Critical defects and an explicit decision on Majors are required by #112. Missing evidence is unverified, not an observed UI defect. Prepare a signed RC only after backend safety/CI readiness, then run the full matrix on those exact artifacts before GO. No publication is authorized by this report.

## Handoff

See [automated results](RESULTS.md), [device matrix](MATRIX.csv), [beta procedure](BETA.md), [store checklist and draft copy](STORE.md), and [draft PR review](DRAFT-REVIEW.md). Schema/API/RBAC/import behavior is unchanged. Guest-first exploration, server trust boundaries, exact-locale audio and private local feedback are preserved. Commit/push are authorized only to deliver the requested focused Draft PR targeting develop; no merge is authorized.
