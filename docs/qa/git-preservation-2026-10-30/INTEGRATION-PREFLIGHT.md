# Safe integration preflight — review only

## Verdict: BLOCKED for product merge; documentation-only successor prepared

Exact target `develop` = `9f8470077dfa8eb7663246905bffd3cf8a0c6591`. Backup remote verification completed before this branch. The integration branch adds only this evidence package and the confirmed owner-decision record. It deliberately merges no application implementation. No integration merge, production release or Screen14 approval is claimed.

## Source-to-successor matrix

| Exact source | Successor / gate |
|---|---|
| `codex/backup-20261030-onboarding-s01-s14-qa-owner-review@ab797b5ccefdbf672b2ad6280b9cb4b4a936a2fd` | Approved Screens 01–13 and Screen08 foundation → isolated approved-only successor after separating Published Active Walk/Screen14 and D09/D14 seams. Preserve all existing controls, guest access, Better Auth and City Pass. No whole-snapshot merge. |
| `codex/backup-20261030-shared-agent-skills@7a016d177fe4176c10d1cd82b1da5c538dca76e9` | Shared skill/docs subset may become a separate documentation successor. Existing rejected ComingSoon source/QA is historical backup only; do not restore or replace LandingNext. |
| `codex/backup-20261030-mobile-release-readiness@f39f8889341b678dd081d7d31170d2ec5042bc8f` | Successor to #389 only after comparing current release configs/dependencies against develop and native acceptance; no store/release authorization. |
| `codex/backup-20261030-android-auth@bd8d565e98ebafd10fa3d8418e493ae7e90a67e6` | Separate native auth successor only after compatibility and device review; preserve one Better Auth system. Not included in onboarding integration. |
| `codex/backup-20261030-hyperdrive-check@d3f173f1736ff3809c02f9eadab77faf0acaec73` | Separate infrastructure/Preview successor with isolated resources and explicit operational gates; no production changes. |
| `codex/backup-20261030-landing-release@75ad69eadbb4bfb005e9733d63e10352dad81bb9` | Keep approved LandingNext; reconcile with landing-runtime snapshot before selecting any successor. No automatic homepage replacement. |
| `codex/backup-20261030-landing-runtime-rc@c5a08a400384b5e7abed184c8ecc99bba2944ab7` | Keep approved LandingNext and QA artifacts; compare source overlap with landing-release. No automatic ComingSoon restoration. |
| `codex/backup-20261030-play-aab@25d0d6190eaec546175d22d8bddbe961aa637f97` | Separate packaging/dependency successor after reviewing SDK/package-lock overlap with release-readiness and android-auth. No store upload. |
| `codex/backup-20261030-release-v1@7f9e0a2667254430ee0d093f78e500aa33527bd4` | Separate packaging/admin successor; inspect authentication/capability and migration history. No wholesale merge. |
| `codex/backup-20261030-shareable-walks-qa@31d3d340c6abc405245e4d22f45be1017295b232` | Existing #377 depends on #373; review .gitignore separately, preserve custom/published execution identity and current/saved slot protections. |
| `codex/backup-20261030-head-brace-expo-qa@0c8a7f53bd4dd5854649702fb41dec52f592c165` | Existing SDK dependency patch must be compared with present package-lock and release readiness before application. |
| `codex/backup-20261030-head-finish-review@14d1fae8d9b1489c983760a9787d36c7fdee2925` | Existing one-line PublicStoreReview style change remains backup-only pending current Finish flow review. |

## Verified overlap and dependency evidence

- GitHub #450 is merged into develop as bc3896278a81b0c3327c7edfbd4da4421b73a8b8 (curated progress). #452 is merged as 84a8a570389bb8bcf85250f1b528fd7b2687ebd8 (selected-place regeneration). Both occur in the fetched target history.
- Target changes since onboarding base 98a1dbb overlap mobile city/place and tour screens, accountLocalData, traveler-core index/planner, curated controls/progress and tests. The backup adds PublishedActiveWalk/activePublishedTrip and curated storage seams alongside approved work. Conflict-free textual merging would not establish domain compatibility.
- #454 remains a draft selected-place picker at 52a7ca7555a04ddbc4a11277a01395e360be8183 targeting develop; preserve its dependency on #452 and avoid silently replacing its planner controls.
- #377 shareable native → #373 integration → develop; #370 sharing API, #365 Finish, #389 release readiness, #393 beta safety, #419/#422 Preview chain, #375 commerce and #354 guide remain separate open dependencies. No billing/auth/infrastructure changes are imported. OPEN-PRS.json preserves exact open head SHAs and bases.
- #451 remains open despite a newer publishing queue merge #453 in develop: apparent overlap requires owner/source comparison, not duplicate application.
- No release-target database/migration, legal publication, source-trust, photo-provenance or payment compatibility was established by a backup snapshot. These remain required before relevant code is integrated.

## Required dependency order before application integration

1. Freeze exact source and target SHAs; extract an approved-only successor from onboarding while retaining the unapproved Screen14 candidate remotely. Review ordinary Place Detail versus published execution seams without deciding D09/D14.
2. Reconcile merged curated-progress/current-saved-walk models and selected-place planner controls. Keep navigation lease identity separate from storage freshness; retain classified observation/guarded preview writes.
3. Verify approved Screens01–13 and Slice01/Slice02/focus guard remain unchanged, including guest, EN/DE, return semantics and custom/published domain separation.
4. Run focused and full mobile/shared tests, TypeScript, lint, localization, iOS/Android bundle exports on the actual successor plus target. Complete relevant web/build/database checks in isolated environments only.
5. Review legal/photo provenance and outstanding native physical-device/AT acceptance. Midnight/time-zone is unresolved separate work; no silent fix.
6. Only merge after exact-SHA CI, required Preview/manual acceptance and approval scope are established. Otherwise leave draft review branch.

## Test and CI status

Preservation checks: 12/12 backup refs verified; selected working contents match each of the ten snapshots. Source indexes/HEADs preserved. Documentation-only commit receives diff/JSON/link-target validation; application tests/builds are not applicable to this commit. No combined application candidate was produced, therefore full product integration tests/CI/Preview/device acceptance are NOT RUN and NOT PASS. The current develop check-runs API returned total_count=0; absence of runs is not green CI. Earlier mobile source verification is historical evidence, not proof for a merged successor.

## Preserved decisions

S01–S13 approvals and implemented Screen08 behavior remain protected. D01–D08 and D10–D13 are recorded as owner UX/architecture decisions; D07 exact placement is pending. D09/D14 and Screen14 remain pending. No UI/code consolidation is performed.
