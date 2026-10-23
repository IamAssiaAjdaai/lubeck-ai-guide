# MKT-CONSOLIDATE-02 — authorized local preservation

**PASS — local commits only. PUSH / PR / MERGE / DEPLOY / LIVE AI remain NO-GO.**

Application commit: `edc5226f8ee9096a17d129c026a5af0744419a4e` — `feat(marketing): preserve canonical D2 and Concept A application` —158 changed files. Branch `codex/mkt-consolidate-01`, parent verified develop `d080f5186572df2c8d2e8a39d255a6a8be1f59bb`. No shared history rewrite. Public documentation follows in a separate dependent commit; final SHA is recorded in the owner handoff, not self-referentially inside this commit.

## Commit boundary and privacy review

The coupled application, D2/demo, Concept A, API/auth/tenants, Creative stack, seven existing additive migrations and their independent offline security/regression tests are kept in one coherent commit. Splitting into five feature commits would leave imports, migrations, npm commands or tests unresolved between commits. No new product implementation or backend contract redesign.

All158 cached file hashes matched the inspected bytes and the copied test tree. Content scan covered the original candidate text, dependency/migration diff, sensitive field occurrences and actual cached blobs, not just filenames. No actual local DB password/auth secret, provider key, private key, operator-home path, independent Human scorecard, coordinator key or reviewer identity is in this commit. There are explicit synthetic negative-test credential strings; these are not activated credentials. A broad follow-up pattern flagged the generic `/private/tmp/` safety-prefix check in the inherited disabled experiment runner; manual review confirms it is an OS temporary-directory restriction, not a personal path or credential. That false positive was classified; no security check or history was removed to silence it. Signature scans are not universal confidentiality proof.

**91 experimental research files** (v1 evaluation outputs, v2 spike, scorecards and deterministic blinding mappings/runners) are held outside this consolidation commit, even where already public upstream. Their six research-only npm entry points were removed from the canonical package scripts; original bytes are preserved in a private pre-task archive. The standalone QA service integration remains because it independently verifies production v1 boundaries without research outputs. No independent human evaluation was changed.

The old Compose scaffold with a fixed localhost QA password is also held, untouched. The existing local runner takes externally supplied random local DB/auth configuration. Three browser harnesses now accept a fresh evidence directory; authenticated QA writes random credentials/session state only to a configurable private directory. No Mac home path is embedded. One inherited trailing space was removed. These are publication/verification hygiene changes only.

## Exact verification

- **1627 unit tests passed,0 failed,238 skipped** on a copy of the staged application tree, without held research files. The previous1726 total included99 research tests now deliberately excluded; this is a selection difference, not missing product regression coverage.
- **117 Marketing/Creative DB checks passed,0 failed/skipped**, ten files, new synthetic rows in the existing isolated local QA DB. Test-process signup permission did not enable signup on the running app. Source integrity, expiry, tenant/media permissions, costs/unknown holds, stale review, version/export and intercepted transport checks retained.
- **271 demo browser checks** repeated at1440/1024/768/390/375; **25 closed-auth checks** repeated at1440/768/390/375. No attempted external browser requests; automated axe-tag violations0 in tested states. Existing257-check full authenticated Pack/Creative/export journey is reused; no runtime behavior changed. Manual assistive-technology/device and independent human scoring remain unverified.
- Marketing UI/API types PASS; Vite build PASS; focused harness lint PASS; cached whitespace check PASS after correction. Root blockers remain the existing GenericCityContent/GenericPlaceContent page exports and offline Google Fonts fetch. CITYWALK was not edited to bypass them.
- Registration remains closed; mock providers only; real transport/spend/deadline gates remain disabled, outbound guard active. No real model operation is demonstrated.

## Preservation and assets

All1209 pre-existing dirty source files matched before staging, including all117 protected Human Review files. One later dirty-path addition was observed in a source checkout and preserved, not reverted. Historical source worktrees/indexes, CITYWALK, private Human data and archived QA remain intact. No destructive Git operation/worktree/branch deletion.

All11 D2 photo assets were visually inspected and verified against their existing provenance hashes; they are fictional synthetic editorial imagery, not customer proof. All8 curated screenshot binaries were also inspected and preserved byte-for-byte. Font licenses remain bundled. `ASSET-PROVENANCE.json` removes local generation paths and does not claim public release rights/trademark/legal approval. Older inactive design source remains archival and is not an active competing route.

`APPLICATION-FILES.json` lists every committed application path/hash. `EXCLUDED-ORIGINAL-FILES.txt` lists original430-inventory paths deliberately left uncommitted; raw QA ZIPs/logs/inventories and research remain on disk. Fresh browser output is local-only, excluded from this documentation commit. The older `consolidate-01/public/` bundle is historical baseline evidence; its1726 count and uncommitted-source status describe when it was captured, not the final application commit. This document and TEST-RESULTS.json qualify the current evidence.

## Future authorization and safe integration proposal

1. Separately resolve the approved CITYWALK CityPageContent/PlacePageContent helper naming versus #408/#409 in the host track; restore its complete build/type gate. Do not wholesale merge the old Draft stack or CI-only branches.
2. Adapt the independent Marketing CI to the canonical route/harness commands, retaining all auth/tenant/DB/integrity/cost checks. Verify CI/deploy integrations cannot publish automatically.
3. Owner separately authorizes **push of the exact two local commits** and **one Draft PR to develop**. Neither action is authorized here. Reverify live develop, source diff and exact-SHA CI first; do not silently rebase shared history.
4. Owner visual approval and all commercial, legal/name, operational, human quality, privacy-retention and provider liability gates remain separate. External paid pilot and real image/video generation remain NO-GO.

No push, PR creation, merge, deployment, production DB/infrastructure change, external email, provider activation, live AI call or spending occurred. The application remains available on its existing loopback-only local runtime.
