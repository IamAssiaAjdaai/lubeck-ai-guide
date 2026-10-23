# MKT-CONSOLIDATE-04 — CI readiness

Date: 2026-10-23. Remote baseline: `3d34f1103c3b9cf4e4850903a0d01d29f9c6a7f2`, Draft PR #425 targeting develop. Local CI patch only; no push, merge, deployment or provider activation.

## Exact-head remote evidence

[CI run 39953609359](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/actions/runs/39953609359): mobile FAIL; build PASS; database-integration PASS. Restore drill 39953609401 and Cloudflare validation 39953609686 PASS. The successful build includes lint (0 errors, 11 warnings), units (1627 passed, 238 skipped), coverage and default Turbopack Next build.

Mobile Expo Doctor requires these installed → expected patches: @expo/ui 57.0.25 → 57.0.26; expo 57.0.30 → 57.0.31; expo-location 57.0.21 → 57.0.22; expo-network 57.0.2 → 57.0.3; expo-observe 57.0.25 → 57.0.26; expo-router 57.0.28 → 57.0.29; expo-widgets 57.0.26 → 57.0.27. Mobile manifests/lockfiles are byte-identical between develop d080f518 and PR head: inherited failure, not a Marketing change.

Local standalone tsc after Webpack generation rejects additional GenericCityContent/GenericPlaceContent page exports. Turbopack and Webpack generate different page validators; the actual remote default build passes. Locale page sources are base/head identical. Local guarded Webpack cannot download Google Geist fonts; layout/config are also base/head identical. This is an offline build limitation, not evidence of a failed remote host build.

## Reuse and dependencies

[#421](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/421), head d3f7869db5bf1a0fca99984fdf035ceefd4b4f1d, already fixes all seven exact Expo mismatches and a walk-flow waitFor. Its CI passes. No duplicate mobile changes were copied here. The same three mobile blobs occur in green CI-only [#423](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/423); that combined evidence branch is not a product merge recommendation.

[#408](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/408), head 90c7ebdaefc83bf63239de7069678858ff498dc6, contains the host helper extraction. Its helper bodies match approved #402 CityPageContent/PlacePageContent after export-type normalization. Resolve that host track using approved names; do not duplicate it on Marketing or wholesale copy its unrelated snapshot/doc changes.

The existing dirty Android Auth0 worktree has package/lock changes. A non-mutating git apply --check of #421 fails those hunks. Reconcile that work before adopting #421; no file was patched or discarded.

## Minimal local change

Restore/adapt Independent Marketing SaaS workflow to the canonical architecture. Reuse existing real customer journeys and outbound guard, deterministic mocks and seven existing migrations. New runner strips inherited provider keys, closes live/spend gates, uses isolated loopback PostgreSQL and private mail/session storage. Only summary JSON and screenshot PNGs are artifact-eligible. No app source, CSS, assets, API contracts, dependencies, lockfiles or migrations change.

Database adversity tests retain exhausted caps and unknown-charge holds. Browser journeys use a separate fresh synthetic database instead of resetting reservations. Restarted closed-auth tests honor the existing persisted 60-second auth rate window. Synthetic local registration is enabled only for initial test setup, then closed registration and owner-session continuation are verified. Ordinary customer/public gates remain unchanged.

## Local results

See LOCAL-RESULTS.json. Full clean candidate: 1635 unit tests PASS, 238 skipped (baseline 1627 plus eight CI tests). Focused Marketing: 194 PASS, 86 skipped; separate PostgreSQL suites: 117 PASS, zero skipped. Authenticated browser: 257 checks; closed auth: 25; public D2 demo: 271. API/UI/core typechecks, scoped lint, Vite build, migration repeatability and database integrity PASS. Marketing lint retains three inherited native-image advisories; new CI scripts have zero warnings. YAML parses; actionlint unavailable.

Local browser uses installed Chrome; new workflow installs bundled Chromium on Linux. That new exact-head remote behavior remains UNVERIFIED until an authorized push. Root host build is the passing remote baseline, not a newly rerun local offline build.

D2 source is unchanged. Screenshots at 1440, 768 and 390 match committed baseline pixels exactly. At 375, dimensions match but 0.545122% of pixels differ (RMS 0.107824; maximum channel delta 33). Do not claim four-width pixel identity or measured conversion improvement. No visual adjustment was made to hide this raster difference.

## Preservation, publication and readiness

117/117 protected Human Review files match recorded hashes. Historical QA/private materials remain excluded. Of 1209 historical source inventory entries, 1208 match; the remaining file is concurrent work in the separate Android Auth0 worktree and was not changed by this task. Preserve its current content. No confidential reviewer key, scorecard, credential, auth state or raw test log is part of this patch.

PASS: local Marketing/security/database journeys; old-head remote database, host build and infrastructure checks. FAIL: old-head remote Mobile Expo check. BLOCKED: new-head remote CI pending push authorization; Linux browser behavior and final owner acceptance. Reviewable locally; PR is not yet merge-ready.

Recommended order: reconcile Android work; owner-approved #421 adoption on CITYWALK/develop; authorize normal push of this CI-only patch to existing #425; require all exact-head checks and owner review before any separate merge decision. Handle #408/#402 overlap on the host track. Never merge #423 merely for green evidence. Earlier Marketing stack #406/#407/#409/#411/#414/#415/#417/#420 overlaps canonical consolidation; retain them until dependency/source coverage and owner closure decisions are settled. No PR is closed here.

## Changed-file boundary and reproduction

- .github/workflows/marketing-saas.yml
- scripts/marketing-consolidate-ci.mjs
- scripts/marketing-consolidate-ci.test.mjs
- scripts/marketing-consolidate-browser.mjs
- scripts/marketing-consolidate-closed-browser.mjs
- scripts/marketing-consolidate-demo-browser.mjs
- docs/qa/marketing-saas/consolidate-04/CI-READINESS.md
- docs/qa/marketing-saas/consolidate-04/LOCAL-RESULTS.json

Reproduce on an isolated disposable local PostgreSQL instance with a marketing_* database on a non-default loopback port: set MARKETING_DATABASE_URL, MARKETING_ORIGIN and MARKETING_API_PORT to CI-owned local services, then run `node scripts/marketing-consolidate-ci.mjs`. The database user needs CREATE DATABASE for separate synthetic browser fixtures. Never point this runner at production. CI workflow supplies the disposable PostgreSQL service. Private logs/screenshots remain outside Git; artifact publication is restricted to synthetic screenshots and aggregate summary. External paid pilot remains NO-GO.
