# Historic Tour progress — local implementation evidence

Branch `codex/historic-tour-progress`; base `4a74395838d0064e1fabf21f0f4ac3b9f951ecad`.
Worktree: `/Users/assia/.codex/worktrees/historic-tour-progress/lubeck-ai-guide`.

## Scope and implementation

Mobile Core required for both iOS and Android. Shared domain implementation and existing native tour/place screens changed; each platform's actual simulator/device acceptance remains unverified. Public Web and Admin Web not applicable to this local traveler-session slice.

- `packages/traveler-core/src/curatedProgress.ts` provides a separate versioned editorial execution record: immutable ordered stop identities, pending/visited/skipped statuses, start/update times and first-unresolved cursor. It does not invoke the personalized planner. Input validation rejects duplicate stops, malformed timestamps/status arrays and non-prefix execution. Mutations preserve the route and accept only the first pending stop.
- `mobile/src/lib/curatedProgressStorage.ts` persists each city/tour under a separate AsyncStorage key. Serialized mutations reject stale screens rather than losing another update. It neither replaces custom-walk state nor uploads location/history to the account API. Changed editorial definitions fail visibly rather than rewriting saved progress.
- `CuratedTourControls.tsx` replaces the old ephemeral Start/Next/Finish execution path for published tours. Start persists before navigation, reopening resumes the first unresolved stop, visited/skipped actions persist before moving forward, and completed status survives remount. Browsing another stop is read-only and offers Continue to the actual cursor.
- Local read/write failures display localized error and Retry controls. Reload uses request-version cancellation so stale async reads cannot replace the current tour state. A failed write never claims completion or navigates.
- The existing five Historic Tour stop identities/order and 25-place custom-walk catalog remain unchanged. Generic published tours use the same execution contract. Guest usage remains available; no traveler login is required.

Changed-file boundaries: new shared module/export, new storage and controls, existing native tour/place integrations, successful-deletion local cleanup, domain/storage/rendered UI tests and the older native source-contract assertion. No dependencies, lockfiles, native projects, auth/provider, schema, API, billing, Preview lock, DNS or production configuration changed.

## Actual validation

| Check | Result |
| --- | --- |
| Focused domain/storage/rendered controls tests | 11 passed |
| Full mobile tests, exact committed dependencies | 95 files / 784 tests passed |
| Mobile lint | Passed, zero warnings |
| Mobile TypeScript | Passed |
| Expo config validation | Passed |
| Expo Doctor | 21/21 checks passed |
| Root tests | 268 files passed / 27 skipped; 1,902 tests passed / 239 skipped |
| Root lint | Passed, 0 errors / 15 existing warnings |
| Root TypeScript | Passed after Next type generation |
| Root standard Next build | Passed with synthetic local auth/build configuration |
| db:generate | No schema drift, no migration generated |
| db:migrate and db:verify | Passed against disposable localhost-only PostgreSQL, port 56435, database citywalk_backend_local |
| Diff/whitespace | Passed |

The first Doctor invocation used stale installed packages and failed seven patch-version checks. Reinstalling from the existing committed mobile lockfile corrected the installed versions; no manifest/lockfile edit occurred. Final tests/lint/types/config/Doctor above use that installation. Initial clean-checkout Next type generation and missing synthetic build auth configuration were resolved locally without source workarounds.

## Remaining acceptance and rollback

This is guest local execution persistence, not backend or cross-device progress synchronization. Authenticated progress/favorites syncing, history/restart management and real pedestrian routing remain separate work. AsyncStorage progress is device-local; no GPS is stored in this new record. The existing successful-account-deletion cleanup also removes this new local traveler-state namespace; server deletion failure continues to preserve local state. A regression covers deletion of curated progress without deleting other-account preferences.

Manual iOS and Android checks remain: Start → visit → skip → terminate/relaunch → Continue → complete → relaunch; browse a different stop without altering progress; storage failure/retry; coexistence with an active custom walk; DE/EN/RTL presentation. Rendered component tests mock native bridges and do not certify device behavior.

Rollback is a source revert; new local storage keys can remain unused safely. No server migration or remote cleanup required.

At local validation, no commit/push/PR/merge/deployment/remote database mutation was performed. After automatic approval review required clarification, the owner explicitly authorized committing/pushing this branch and creating a Draft PR. Merge, deployment and remote database operations remain unauthorized. Existing Android Auth0, approved screens, Marketing work and other worktrees remain preserved.
