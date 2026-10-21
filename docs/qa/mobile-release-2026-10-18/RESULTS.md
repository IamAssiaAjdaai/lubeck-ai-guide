# Automated evidence — 18 October 2026

Local Node 22.23.3 / npm 10.9.9. Baseline `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`; SDK alignment/preflight changes were present for final mobile checks. Root runtime was unchanged. Tests ran in the dedicated worktree before the Draft PR commit. No accepted binary or deployed backend is implied.

Raw evidence is local at `/tmp/citywalk-release-20261018/`; temporary files are not durable CI artifacts. This report preserves actual outcomes. Do not attach raw logs publicly without reviewing PII/environment content.

| Check | Observed result |
| --- | --- |
| Mobile baseline tests / typecheck | 93 files / **773 tests passed**, no skips; TypeScript passed |
| Baseline Expo Doctor | **20/21**, exit 1: @expo/ui, expo, router, widgets patch mismatches |
| SDK alignment | `npx expo install --fix` applied compatible SDK 57 patches; no forced audit fixes/downgrades |
| Final mobile Doctor | **21/21**, exit 0 |
| Final mobile lint / TypeScript | Both passed; lint max-warnings=0 |
| Final language check | 681 keys each DE/EN/DA/SV/NL/ES/AR, zero errors; AR experimental/non-blocking |
| Final mobile tests | 93 files / **773 passed**, no skips |
| New beta preflight tests | **18 passed**, no skips; unsafe/mismatched/expired/absent approval and wrong profiles rejected |
| Missing-approval CLI probe | Failed closed, no network, no manifest/secret content echoed |
| Existing local toolchain tests | **4 passed** with temporary explicit Vitest config |
| Root tests | **1,441 passed / 133 skipped**, 231 passed / 19 skipped files. DB-gated skips are not integration success |
| Root lint | Exit 0; **8 existing warnings**, no errors |
| Root TypeScript | Initially missing generated PageProps/LayoutProps in fresh checkout; **passed after Next build** generated route types |
| Root build | Next 16.3.8 production build passed with synthetic loopback DB/auth configuration |
| Cloudflare build | `build:vinext` passed; no deployment |
| Cloudflare bundle check | Passed: 9 pages, 7 API handlers; baseline revision |
| Cloudflare bindings / types | Passed: 16 preserved bindings, 6 reviewed additions; no secret values inspected; typecheck passed |
| db:generate | **Semantic gate failure despite exit 0:** generates duplicate CREATE TABLE shared_walk_links as 0027, while committed 0026 already creates it; latest existing snapshot is 0025 |
| Drift handling | Inspected and removed only QA-generated 0027 SQL/snapshot/journal edit; no migration committed or drift repair attempted |
| db:migrate | Clean committed-migration rerun passed on disposable loopback PostgreSQL 16; first attempt exited before completion without diagnostic |
| db:seed / CMS import | Passed only in disposable QA database: initial 1 city/25 places; 175 authored place localizations, 1 tour/5 stops |
| db:verify | Passed before integrations (1 city/25 places), after integrations (2 cities/44 places including fixtures) |
| Rate-limit integration | Passed sliding windows, keyed identifiers and concurrent atomicity |
| Lifecycle integration | **25 passed** / 4 files (deletion, erasure worker, web deletion, data export) |
| CMS integration | **23 passed** / 3 files |
| Content integration | **6 passed** |
| Media integration | **7 passed**; not live storage acceptance |
| Commerce integration | **13 passed**; no live billing |
| Knowledge integration | **1 passed**; DB trust check, not live model factual acceptance |
| Expo Preview config | Passed with non-routable `https://candidate.invalid` syntax fixture |
| Expo export, both platforms | Passed: iOS ~7 MB and Android ~7.2 MB Hermes bundles; no installable/signature evidence |
| expo prebuild --no-install | Passed; generated ignored native projects; no pod/Gradle/Xcode compilation |
| Native toolchain readiness | Both READY: Xcode 26.6, CocoaPods 1.17.0, Java 17.0.20.1, Android SDK/adb found |
| Native manifest inspection | No microphone recording; iOS location/fetch modes, no background narration; dev/unused declarations require final Release audit |
| Physical device / emulator UI / Lübeck field | **Not run**, no device PASS recorded |
| Exact baseline SHA workflow lookup | GitHub returned no runs; no green CI claim. #387 reports runner allowance blockage |
| Hosted migration/restore/monitoring | Fresh full execution and operator evidence still required |
| Diff whitespace | `git diff --check` passed; no generated native/env/signing/schema artifacts in selected change set |

The initial mobile lint failure resolving resolve/sync occurred while root dependencies were installing; rerun after install passed without weakening lint. An extra toolchain-test probe incorrectly used Node's test runner on an existing Vitest file; another root filter found no tests because mobile is excluded. Correct temporary explicit Vitest configuration passed all 4 tests. These invocation errors do not change the 773-test native result.

## Dependency advisory triage

Fresh post-alignment `npm audit --json`: **0 critical, 21 high, 11 moderate (32 total)**. Inherited dependency findings are not 32 demonstrated independent exploits. No blanket exception is approved.

| Advisory root | Observed context | Required disposition |
| --- | --- | --- |
| brace-expansion, high | Six resolved copies under ESLint/config/import/react and root; hostile expansion resource exhaustion | Review existing #374 rather than silently duplicate it; current candidate still affected |
| braces, high | Pattern matching/Metro tooling chains; nested-pattern stack exhaustion | Establish build-input reachability; compatible patch or time-bounded owner-approved exception |
| node-forge, high | Expo code-signing certificate dependency; RSA signature verification advisory | Signing/tooling integrity review; not waived as dev-only |
| decode-uri-component, moderate | Resolved 0.2.2 through query-string 7.1.3 / Expo Router 57.0.28 | Potential external deep-link input; malformed-percent negative QA and compatible upstream fix or justified bounded exception |
| uuid, moderate | Old resolved v7 in tooling chains; supplied-buffer bounds advisory | Inspect exact callers before declaring exploitability/unreachability |
| Expo/MapLibre/RN/purchases/reanimated/worklets aggregate high entries | Inherited chains, not direct proof of native library exploit | Trace advisory roots to runtime/build use; do not accept npm's suggested Expo 44/RN 0.72 downgrade |

For each exception record advisory, locked version, entry point, reachability, mitigation, owner and expiry. Repeat audit/checks/native rebuild after dependency changes. Existing #374 reports a different count on its own head; that is not this candidate's scan.

## Artifact and approval boundary

No EAS cloud build, upload, TestFlight/Play submission, production API request/deployment, live DB change, DNS/billing/secret modification or merge was performed. Store and device results remain unverified. Native prebuild generated local-network/Bonjour, Face ID/motion and Android overlay/storage declarations; review actual Release manifests before submission, rather than assuming config-unit tests prove their absence.

The final local report write was blocked because the automatic approval-review service hit a usage limit, not because it determined the write unsafe. The completed files were read without mutation and the requested remote Draft PR prepared through the authorized GitHub connector. The managed worktree retains its uncommitted files at the baseline commit; the remote Draft PR commit is the canonical review candidate. This RESULTS.md is included in that remote commit and was not written into the blocked worktree.

Disposable PostgreSQL container `citywalk-release-qa-20261018` remains local, bound only to 127.0.0.1:55438, with synthetic test data. Cleanup was not attempted through an alternative privileged path after approval review became unavailable. Operator cleanup when ready: `docker stop citywalk-release-qa-20261018` (container was started with --rm). No production resource is involved.
