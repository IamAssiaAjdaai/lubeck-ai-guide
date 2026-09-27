# Reviewed local checkpoint — 2026-09-27

> **Commit 1 recorded:** `c23b0eb6e10321a2e8c5e89d1d5e9f737dde90bd` contains exactly the reviewed 152-file index (+8,671 / −2,306). No push occurred. Earlier preparation/no-commit/index-count sections below are historical. Commit 2 contains documentation only; current remaining-path classification is recorded at the end.

> **Selective-staging update — 2026-09-27:** The earlier three-file index described below has now been reconstructed with owner authorization. See [the staged Commit 1 handoff](#selective-staging-handoff--2026-09-27); the review-stage index findings remain dated history. No commit has been made.

## Acceptance and scope

The [QA ledger](README.md#empty-walk-correction-round-accepted-on-tested-iphone--2026-09-27) records all six owner-confirmed Save passes. Together with the earlier Start/Rebuild, Finish, Take me back and repeated-Start results, this specific correction round is **accepted on the tested physical iPhone**. No new device model, iOS version, installed binary/build ID or tested source hash was supplied. Automated source identity below must not be attributed retrospectively to the owner's phone.

Accepted membership/Add stop, navigation, audio and presentation were preserved. No product code changed during this checkpoint review. German at 110%, restoring the previous text size and other unanswered device checks remain **UNVERIFIED**. No Android acceptance, release acceptance, remote issue closure or PR merge is claimed.

## Working tree and review findings

- Branch: `fix/citywalk-native-device-acceptance`.
- HEAD: `efe8cf62f408181f0f4ca922f32e53e712a982a2`.
- Initial expanded status: **181 paths**: 3 staged, 97 unstaged tracked, 81 untracked files; no staged/unstaged overlap. Final expanded status: **182 paths**, 3 staged, 97 unstaged tracked, **82 untracked files**. Tracked changes comprise 90 modified files and 10 deletions; `git diff --stat HEAD` reports 100 files, +2381 / −2356 (untracked files are not included in that stat).
- Existing staged paths: `src/lib/media/storage/s3ObjectStore.server.ts`, its test, and deletion of `src/translations/ar.json`. The index was not changed. **The existing staged selection is not a complete, independently usable checkpoint**: the adapter imports an untracked diagnostic module and the Arabic deletion depends on the new shared package and consumers.
- All 10 deletions are the three old traveler-core copy catalogs and seven Web launch/Arabic UI catalogs, replaced by `packages/i18n`. The remaining Web language catalogs retain UI strings; extracted editorial fields live in `src/data/lubeckEditorial.json` and `cityPassEditorial.json`. Their removal must stay with the resolver/importer/editorial separation, never as standalone deletions.
- `mobile/src/design/discoveryCopy.ts` / `uxCopy.ts`, Web account/commerce adapters and traveler-core copy are compatibility adapters to the shared catalogs, not competing replacement dictionaries. Native walk state continues through the canonical storage/membership hooks.
- Root and mobile npm lockfiles agree with their manifest dependency ranges and workspace links. Before validation, root `node_modules/@citywalk/i18n` resolved a stale pnpm snapshot. Only the two root `@citywalk/i18n` and `@citywalk/traveler-core` symlinks were corrected to the declared npm workspace directories. No dependency version was changed or installed. Mobile already resolved the local packages. A full Web/shared rerun followed this correction.
- `expo-store-review ~57.0.3` is required by the existing review implementation. Keep its mobile manifest and lockfile entries with that implementation. Runtime absence is handled safely; automated tests do not prove the module exists in the installed Development Client. Public listing environment examples remain empty; no store ID/URL was invented.
- New `mobile/assets/images/content-placeholder.svg` is referenced by the native image component and is an intentional source asset.

## Exclusions and deliberate holds

No file was deleted, reset, cleaned, unstaged or mass-staged during this review.

1. **Exclude `pnpm-lock.yaml` and `pnpm-workspace.yaml`.** The workflow uses npm lockfiles/`npm ci`; the untracked pnpm workspace contains unfinished `allowBuilds` string placeholders. Preserve them locally pending an explicit package-manager decision.
2. **Exclude the unrelated trailing-space hunk at `.env.example:32`.** The two empty future public-review URL examples are intentional and belong with review support. No real password is present in this hunk.
3. **Hold the separate media-diagnostic/storage group out of this native/localization checkpoint:** `src/app/api/media/[assetKey]/route.ts`, `src/lib/media/mediaDelivery.server.ts`, `src/lib/media/mediaDiagnostics.server.ts`, and `src/lib/media/storage/{environment.server.ts,s3ObjectStore.server.ts,s3ObjectStore.server.test.ts}`. Its classifier adds Preview/dev logging and the adapter changes checksum handling. Existing delivery/storage tests run in the full suite, but there is no dedicated classifier/redaction regression file covering the earlier requested diagnostic contract. The currently staged adapter cannot be taken alone. No storage fix, provider health or remote deployment is inferred from local tests.
4. **Hold `scripts/audit-launch-content.mjs` and `launch-content-coverage.json` out of authoritative launch-audio evidence.** The audit counts audio in summary DTOs, which intentionally omit place/tour audio. Zero summary audio is not proof of missing exact-language detail audio. Correcting this separate audit is outside the accepted correction round; do not use it to assert current audio availability.
5. **Always exclude ignored secrets and generated output:** `.env.local`, `.env.preview.local`, `.vercel/project.json`, `node_modules`, `.next`, `mobile/.expo`, generated `mobile/ios` / `mobile/android`, private signing material, build archives, local logs and `<local-only temporary artifact>` verification artifacts. No private env/signing file appeared among the candidate changed/untracked files.

A path-only secret scan and manual review found no real credential/private key in the candidate diff. Matches were documented loopback database fixtures in `.env.example`/CI and a synthetic credential URL used to test audio-log redaction. This is review evidence, not a guarantee about ignored private files.

Keep useful diagnostics deliberately: native audio diagnostics require development mode and explicit opt-in, expire after 60 seconds / 120 samples and avoid raw source URLs; tests cover bounded/redacted output. Tab/scroll diagnostics require development mode plus `EXPO_PUBLIC_CITYWALK_QA_LOGS=1`. The server media diagnostics are separately held above, not silently deleted.

The older source manifest and test reports remain dated history. Status banners in launch reconciliation, managed-media diagnosis and empty-walk reports prevent their old pending statements, digests or HTTP results being mistaken for this checkpoint. Shared-i18n guidance now states all six launch locales plus Arabic compatibility and 440 keys.

## Final integration validation

No test assertion, timeout, product behavior or fixture in the repository was changed to make a gate pass. No build/export, deployment, service configuration change or remote content publication was performed. Local Docker/PostgreSQL was started solely to enable the isolated DB test gate.

| Gate / exact command | Result |
| --- | --- |
| `npm run test:run -- --maxWorkers=2` after workspace-link correction | **868 passed / 140 files; 22 skipped / 5 files**, 890 total tests / 145 files; exit 0, 336.92 s. Includes all four shared/i18n/domain test files and Web/backend consumers. DB skips are handled by the isolated gate below. |
| `npm --prefix mobile run test:run -- --maxWorkers=2` | **468 passed / 55 files**, no skips/failures/unhandled errors; exit 0, 95.53 s. |
| `node <local-only isolated-database helper>` (isolated command and flags below) | **22 passed / 5 files**, no skips/failures/unhandled errors; test exit 0, 42.45 s. Disposable database cleanup confirmed. |
| `node node_modules/typescript/bin/tsc --noEmit` | **PASS**, exit 0. |
| `npm --prefix mobile run typecheck` | **PASS**, exit 0. |
| `node node_modules/typescript/bin/tsc --project packages/i18n/tsconfig.json` | **PASS**, exit 0. |
| `npm run lint` | **PASS**, exit 0; no lint diagnostics. |
| `npm --prefix mobile run lint` | **PASS**, exit 0; `expo lint --max-warnings=0`. |
| `npm run i18n:check` | **440 keys × 7 catalogs**, zero errors; exit 0. DE/EN/DA/SV/NL/ES launch locales plus Arabic compatibility. |
| `git diff --check` | **FAIL only on pre-existing `.env.example:32` trailing whitespace**; preserved for owner-controlled hunk exclusion. |
| `git diff --cached --check` | **PASS**. |
| `git diff HEAD --check -- . ':(exclude).env.example'` and untracked text trailing-whitespace scan | **PASS**, no other findings (unfinished pnpm artifacts excluded from the latter). |

Reruns: the first full Web run also passed 868 / 140 with 22 DB skips (279.55 s), but it resolved an outdated installed shared-i18n snapshot. It is **not** used as the final exact-source gate. The full run above was repeated after correcting only the two workspace symlinks. No timeout/assertion changes. Existing Vite configuration/deprecation advisories remain; they were not suppressed to manufacture a clean result. Mobile was also rerun rather than relying on the previous correction-round totals.

Database execution: `<local-only temporary artifact>` creates a unique `cw_checkpoint_<timestamp>` database on loopback, applies committed migrations, runs `node --conditions=react-server --import tsx scripts/import-lubeck-cms.ts` **only against that disposable database**, then runs:

```sh
node node_modules/vitest/vitest.mjs run \
  src/lib/admin/content/cms.integration.test.ts \
  src/lib/admin/content/cityManifest.integration.test.ts \
  src/lib/media/media.integration.test.ts \
  src/lib/commerce/webhook.integration.test.ts \
  src/lib/verifiedKnowledge.integration.test.ts --maxWorkers=1
```

The child process explicitly sets its disposable `DATABASE_URL`, `CITYWALK_CONTENT_SOURCE=database` and all five integration flags (`CMS_DB_INTEGRATION`, `CITY_CONTENT_DB_INTEGRATION`, `MEDIA_DB_INTEGRATION`, `COMMERCE_DB_INTEGRATION`, `VERIFIED_KNOWLEDGE_DB_INTEGRATION`) to `1`. Cleanup targets only the database created by this invocation. The first attempt failed with `ECONNREFUSED` before database creation. Docker initially returned HTTP 500 during startup; after it became healthy, `docker compose up -d --wait postgres` started the local test service and the isolated gate was retried. Existing local catalogs, Preview, production and object storage were not test targets.

Final DB result: **22 passed / 5 files**, exit 0, 42.45 s; only the newly created disposable database was removed. Across Web/shared, mobile and the isolated DB gate: **1,358 distinct tests passed in 200 test files**. The 22 normal-run DB skips were all executed by the separate gate, not counted twice. No remaining test failure or unhandled error. Docker and the local PostgreSQL service remain running; existing database contents were preserved.

Source preservation: comparing SHA-256 hashes against the start snapshot found only seven pre-existing documentation paths changed during this review, plus this new report. No product, test, manifest or lockfile changed. A binary comparison confirms the index is unchanged. The final changed-source manifest contains **159 entries**, excluding Markdown/docs and the held pnpm artifacts; SHA-256 of its sorted compact JSON is `a4fa022fa317ef9498361d2b5ee85c08a187f76abbfc04b59f0574a529446e03`. This describes local changed-source identity, not a native build or a digest of the whole repository. The temporary manifest and test logs stay under `<local-only temporary artifact>`.

No clean `npm ci`, production/native build, database generation or remote verification was run in this checkpoint. No schema changes required a new migration. The isolated test fixture is not publication into a user/Preview/production catalog.

## Proposed commit groups — proposal only

### 1. `feat(citywalk): integrate launch localization and validated native traveler flows`

Purpose: [#137 shared localization](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/137), [#138 native experience](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/138), and [#130 review integration](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/130), respecting [#136 surface boundaries](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/136).

Keep these tightly coupled implementation subgroups in **one atomic product commit**, rather than manufacturing broken intermediate states:

- Shared/domain: `packages/i18n/**` (including tests/checker), traveler-core manifest/copy/availability/launch-content changes and old catalog deletions; root manifest/lockfile, `next.config.ts`, CI i18n gates; Web `src/lib/i18n.ts`, account/commerce adapters and tests, listed page/paywall consumers, `src/translations/**`, `src/data/{lubeckEditorial.*,cityPassEditorial.json}`, content public repository and CMS importer. Editorial payload remains distinct from static UI translation.
- Native correctness/presentation: all changed/new `mobile/src/**`, `mobile/tests/**`, `mobile/metro.config.js`, the placeholder source asset, mobile manifest/lockfile. Includes exact-locale audio, locale persistence/RTL, loading/recovery, membership synchronization, responsive controls/heroes and the accepted Start/Save/Rebuild safeguards. Do not drop tests or untracked imported modules.
- Review integration/native dependency: `PublicStoreReview.tsx`, `storeReview.ts`, their two test files, Finish integration hunks inside `NativeWalkFlow.tsx`, shared review copy, `expo-store-review` manifest/lockfile entries and only the public-review additions in `.env.example`. Native invocation remains separate from private trip feedback; OS dialog display is not guaranteed.

Why atomic: `NativeWalkFlow.tsx` combines shared typed copy, canonical save/rebuild behavior and Finish review integration. CI's mobile i18n command requires the changed mobile manifest; Metro/shared adapters, catalog deletions and consumer imports must move together. Splitting by broad headings without extracting and revalidating intermediate trees risks missing modules, missing keys or broken CI. No such extraction/staging was performed in this review. `packages/i18n/README.md` can travel with the package.

Validation: current full Web/shared and mobile suites, isolated DB integration where available, root/mobile/shared TypeScript, root/mobile lint and shared catalog checker. These validate the current tree; a future selectively staged candidate must be checked for dependency completeness before committing. Remaining device/release limitations below apply.

### 2. `docs(qa): record iPhone acceptance and checkpoint limitations`

Purpose: [#112 launch acceptance evidence](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/112), #136 guidance and #137 documentation.

Files: root/mobile `AGENTS.md`, `.github/pull_request_template.md`, `docs/agent/{CITYWALK_ARCHITECTURE.md,NATIVE_APP_SHELL.md}`, `docs/architecture/shared-i18n.md`, the QA README and dated Markdown reports, and the historical `local-source-identity.json` with its date/scope intact. Exclude the misleading summary-audio coverage artifact identified above. Depends on product group 1; do not present this documentation alone as implementation or release evidence.

Validation: links/paths, dated evidence reconciliation, source identity and whitespace checks. Owner-provided physical observations remain separate from mocked automated tests. No blanket Android, native-module or release claim.

### Deferred, not part of these commits

The six-file server media/storage diagnostic group needs its own focused safe-logging review/tests. The content-coverage script needs detail-based audio evidence. Neither is a reason to redesign the accepted native flow, nor permission to deploy/configure storage in this session.

## Commit safety versus merge/release readiness

**Safe to commit the current index/all files indiscriminately: NO.** Concrete reasons: the existing staged selection has missing dependencies; unfinished pnpm artifacts and an unrelated whitespace hunk are present; separate media diagnostics lack the requested dedicated safety coverage; the audio audit must not be committed as authoritative availability evidence. The proposed scoped product/documentation groups are reviewable, but this session neither stages them nor verifies a reconstructed commit candidate.

Merge/release remains a separate decision: no source-matched build was run (explicitly prohibited), no fresh remote Preview acceptance, no Android device acceptance, no new native StoreReview-module evidence, and unanswered physical text-size/locale checks remain unverified. Existing service/content/map/AI/commerce limitations retain their prior status; none was retested or closed here. Native public-review fallback URLs remain intentionally unset before approved public listings. Missing CMS translations/audio, founder feedback transport, analytics/dashboard/acquisition and Android/store acceptance remain separate workstreams.

## Selective staging handoff — 2026-09-27

Owner authorized selective staging, not committing. Branch/HEAD unchanged. **No product/UI file was edited.** Only this unstaged report was extended. Working-tree file hashes were compared with the pre-staging snapshot; all existing implementation, excluded media work, pnpm artifacts and private/local files were preserved. Private files were not read or staged.

### A. Commit 1 selection

Message: `feat(citywalk): integrate launch localization and validated native traveler flows`.

**152 staged paths: 79 modified, 63 added, 10 deleted; +8,671 / −2,306 lines.** Group counts: 77 native files, 27 shared-package files, 43 Web compatibility files, 5 manifest/configuration files. Final expanded status: 152 staged, 13 with unstaged tracked changes, 19 untracked files (the unstaged counts include excluded hunks in two staged files). Full `git status --short` and staged diff stat were displayed during handoff.

Only the staged media adapter and its test were unstaged with explicit `git restore --staged -- <two paths>`. The already-staged Arabic catalog deletion was retained and its dependencies added. Implementation was staged with an explicit reviewed 151-path list; the `.env.example` review-URL additions were applied to the index as a separate patch. The initial add command encountered the already-staged/deleted Arabic path; it was retried omitting that already-staged path. No working-tree restoration, clean, branch switch or mass-stage command was used.

### B. Dependencies and import closure

Included: seven shared catalogs and typed adapters, traveler-core changes and replacement catalog deletions, Web editorial separation and consumers, root/mobile npm manifests and lockfiles, Next package transpilation, Metro shared-package watching, CI i18n commands, native review source/tests and `expo-store-review ~57.0.3`. Future public store URLs remain empty. The placeholder SVG and all previously untracked implementation modules/tests are included.

An AST import audit of **101 staged JS/TS files** resolves **542 local/workspace/raw-source imports** and **164 external imports**, with **zero missing local targets or undeclared external packages**. Workspace imports resolve to packages in an exported index snapshot, not the owner working tree. Vite `?raw` test imports are checked against their actual staged source files; these were initially reported by the temporary audit script before it was taught to resolve that query syntax. TypeScript provides the additional complete consumer check below. No repository test was weakened or modified.

### C. Explicit exclusions

- All 20 documentation/evidence paths listed in section G remain unstaged, including `packages/i18n/README.md`.
- Six media paths remain unstaged: `src/app/api/media/[assetKey]/route.ts`, `src/lib/media/mediaDelivery.server.ts`, `src/lib/media/mediaDiagnostics.server.ts`, `src/lib/media/storage/environment.server.ts`, `src/lib/media/storage/s3ObjectStore.server.ts`, `src/lib/media/storage/s3ObjectStore.server.test.ts`.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/audit-launch-content.mjs` and `docs/qa/citywalk-native-visual-parity/launch-content-coverage.json` remain untouched and unstaged for the reasons in the checkpoint review.
- `.env.example:32` whitespace-only change remains working-tree-only. Only the two empty future-review settings and their comments are staged.
- `packages/i18n/src/adapters.ts` contained an extra blank line at EOF, missed by the earlier untracked trailing-space scan. `git diff --cached --check` found it when the file became staged. Only that final blank line was omitted from the index; the owner's working file remains byte-for-byte unchanged. `AM` for this path is intentional.
- Private env/signing files and generated outputs are absent from the staged selection. Opt-in development audio/tab diagnostics are intentionally retained; bounds, redaction, development gating and tests were reviewed. Separate server diagnostics are not included.

Staged secret-pattern matches were only documented loopback fixture URLs and the synthetic credential URL in the audio redaction test. No real secret/signing credential, private env file, generated artifact or unrelated media diagnostic was found in the staged diff. No secret values are included in this report.

### D. Whitespace

`git diff --cached --check`: **PASS**, exit 0 after the index-only EOF cleanup. No product behavior change.

### E. Relation to the validated checkpoint

All selected traveler/Web/shared implementation matches the earlier validated bytes except the adapter's single final blank line. The `.env.example` difference is only the excluded unrelated whitespace. The full staged tree is intentionally **not identical to the entire dirty validated tree**: the five tracked media files remain at HEAD, the untracked media diagnostic and audio-audit script are absent, and documentation/pnpm work is excluded. These differences were enumerated rather than claiming exact-tree equivalence.

A temporary `git checkout-index --all --prefix=<temporary directory>/` export was used for staged-state checks. Installed third-party dependencies were reused; both root/mobile `@citywalk` links point to the **exported staged packages**. No owner source was swapped out, no stash/worktree reset was used, and no package was installed/upgraded. No clean-install/build claim is made.

### F. Minimum staged-state validation

The previous 868 Web/shared, 468 mobile and 22 isolated-DB passes remain baseline evidence for unchanged sources. No full 1,358-test rerun was needed. To cover the excluded media changes and the index-only adapter whitespace, the exported staged tree ran:

```sh
node node_modules/vitest/vitest.mjs run \
  'src/app/api/media/[assetKey]/route.test.ts' \
  src/lib/media/storage/s3ObjectStore.server.test.ts \
  src/lib/media/storage/environment.server.test.ts \
  packages/i18n/src/i18n.test.ts packages/i18n/src/ci-check.test.ts \
  packages/traveler-core/src/travelerCore.test.ts \
  packages/traveler-core/src/walkParity.test.ts --maxWorkers=2
```

**75 passed / 7 files, zero skipped/failed/unhandled errors**, 17.28 s: 13 media-route/storage/environment tests plus 62 shared/i18n/domain tests. Existing Vite advisories remain unchanged.

- `npm --prefix mobile run typecheck`: **PASS** on the exported staged tree.
- `npm run i18n:check`: **PASS**, 440 keys × 7 locales, zero errors on the export.
- `node node_modules/eslint/bin/eslint.js packages/i18n/src/adapters.ts 'src/app/api/media/[assetKey]/route.ts' src/lib/media/mediaDelivery.server.ts src/lib/media/storage/environment.server.ts src/lib/media/storage/s3ObjectStore.server.ts src/lib/media/storage/s3ObjectStore.server.test.ts`: **PASS** on the export. Other linted source is unchanged from the prior complete pass.
- Root `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**, exit 0 on the exported staged tree after restoring its validation-support declarations. The first export-only attempt lacked ignored Next-generated `PageProps`/`LayoutProps` declarations. Existing `next-env.d.ts`, `.next/types` and `.next/dev/types` were copied only into the temporary export and the command rerun. These are validation support files, not staged source; no Next build/type generation ran.
- AST import/dependency closure and staged secret/artifact/whitespace checks: **PASS**.

### G. Commit 2 plan — not staged

Message: `docs(qa): record iPhone acceptance and checkpoint limitations`.

Exact 20 proposed documentation/evidence paths:

```text
.github/pull_request_template.md
AGENTS.md
docs/agent/CITYWALK_ARCHITECTURE.md
docs/agent/NATIVE_APP_SHELL.md
docs/qa/citywalk-native-visual-parity/README.md
mobile/AGENTS.md
docs/architecture/shared-i18n.md
docs/qa/citywalk-native-visual-parity/arabic-physical-polish.md
docs/qa/citywalk-native-visual-parity/audio-copy-overlay-heroes.md
docs/qa/citywalk-native-visual-parity/dynamic-text-and-controls.md
docs/qa/citywalk-native-visual-parity/empty-walk-rebuild.md
docs/qa/citywalk-native-visual-parity/empty-walk-save.md
docs/qa/citywalk-native-visual-parity/launch-languages.md
docs/qa/citywalk-native-visual-parity/launch-reconciliation.md
docs/qa/citywalk-native-visual-parity/loading-and-membership.md
docs/qa/citywalk-native-visual-parity/local-source-identity.json
docs/qa/citywalk-native-visual-parity/managed-media-diagnosis.md
docs/qa/citywalk-native-visual-parity/native-ui-polish.md
docs/qa/citywalk-native-visual-parity/reviewed-checkpoint.md
packages/i18n/README.md
```

Preserve dated owner-confirmed iPhone claims only; Android, unanswered physical checks and release readiness remain unverified. Historical source manifests/results are not current native-build identities. The summary-based audio coverage artifact is deliberately excluded. No build/deployment/publication or remote issue closure is claimed.

### H. Commit decision

**SAFE TO COMMIT COMMIT 1: YES — exactly the reviewed 152-path index.** Required implementation/dependencies are included, excluded work is not staged, and staged-tree checks pass. This does not authorize committing now or adding all remaining files. Commit 2 is only planned and remains unstaged. Merge/release limitations above are unchanged. This session stops before `git commit`; no push, merge, build, deployment or publication.

### Exact Commit 1 staged paths

```text
.env.example
.github/workflows/ci.yml
mobile/assets/images/content-placeholder.svg
mobile/metro.config.js
mobile/package-lock.json
mobile/package.json
mobile/src/app/account/index.tsx
mobile/src/app/city/[citySlug]/assistant.tsx
mobile/src/app/city/[citySlug]/guide/[placeSlug].tsx
mobile/src/app/city/[citySlug]/index.tsx
mobile/src/app/city/[citySlug]/place/[placeSlug].tsx
mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx
mobile/src/app/city/[citySlug]/walk.tsx
mobile/src/app/index.tsx
mobile/src/app/saved.tsx
mobile/src/components/CitywalkLoading.tsx
mobile/src/components/ContentRecovery.tsx
mobile/src/components/ImageOverlayHero.tsx
mobile/src/components/LocaleSelector.tsx
mobile/src/components/NativeAudioPlayer.tsx
mobile/src/components/NativeChrome.tsx
mobile/src/components/NativeCityMap.tsx
mobile/src/components/NativeContentImage.tsx
mobile/src/components/NativeTourPlanner.tsx
mobile/src/components/NativeWalkFlow.tsx
mobile/src/components/PublicStoreReview.tsx
mobile/src/components/V2Presentation.tsx
mobile/src/components/WalkControls.tsx
mobile/src/components/WalkMembershipControl.tsx
mobile/src/components/ui.tsx
mobile/src/design/discoveryCopy.ts
mobile/src/design/responsiveText.ts
mobile/src/design/rtlPresentation.ts
mobile/src/design/uxCopy.ts
mobile/src/hooks/useCurrentWalk.ts
mobile/src/hooks/usePublicContent.ts
mobile/src/lib/api/contracts.ts
mobile/src/lib/audioDiagnostics.ts
mobile/src/lib/bidi.ts
mobile/src/lib/cityAssistant.ts
mobile/src/lib/contentLabels.ts
mobile/src/lib/displayNames.ts
mobile/src/lib/localization.ts
mobile/src/lib/narrationAudioSession.ts
mobile/src/lib/storeReview.ts
mobile/src/lib/tabNavigation.tsx
mobile/src/lib/walkMembership.ts
mobile/src/lib/walkStorage.ts
mobile/src/localization/LocaleProvider.tsx
mobile/src/localization/localePreference.ts
mobile/tests/api-client.test.ts
mobile/tests/audio-diagnostics.test.ts
mobile/tests/compact-city-filters.test.tsx
mobile/tests/content-image.test.tsx
mobile/tests/content-loading-retry.test.tsx
mobile/tests/display-names.test.ts
mobile/tests/home-presentation.test.tsx
mobile/tests/launch-locale-selector.test.tsx
mobile/tests/loading-experience.test.ts
mobile/tests/locale-preference.test.tsx
mobile/tests/membership-presentation.test.tsx
mobile/tests/membership-screens.test.tsx
mobile/tests/metro-workspace.test.ts
mobile/tests/native-audio-playback.test.tsx
mobile/tests/native-card-followup.test.ts
mobile/tests/native-city-experience.test.ts
mobile/tests/native-media-loading.test.tsx
mobile/tests/native-screen-chrome.test.tsx
mobile/tests/native-tab-navigation.test.tsx
mobile/tests/native-v2-regressions.test.tsx
mobile/tests/public-store-review.test.tsx
mobile/tests/responsive-text.test.ts
mobile/tests/rtl-presentation.test.ts
mobile/tests/store-review.test.ts
mobile/tests/walk-flow.test.tsx
mobile/tests/walk-membership.test.tsx
mobile/tests/walk-save.test.ts
mobile/tests/walk-session.test.ts
mobile/tests/walk-storage.test.ts
next.config.ts
package-lock.json
package.json
packages/i18n/package.json
packages/i18n/scripts/check.mjs
packages/i18n/src/adapters.ts
packages/i18n/src/ci-check.test.ts
packages/i18n/src/content.ts
packages/i18n/src/i18n.test.ts
packages/i18n/src/index.ts
packages/i18n/src/launch-locales.json
packages/i18n/src/locale-config.ts
packages/i18n/src/locales/ar.json
packages/i18n/src/locales/da.json
packages/i18n/src/locales/de.json
packages/i18n/src/locales/en.json
packages/i18n/src/locales/es.json
packages/i18n/src/locales/nl.json
packages/i18n/src/locales/sv.json
packages/i18n/src/runtime.ts
packages/i18n/src/translator.ts
packages/i18n/src/types.ts
packages/i18n/tsconfig.json
packages/traveler-core/package.json
packages/traveler-core/src/cityAvailability.ts
packages/traveler-core/src/copy/ar.json
packages/traveler-core/src/copy/de.json
packages/traveler-core/src/copy/en.json
packages/traveler-core/src/launchContent.json
packages/traveler-core/src/walkCopy.ts
src/app/[locale]/lubeck/complete/page.tsx
src/app/[locale]/lubeck/page.tsx
src/app/global-error.tsx
src/app/page.test.tsx
src/app/page.tsx
src/components/commerce/CityPassPaywall.tsx
src/data/cityPassEditorial.json
src/data/lubeckEditorial.json
src/data/lubeckEditorial.ts
src/lib/account/copy.ts
src/lib/admin/content/importLubeck.server.ts
src/lib/commerce/cityPassCopy.test.ts
src/lib/commerce/cityPassCopy.ts
src/lib/commerce/copy.ts
src/lib/content/publicRepository.server.ts
src/lib/i18n.ts
src/translations/ar.json
src/translations/bg.json
src/translations/cs.json
src/translations/da.json
src/translations/de.json
src/translations/el.json
src/translations/en.json
src/translations/es.json
src/translations/et.json
src/translations/fi.json
src/translations/fr.json
src/translations/ga.json
src/translations/hr.json
src/translations/hu.json
src/translations/it.json
src/translations/lt.json
src/translations/lv.json
src/translations/mt.json
src/translations/nl.json
src/translations/no.json
src/translations/pl.json
src/translations/pt.json
src/translations/ro.json
src/translations/sk.json
src/translations/sl.json
src/translations/sv.json
src/translations/tr.json
```

## Commit 2 documentation review — 2026-09-27

Target subject (not committed): `docs(qa): record iPhone acceptance and checkpoint limitations`.

Commit 1 remains `c23b0eb6e10321a2e8c5e89d1d5e9f737dde90bd`, unchanged and not pushed. This session edits documentation only. The following classification covers **all 32 remaining paths** observed before staging; it supersedes the earlier proposed grouping where relevant.

| Remaining path | Classification |
| --- | --- |
| `.github/pull_request_template.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `AGENTS.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/agent/CITYWALK_ARCHITECTURE.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/agent/NATIVE_APP_SHELL.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/README.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `mobile/AGENTS.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/architecture/shared-i18n.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/arabic-physical-polish.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/audio-copy-overlay-heroes.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/dynamic-text-and-controls.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/empty-walk-rebuild.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/empty-walk-save.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/launch-languages.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/launch-reconciliation.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/loading-and-membership.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/local-source-identity.json` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/managed-media-diagnosis.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/native-ui-polish.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `docs/qa/citywalk-native-visual-parity/reviewed-checkpoint.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `packages/i18n/README.md` | COMMIT 2 DOCS/QA/GUIDANCE |
| `src/app/api/media/[assetKey]/route.ts` | HOLD FOR MEDIA/DIAGNOSTICS |
| `src/lib/media/mediaDelivery.server.ts` | HOLD FOR MEDIA/DIAGNOSTICS |
| `src/lib/media/storage/environment.server.ts` | HOLD FOR MEDIA/DIAGNOSTICS |
| `src/lib/media/storage/s3ObjectStore.server.ts` | HOLD FOR MEDIA/DIAGNOSTICS |
| `src/lib/media/storage/s3ObjectStore.server.test.ts` | HOLD FOR MEDIA/DIAGNOSTICS |
| `src/lib/media/mediaDiagnostics.server.ts` | HOLD FOR MEDIA/DIAGNOSTICS |
| `scripts/audit-launch-content.mjs` | HOLD FOR MEDIA/DIAGNOSTICS |
| `docs/qa/citywalk-native-visual-parity/launch-content-coverage.json` | HOLD FOR MEDIA/DIAGNOSTICS |
| `pnpm-lock.yaml` | HOLD FOR TOOLING/PNPM |
| `pnpm-workspace.yaml` | HOLD FOR TOOLING/PNPM |
| `.env.example` | HOLD / NEEDS DECISION |
| `packages/i18n/src/adapters.ts` | HOLD / NEEDS DECISION |

The two held source/env paths contain only residual whitespace relative to Commit 1, but remain outside a docs-only commit. No owner file is deleted or source hunk edited. The unfinished audio audit and coverage JSON remain held because summary responses omit audio; neither can establish a catalog-wide absence count. Media source/diagnostics and pnpm files remain untouched.

Documentation corrections:

- Current acceptance is explicit at the top of the ledger; old chronology, test counts and build evidence are historical. All six Save checks and the specific Start/Save/Rebuild round are owner-confirmed on iPhone. Android/release and unanswered physical checks remain unverified.
- The implementation commit is recorded; older “nothing staged/no commit/uncommitted” passages describe their dated sessions rather than current Git status.
- Static UI scope is six launch locales plus retained Arabic compatibility, 440 keys per catalog. Prose fallback and exact-locale audio remain separate.
- Removed unsupported whole-catalog audio-absence claims derived from summary metadata; retained separately observed English/German Holstentor evidence and dated prose coverage. No content was queried or published in this review.
- Later full-width/inline-check membership controls, responsive heroes and the compact German notice supersede old presentation/checklists. The final notice's visual result is not invented. Missing screenshots are UNVERIFIED, not an observed mismatch.
- Removed local absolute paths, LAN/process details, enrollment/internal-access links, temporary request/deployment IDs and log locations from the portable docs. Public asset IDs, dates, statuses, byte counts, build/version references and source hashes remain where useful. Raw pre-cleanup documents remain local only.
- The historical source manifest has an explicit scope annotation; its original file hashes/source digest remain unchanged. It is not a Commit 1 or installed-build identity.

Validation for this documentation-only preparation: reviewed path allowlist; staged whitespace check; Markdown local-link/table structure and JSON parsing; privacy/secret/artifact scan; Commit 1 and held-source hash preservation. No product tests are rerun for text-only edits. Historical 1,358-test and staged 75-test results retain their original scope. No claim of a fresh build, deployment or device check.

No Commit 2 is created here. No push, merge, build, deployment, CMS publication or submission.
