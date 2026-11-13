# CITYWALK remote preservation — 30 October 2026

## Result

48 registered worktrees inventoried; 38 directories present: 23 CITYWALK/shared and 15 independent Marketing. Ten registered paths are missing; their retained commit objects were checked without pruning. Ten dirty CITYWALK/shared snapshots committed plus two previously local-only existing commits pinned. Every one of the 12 remote refs matched its local commit. Exact file lists are in FILE-MANIFEST.json. No application source was edited for this backup.

Original branches, HEADs, indexes and files were preserved through alternate-index commit-tree snapshots. The original worktrees intentionally remain dirty; their intended safe contents match the remote snapshots. Do not infer missing backup from ordinary git status.

| Backup branch | Exact verified SHA | Safe changed files |
|---|---|---:|
| [codex/backup-20261030-onboarding-s01-s14-qa-owner-review](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-onboarding-s01-s14-qa-owner-review) | `ab797b5ccefdbf672b2ad6280b9cb4b4a936a2fd` | 1256 |
| [codex/backup-20261030-shared-agent-skills](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-shared-agent-skills) | `7a016d177fe4176c10d1cd82b1da5c538dca76e9` | 48 |
| [codex/backup-20261030-mobile-release-readiness](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-mobile-release-readiness) | `f39f8889341b678dd081d7d31170d2ec5042bc8f` | 10 |
| [codex/backup-20261030-android-auth](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-android-auth) | `bd8d565e98ebafd10fa3d8418e493ae7e90a67e6` | 10 |
| [codex/backup-20261030-hyperdrive-check](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-hyperdrive-check) | `d3f173f1736ff3809c02f9eadab77faf0acaec73` | 4 |
| [codex/backup-20261030-landing-release](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-landing-release) | `75ad69eadbb4bfb005e9733d63e10352dad81bb9` | 2 |
| [codex/backup-20261030-landing-runtime-rc](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-landing-runtime-rc) | `c5a08a400384b5e7abed184c8ecc99bba2944ab7` | 32 |
| [codex/backup-20261030-play-aab](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-play-aab) | `25d0d6190eaec546175d22d8bddbe961aa637f97` | 2 |
| [codex/backup-20261030-release-v1](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-release-v1) | `7f9e0a2667254430ee0d093f78e500aa33527bd4` | 5 |
| [codex/backup-20261030-shareable-walks-qa](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-shareable-walks-qa) | `31d3d340c6abc405245e4d22f45be1017295b232` | 1 |
| [codex/backup-20261030-head-brace-expo-qa](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-head-brace-expo-qa) | `0c8a7f53bd4dd5854649702fb41dec52f592c165` | 0 |
| [codex/backup-20261030-head-finish-review](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/codex/backup-20261030-head-finish-review) | `14d1fae8d9b1489c983760a9787d36c7fdee2925` | 0 |

The first ten rows represent 10 new snapshot commits. The last two pin existing commits (no new commit). The later documentation-only integration commit is additional and its exact SHA is reported in the handoff/PR.

## Preserved scope

The onboarding snapshot includes approved Screens 01–13, the unapproved Screen 14 candidate, Slice 01/Slice 02, storage safety, Android Back focus guard, regression tests, screenshots/QA, original worksheet and owner-decision records. The confirmed D01–D08/D10–D13 decision record is saved alongside historical evidence; D09/D14 and Screen 14 remain pending. Backups are preservation, not approval to release all contents.

## Explicit exclusions and local-only material

No intended safe Git-visible changes remain unbacked at verification. No actual secret was found in the selected files. Synthetic CI localhost Postgres/test fixtures were individually reviewed. Filename and content scans excluded credentials/environment/signing/dumps/build output; this is not a claim that every ignored local file is safe.

- Four reproducible landing-runtime generated files were excluded: tools/landing-visual-395/dist/{_headers,index.html,robots.txt,styles.css}. Four dist/screenshots PNGs were retained as QA evidence.
- Ignored .env/.secrets/certificates/signing material, local database/runtime state, node_modules, caches, compiled client/build artifacts and generated native projects remain local and were not published. Ignored native project directories in other worktrees were not exhaustively reviewed for manual edits; they are explicitly not claimed remotely backed.
- Nested registered worktree directories were excluded from parent snapshots; their actual commits were checked independently. No accidental embedded gitlinks were staged.
- The 15 independent Marketing worktrees were inventoried but not backed or changed by this CITYWALK task. Their unfinished work remains intact.
- Missing worktree directories cannot supply uncommitted files. Retained HEAD commits were checked for remote ancestry and the two uncovered commits pinned.
- No reset, clean, stash, prune, deletion, force push, original-branch checkout, migration, deployment or store publication.

## Remote verification

Each push used git push origin <SHA>:refs/heads/<backup>; git ls-remote --exit-code origin refs/heads/<backup> matched. Full SHA and remoteHead evidence is in FILE-MANIFEST.json. Head ancestry coverage was checked for the clean worktrees. GitHub CLI query failed with `zsh:1: command not found: gh`; the connected GitHub API supplied current PR evidence instead. All backup pushes succeeded.

## Integration gate

Target: develop at `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main untouched. No application merge is authorized by snapshot creation. See INTEGRATION-PREFLIGHT.md for blockers and source-to-successor mapping.

## Final verification observation

All 13 refs pushed by this task matched their remote SHAs at final verification. All selected safe working-file contents still match their snapshots. A separate backup activity changed the onboarding worktree from the inventoried original HEAD/branch to `backup/citywalk-full-work-20261030` at `40f69ea9a5f40ec2df2a8f4215f0f6d076f543ac`. That additional remote ref was verified independently. Its complete Git tree is identical to our onboarding snapshot `ab797b5ccefdbf672b2ad6280b9cb4b4a936a2fd` (empty git diff). This task did not perform that branch checkout/reset/ordinary-index commit and has left it untouched. Therefore the earlier original-HEAD preservation statement describes this task's non-mutating snapshot procedure, not a guarantee that another process did not change the worktree. No backed-up content was lost.

The final observation is recorded by a second documentation-only commit. Final totals for this task: 12 new commits (10 snapshots + 2 documentation commits), 13 branches pushed (12 backup + 1 documentation integration), 0 shared-target merges. The separately observed backup ref is not counted as a push made by this task.
