# CITYWALK release-candidate security and CI review — 2026-10-18

Decision: **NO-GO for the release security gate.** This is an evidence snapshot, not production clearance. Scope: #387, #187, #348; PRs #374, #354, #376. No merge, production deployment, billing, repository-policy or secret changes.

## Reproducible scope

- Freshly fetched `develop`: `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`; independently verified through the GitHub branch API.
- Isolated worktree; branch `codex/rc-security-readiness-387` based on that SHA. Original checkout/untracked preview directory preserved.
- Mobile Core: required (shared API security and compatible dependency assessment). iOS and Android: JS validation recorded separately from device acceptance; neither platform has new device acceptance in this review.
- Public Web: required for shared guide/API checks; Admin Web: required for dependency/media exposure assessment. No layout, entitlement, guest access, CMS, RAG/source, locale, or RBAC behavior changes.
- Narrow implementation: strengthen `scripts/run-rate-limit-integration-tests.ts`. No runtime code, dependency, schema, or migration changes. Existing CI already executes this command.

## Live PR and Actions evidence

| PR | Head | Fresh GitHub result | Recommendation |
| --- | --- | --- | --- |
| [#374](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/374) | `48e281e3522261e1666dd1f4ceb2e100952175b3` | Open, non-draft, mergeable; [CI 798](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/actions/runs/38654473580) success; mobile, build/coverage and PostgreSQL jobs/steps all succeeded | Dependency change is safe in scope: six brace-expansion copies only, five 1.1.18→1.1.21 and one 5.0.9→5.0.12. No Expo/RN/RevenueCat ranges changed. Conditional approval for this fix, not release clearance. Require current-base acceptance and explicit merge authorization. Its description incorrectly still calls it Draft. |
| [#354](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/354) | `9975a24550c96c6920e179d70933c89b13765aad` | Open Draft, mergeable; [CI 667](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/actions/runs/38031947351) success, including all three job groups | Hold: internal SDK retries bypass the advertised per-attempt reservation; isolated Cloudflare and native degradation acceptance missing. |
| [#376](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/376) | `145b775fc638fce17b36e2e2c68b7c9ca6c53cfa` | Open Draft, mergeable; [CI 801](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/actions/runs/38659833402) failure: `changes` has no runner assigned and zero steps; build/mobile/database skipped. Cloudflare, restore, account-deletion and landing workflows also failed. | Hold pending real runner execution and filter/gate review. Skipped jobs are not test evidence. |

The latest repository-wide Actions query returned eight completed failures (latest run 38815423910, created 2026-10-15T22:11:49Z). No Actions run was returned for the exact current develop SHA; CI currently triggers on PRs and pushes to main, not pushes to develop. Earlier green PR heads do not certify this develop SHA or a future merge.

Runner availability is **not established**. #387 and #376 report exhausted hosted minutes. Fresh #376 job evidence confirms a pre-execution failure, consistent with that report, but does not independently prove the billing balance/reset date. Check-annotation endpoints were rejected by the connector; the background browser lacked authenticated private-repository access. No billing/runner settings changed. A new candidate CI run must actually execute before this gate can pass.

GitHub reports `develop.protected=false`, enforcement `off`, and empty required-check contexts. Ruleset read returned 403 with a plan-feature restriction. Treat release checks as a manual operator gate until policy is reviewed; no branch settings changed here.

## Dependency audit and exploitability

Fresh registry results from `npm audit --json` (nonzero exit means findings, not scanner failure):

| Lockfile | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| develop root | 0 | 17 | 9 | 1 | 27 |
| develop mobile | 0 | 21 | 11 | 0 | 32 |
| exact PR #374 mobile lock (`--package-lock-only`) | 0 | 20 | 11 | 0 | 31 |

The 31 remaining mobile entries derive from **four packages with actual advisories**; other entries inherit a dependency/peer meta-vulnerability. `isDirect=true` means CITYWALK declares the package, not that the package has its own advisory. React Native, RevenueCat, Reanimated and MapLibre entries are predominantly inherited tooling/peer chains in this scan; no direct native exploit has been demonstrated by those counts. Conversely, npm's production dependency classification does not prove execution in a signed native app.

| Priority / package | Observed path and exploit prerequisite | Disposition |
| --- | --- | --- |
| P1 native availability: `decode-uri-component` 0.2.2 | Expo Router 57.0.27 → query-string → decoder. Installed router `getStateFromPath` calls query-string parsing. Crafted external URL/query input is therefore a plausible JS-thread denial-of-service path; no exploit was sent to a device. | [Advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), patched 0.5.0. Evaluate a narrowly scoped override/backport with query semantics, malformed input, link/auth callback and iOS/Android acceptance. This is a 0.x version change; do not assume drop-in compatibility or upgrade router to SDK 58 solely for audit count. |
| P2 build/development availability: `braces` 3.0.3 | micromatch → metro-file-map → Metro/Expo/RN tooling. Attacker-controlled deeply nested glob patterns required; not established as a native traveler runtime path. | [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Track upstream patch; keep dev servers private and build inputs trusted. No speculative major Metro/Expo downgrade. |
| P2 signing/tooling integrity: `node-forge` 1.4.0 | Expo CLI / code-signing certificates; malformed low-exponent RSA signature validation prerequisite. No evidence CITYWALK native purchase/auth enforcement calls this library. | [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched version. Review actual Expo signing verification use, trusted update/build inputs and upstream fix. No accepted blanket exception for release signing. |
| P3 tooling: `uuid` 7.0.3 | xcode → config-plugins/prebuild; advisory concerns v3/v5/v6 with caller-provided output buffer. Installed xcode use and traveler runtime reachability need separate proof; package presence is not arbitrary native memory access. | [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), patched ≥11.1.1. Major override requires Xcode/prebuild validation; defer rather than silently replace SDK internals. |

PR #374 removes the independent brace-expansion recursion/CPU advisories. Root lock still has its own brace-expansion and source-map-js copies: a mobile lock patch does not fix root tooling.

Root deserves separate follow-up: `music-metadata` is a **direct runtime dependency** used by `src/lib/media/audioMetadata.server.ts` on uploaded/stored media. Its malformed MP4/EBML parser advisories make availability a P1 review item behind the staff upload boundary; catching an exception cannot interrupt synchronous loops. Audit identifies 11.16.0 as the compatible patched line; validate that upgrade against real media fixtures separately. `sharp`/librsvg parsing and `undici` advisories require call-site/deployment reachability review; do not dismiss them because miniflare is also a consumer. Root grpc/TTS, esbuild/Drizzle, glob/ESLint and vinext plugin chains include build/development risks. DOMPurify and OG/fflate paths remain conditional on actual feature use. The appendix records all root packages and primary advisory links for follow-up; this review does not clear every runtime path.

Never run `npm audit fix --force` here. The resolver proposes Expo 44.0.6, RN 0.72.17 and RevenueCat 8.12.0, among other major changes: these are unsuitable for the SDK 57 stack. No lockfile or dependency range was changed in this PR. Online Expo Doctor identifies same-SDK patch candidates (@expo/ui 57.0.25, expo 57.0.30, expo-router 57.0.28, expo-widgets 57.0.26); evaluate together using Expo's version guidance, independently of advisory closure.

## PR #354 security review

Positive source findings: XFF/X-Real-IP ignored; `CF-Connecting-IP` is parsed with `isIP` only in configured hyperdrive runtime; invalid/untrusted headers share `unattributed`. Daily visitor UUID remains client controlled; per-address abuse limits and one shared DB-backed 120-slot rolling-day scope are independent. Advisory transaction locking protects reservations. Slots are reserved before each application completion/grounding retry, and exhausted budget returns 503, no-store and Retry-After. Limiter failure throws before calling provider; generic route catch returns 500 without provider fallback. This is fail-closed, but DB outage is not the same tested 503 UX as quota exhaustion.

**P1 correction required:** the PR creates `new Groq({ apiKey })`. Installed `groq-sdk` 1.6.0 defaults `maxRetries` to 2 (`src/client.ts`) and retries connection errors and eligible HTTP failures internally. One reserved completion can cause up to three HTTP attempts. Therefore 120 slots bound SDK calls, not 120 provider HTTP attempts (potentially up to 360). Set `maxRetries: 0` or reserve each transport retry, and add transport-level failure/retry coverage; mocked `createCompletion` tests cannot detect this. No provider traffic was generated here.

The PR is not a monetary cap or operational kill switch. Verify bounded input/output/token pricing, provider console limits/alerts, incident shutdown, stable HMAC secret across deployments, and approved free-launch configuration independently. Changing the HMAC secret resets quota identity; deployment operations must account for this.

The runtime environment variable is configuration, not cryptographic edge attestation. [Cloudflare documents](https://developers.cloudflare.com/fundamentals/reference/http-headers/) distinct direct, same-zone and cross-zone Worker subrequest behavior and pseudo-IPv4 transforms. Confirm routing and header provenance on an isolated Preview. IPv6 textual canonicalization is limited to lowercasing; equivalent spellings and mobile/NAT fairness deserve acceptance coverage. No claim of an observed production exploit.

Coverage: fetched PR head had green historical CI. Five targeted files from an archive of that exact source head ran locally: **39 tests passed**. Dependencies were shared from the current develop installation, so this is source-level regression evidence, not a clean installation/build of the historical PR lock. Tests cover invalid edge identity, budget exhaustion, application grounding retry, and limiter error propagation. Missing: SDK transport retries, route-level budget DB outage with zero transport calls, integrated shared-budget contention, and actual Cloudflare/native behavior. This PR's new integration assertions strengthen the shared DB primitive without importing the unmerged feature.

## PR #376 CI review

Useful changes: pinned paths-filter commit, read-only permissions, cancellation of superseded runs, single coverage invocation replacing duplicate unit execution, and removal of duplicate db:verify while keeping idempotency checks. None requires weaker assertions.

Required follow-up before accepting filters:

- `changes` failure currently causes heavy jobs to skip; require change-detection success plus an always-running aggregate gate that rejects failed/cancelled dependencies and distinguishes intentional skips. Required job names/branch policy must be reviewed with this change.
- Inputs not covered by the filters can suppress necessary jobs. For example root `.npmrc` changes affect both independent installs but trigger none of the three groups; root `tsconfig.cloudflare.json` is absent from web detection (the separate Cloudflare workflow does cover it). Review dependency/config/helper inputs with table-driven representative path cases before relying on selective CI.
- CI has no explicit root `tsc --noEmit` step (Next build performs its own checking); record explicit candidate typecheck. Coverage enforces 100% only for `formatTime.ts`, not security coverage across the repo.
- Manual full runs remain mandatory for a release candidate. `workflow_dispatch` availability depends on the workflow existing on the default branch; adding it only on develop is not proof it can be dispatched. Do not merge into main merely to obtain it.
- No test suite, coverage threshold, safety check, required check or path filter was changed in this review.

## Acceptance blockers and next evidence

1. Obtain fresh hosted-runner execution and all applicable checks on the exact candidate SHA; operator investigates allowance/runner access without billing changes by this task.
2. Correct PR #354's SDK retry accounting; prove Cloudflare trust, budget/outage behavior and native fallback on isolated Preview. Provider alerts/limits and explicit merge approval remain operator gates.
3. Resolve or explicitly accept the native URI decoder risk with compatible mitigation; document bounded tooling exceptions and root runtime parser follow-ups. Review signed bundles, not audit counts alone.
4. Resolve existing migration snapshot drift in its owning scope: db:generate produced a second shared_walk_links CREATE after committed 0026. Do not apply/commit both blindly. Generated files were inspected and removed; no Shareable Walks branch or code was edited.
5. Complete online Expo version check and real iOS/Android release build/device evidence; no device or store acceptance is claimed here.
6. Complete #348/#187 remaining launch evidence: current artifact secret/config scan, protected-content/expired-entitlement negative acceptance, PII-safe logs, production-provider/bucket/backup monitoring and legal/operator review. Prior issue documents 8/8 historical Gitleaks detections as benign fixture IDs; this review did not rerun a full-history secret scan or inspect production credentials.

Detailed local command outcomes follow. Local successful checks do not replace candidate CI, isolated Preview, real devices or explicit launch approval.

## Local validation ledger

Environment: macOS, Node 22.23.3, npm 10.9.9; root and mobile installs use committed locks and `--ignore-scripts --no-audit --no-fund`. Install lifecycle hooks were deliberately not executed. First sandbox install/audit attempts were incomplete or could not reach the registry; elevated registry-only retries completed. Early mobile commands ran before a usable mobile install and failed (missing expo/types); final results below are after successful installation.

All DB commands explicitly used `DATABASE_URL=postgresql://citywalk:citywalk@127.0.0.1:55487/citywalk_security`, disposable container `citywalk-security-387-postgres` (PostgreSQL 16). Fixture credentials in this URL are local test data. No local env files were copied. Build fixtures also set `BETTER_AUTH_URL=http://localhost:3000` and a local-only secret of at least 32 characters. No actual provider key was supplied.

| Exact command (from worktree root unless stated) | Observed result |
| --- | --- |
| `git fetch origin develop`; `git fetch origin pull/354/head:refs/remotes/origin/review-354 pull/374/head:refs/remotes/origin/review-374 pull/376/head:refs/remotes/origin/review-376` | Passed; refs matched GitHub snapshots. |
| `npm ci --ignore-scripts --no-audit --no-fund` | Final isolated root install passed; deprecated esbuild-kit, tsconfck, jsrsasign, node-domexception, ESLint warnings. |
| Mobile directory: `npm ci --ignore-scripts --no-audit --no-fund` | Passed, 961 packages; uuid 7 and ESLint deprecation warnings. |
| `npm audit --json`; `npm --prefix mobile audit --json` | Completed with findings, exit 1; counts above. |
| PR #374 package/lock-only directory: `npm audit --package-lock-only --json` | Completed with 31 findings, exit 1. No dependency install/build of this exact PR performed locally; historical CI verified separately. |
| `npm run test:run` | 231 files passed / 19 skipped; 1,441 tests passed / 133 skipped. Skipped DB cases are not integration proof. |
| `npm run test:coverage` | Same counts; configured coverage 100% (5 statements, 4 branches, 1 function, 5 lines), confined to formatTime. |
| `npm run lint` | Exit 0, 8 existing warnings: five admin preview test warnings; Worker anonymous default export; MarketingQaPanel unused argument; MarketingLandingTracker hook dependency. |
| `npx eslint scripts/run-rate-limit-integration-tests.ts` | Passed after test changes. |
| `npx tsc --noEmit` | Initially failed on generated PageProps/LayoutProps missing. `npx next typegen && npx tsc --noEmit` then passed. |
| `npm run db:generate` | Exit 0 but **gate not clear**: generated duplicate shared_walk_links migration 0027. Existing 0026 SQL and snapshot are inconsistent; generated SQL/snapshot/journal change inspected and excluded. |
| `npm run db:migrate` | Passed committed migrations only on disposable database, after excluding drift. Initial overlapped generate/migrate run incomplete; not counted as success. |
| `npm run rate-limit:test:integration` | Passed actual PostgreSQL rolling expiry, last-slot contention, scope isolation, HMAC storage and missing-secret fail-closed assertions. |
| `npm run db:seed`; `npm run db:verify` | Passed on disposable database. |
| `npm run lifecycle:test:integration` | Passed isolated lifecycle DB suite. |
| `npm run cms:import-lubeck`; `npm run cms:test:integration`; `npm run content:test:integration`; `npm run media:test:integration`; `npm run commerce:test:integration`; `npm run knowledge:test:integration` | Each command exit 0 against disposable data. |
| `npm run build:vinext` | Passed with localhost-listener permission; first sandbox attempt EPERM. Warnings: large chunks and incomplete static route classification. |
| `npm run check:cloudflare-build`; `npm run check:cloudflare-bindings`; `npm run typecheck:cloudflare` | All passed. Binding check is static evidence, not live production configuration proof. |
| `npm run deploy:vinext:dry-run` | Exit 0; tool explicitly says no build or deploy performed. Warns next/image unoptimized. No authenticated upload/remote acceptance proved. |
| `npm run i18n:check` | Passed. |
| `npm run mobile:test` | 93 files / 773 tests passed. |
| `npm run mobile:lint`; `npm run mobile:typecheck`; `npm run mobile:config` | All passed after mobile install. |
| `npm run mobile:doctor` | Sandbox 19/21 (network checks unavailable); online retry **20/21, exit 1**, four SDK 57 patch mismatches listed above. Do not call Doctor green. |
| `npm run mobile:local-check` | Exit 0: Xcode 26.6, CocoaPods 1.17.0, Java 17, Android SDK and adb detected. Tool availability does not prove native builds/devices. |
| Mobile directory: `npx expo export --platform ios --platform android --output-dir /private/tmp/citywalk-security-native-export` | Passed: iOS Hermes bundle ~7 MB; Android ~7.2 MB. NO_COLOR/FORCE_COLOR warnings. Neither signed binary nor device acceptance. |
| Archived PR #354 source: `npm run test:run -- src/lib/guideRequestIdentity.server.test.ts src/lib/rateLimit.test.ts src/app/api/guide/route.test.ts src/app/api/guide/route.generic.test.ts src/app/api/guide/walk-context.test.ts` | 5 files / 39 tests passed, shared develop dependencies caveat above. An earlier mistakenly root-scoped invocation is not used as PR-head evidence. |
| `git diff --check` | Passed before staging; final check recorded in PR. |

Next build attempts: initial sandbox process stalled and was stopped; overlapping retry reported an active build. First permitted build reached prerendering then correctly rejected the under-32-character fixture secret. A subsequent retry overlapped dependency installation and failed transient type resolution; a clean final rerun is recorded below. These failed attempts are not product regressions or passing checks.

Restore first attempt: local newer libpq tools created a dump and restore failed against PostgreSQL 16 at `SET transaction_timeout`; not cleared by merely creating a backup. Matching PostgreSQL 16 tools were then invoked inside the disposable container using temporary local wrappers. Source and restore target were distinct (`citywalk_security` and `citywalk_security_restore`); production was never involved. Final result below.

## Root audit package inventory

Package-level severity and direct-dependency status; `via` string entries are inherited findings. Versions/paths remain in unchanged lockfiles. Registry state may change after this snapshot.

| Package | Severity | Direct | Advisory or inherited from |
| --- | --- | --- | --- |
| @cloudflare/runtime-types | high | no | miniflare |
| @cloudflare/vite-plugin | high | yes | @cloudflare/runtime-types, miniflare |
| @esbuild-kit/core-utils | moderate | no | esbuild |
| @esbuild-kit/esm-loader | moderate | no | @esbuild-kit/core-utils |
| @grpc/grpc-js | high | no | [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4) |
| @next/eslint-plugin-next | high | no | fast-glob |
| @vercel/og | moderate | no | satori |
| @vinext/cloudflare | moderate | yes | vinext |
| brace-expansion | high | no | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) |
| braces | high | no | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| cf | high | yes | @cloudflare/runtime-types, miniflare |
| dompurify | low | no | [GHSA-p98j-92pf-mc4p](https://github.com/advisories/GHSA-p98j-92pf-mc4p), [GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2) |
| drizzle-kit | moderate | yes | @esbuild-kit/esm-loader |
| esbuild | moderate | no | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) |
| eslint-config-next | high | yes | @next/eslint-plugin-next |
| fast-glob | high | no | micromatch |
| fflate | moderate | no | [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) |
| micromatch | high | no | braces |
| miniflare | high | no | sharp |
| music-metadata | moderate | yes | [GHSA-f94x-6692-553q](https://github.com/advisories/GHSA-f94x-6692-553q), [GHSA-5gfj-9q3v-qfp3](https://github.com/advisories/GHSA-5gfj-9q3v-qfp3) |
| satori | moderate | no | fflate |
| sharp | high | no | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) |
| source-map-js | high | no | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) |
| undici | high | no | [GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v), [GHSA-pmjh-fq2x-6v4x](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x), [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r), [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5), [GHSA-3xpg-4rpp-hhhm](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm), [GHSA-2jfj-6hjv-fm6j](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j), [GHSA-2gqq-gqf2-x968](https://github.com/advisories/GHSA-2gqq-gqf2-x968), [GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3), [GHSA-8436-99hf-9mmv](https://github.com/advisories/GHSA-8436-99hf-9mmv), [GHSA-vp8m-p9jh-q5pm](https://github.com/advisories/GHSA-vp8m-p9jh-q5pm), [GHSA-rx4f-c7p8-82vq](https://github.com/advisories/GHSA-rx4f-c7p8-82vq) |
| vinext | high | yes | @vercel/og, vite-plugin-commonjs |
| vite-plugin-commonjs | high | no | vite-plugin-dynamic-import |
| vite-plugin-dynamic-import | high | no | fast-glob |

## Final local rerun results

- Clean `npm run build`: **exit 0**, Next.js 16.3.8 production compilation, TypeScript and prerender completed using valid local-only fixture settings.
- Final `npx tsc --noEmit`: **exit 0**, generated route types present.
- `npm run db:backup` and `npm run db:restore -- --file=<local-dump> --confirm-non-production` with matched PostgreSQL 16 tools: **both exit 0**; checksum/archive preflight, restore and db:verify passed, catalog 2 cities / 44 places. First failed newer-client restore remains recorded above.
- No new migration or dependency files remain. Final scope is the PostgreSQL security integration assertions and this readiness report.

## Fresh Draft PR execution checkpoint

[Draft PR #388](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/388) was opened against develop. Its initial head `39d6efb460d69bab419ae17d4b24e9eefe076cad` triggered [CI 808 / run 39136961302](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/actions/runs/39136961302). Fresh job inspection returned **failure for mobile (117703312859), database-integration (117703313112), and build (117703313132)**, with empty runner names and zero steps for each. This independently confirms current pre-execution hosted-runner failure on this task's candidate; it does not reveal the billing balance or distinguish all account-level causes. None of the three suites ran remotely. The report-only follow-up commit recording this observation needs its own head check; the security test code is unchanged.

Supplemental artifact probe: a byte-regex scan of both newly exported Hermes bundles found 0 private-key delimiters, 0 Groq-shaped keys and 0 AWS access-key-shaped values. A permissive unanchored OpenAI-prefix regex matched two long substrings per bundle, both embedded in longer alphanumeric string-table data; exact/prefix source lookup did not resolve them. **These are untriaged byte-pattern matches, not confirmed credentials or a cleared bundle scan.** No match values were printed, transmitted or committed. Format-aware Hermes string/config inspection remains required under #348. This probe is not a full-history scan and does not justify rotation or a zero-secret claim.
