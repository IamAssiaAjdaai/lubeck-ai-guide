# Saved walks and guest-first Account — 2026-09-27

**Subsequent product decision:** [Launch visibility and account Saved Walks](account-saved-walks.md) supersedes the local-only permanent-save policy and Account benefit limitations below. These earlier results remain historical; existing local records are preserved.

Implementation review only. **Account UX is superseded by [Account/Profile hardening](account-hardening.md); validation below records the preceding saved-walk/guest-first checkpoint.** Branch `feat/saved-walk-account-ux`, based on `74684d3faad7df3d5ed9e2b63173125debb87fae` (merged PR #142). The held media/tooling stash was not applied. No backend, auth-provider, environment, payment, media, or native dependency changes. No build, deployment, publication, commit or push.

## Duplicate cause and exact identity

The native save transition previously matched only journey/session ID. Opening a saved record deliberately creates a fresh journey ID, so another save created another record. A display title is not involved.

The identity is a JSON tuple of:

1. City slug.
2. Unique ordered itinerary: visited prefix followed by remaining suffix.
3. The actual route finish coordinates, or null for no finish destination.

Identity excludes locale, translated names, session ID, start timestamp, deadline, elapsed time, current position, distance travelled and visited/current-stop progress. Normal visits move a stop from the remaining suffix to the visited prefix without changing the tuple. Reordering, adding, removing/skipping, shortening the itinerary or changing its actual finish changes the route. Planner interests, pace and time budget are not additional identity fields once the resulting stops and finish are identical. The identity stays private in local storage/memory; it is not logged or sent anywhere.

Save eligibility still validates every itinerary stop against already-loaded published place data. One valid stop is enough. Empty, unresolved, ineligible or still-loading data cannot be saved. No extra network fetch is required. A completed itinerary remains eligible.

## Save, update and removal

- Preview, Active and Finish use the same derived **Save walk / Saved ✓ / Update saved walk** state. Unchanged Saved is disabled. Existing empty-plan feedback and Start guards remain intact.
- Opening a saved V2 route gives the current session a `savedWalkId` link. Saving also persists this link so subsequent edits/restarts update the original saved record, while preserving its ID and first `savedAt` timestamp.
- Match precedence within the city: explicit saved-record link, existing session-ID record (backward compatibility), then exact route identity. A new, materially different unlinked route gets a distinct record.
- Unchanged saves do not rewrite or reorder the saved collection or change its timestamps. A changed save updates exactly the linked/matched record and its `updatedAt`. Old records without `savedAt` do not receive an invented historical creation date.
- Save/remove/membership transitions use the existing mutation queue. Save re-reads and validates current data under that queue, including finished sessions; a stale or empty callback cannot overwrite a valid saved record.
- Saved-state subscribers refresh mounted walk/Saved surfaces after save/update/removal. Save completion adds only lineage to UI state and cannot roll back a newer membership edit.
- Explicit removal remains in Saved. Removal changes saved records only, leaving current membership and favorites intact. Removing a saved copy permits an explicit later Save; no automatic recreation occurs.
- Historical duplicates are not merged, purged or migrated. An explicit edit changes only its target record. Historical legacy trip storage remains readable through Saved and is not rewritten by this change.
- Current-session lineage is written before a saved-record write. If the latter fails, only a harmless unresolved link can remain; Saved status is derived from the actual saved collection, never the link alone. Retry revalidates current data.

## Account capability audit

Evidence is local implementation, not a new live authentication or release acceptance run.

| Capability | Actual boundary |
| --- | --- |
| Email account creation, sign-in, session and sign-out | Implemented in Better Auth and native client. `factory.server.ts` enables email/password, public factory opts into signup, minimum password length 12. `autoSignIn: false`: successful signup directs the owner to sign in explicitly. |
| Apple / Google | Not configured in the auth factory; no provider buttons added. |
| Persistent account identity | Auth user/session implemented; native displays signed-in email. |
| Anonymous traveler use | Implemented; root router has no auth gate. Exploring, planning, current journey, local saves and favorites do not require an account. |
| Native local traveler data | Saved walks, favorites, current journey, locale, private trip feedback, review history and legacy trip/preferences storage stay on-device, separate from `citywalk-auth` SecureStore auth state. |
| Guest linking / richer traveler profile | Existing `/api/account/link-guest` transaction and `traveler_profiles` / `traveler_guest_links` tables. Web calls it; native currently does not. It associates visitor identity and locale, **not** saved-route/favorite/progress synchronization or local-data migration. Backend-ready for a separately reviewed native integration. |
| Paid access | Backend user-scoped entitlement/commerce infrastructure exists. This does not establish native store purchase/restore acceptance. No payment UI or promise added. |
| Cross-device walks, favorites, progress/history | No native sync/restore transport in this path. Future work; not promised in the UI. |

## Guest-first UX and local-data boundary

Signed-out Profile introduces a CITYWALK account, states that CITYWALK works without one, and offers profile/account management. The local-data boundary remains documented here; the follow-up hardening removes the verbose no-sync notice from the screen. Create account is primary; Sign in secondary; Continue as guest remains available. Email/password inputs appear only after choosing an entry. No fake social buttons or mandatory login prompts.

Email entry uses the existing keyboard-adjusting ScrollView, scalable inputs with minimum height/padding, wrapping full-width action controls, localized validation, inline busy state and Back/guest escape. Android hardware Back also closes the email entry. A ref prevents duplicate submissions before React rerenders; late responses after closing do not reopen the form or show stale errors. Closing an already submitted request does not claim to undo a server-side authentication/account operation.

Successful signup clears the password and opens Sign in with the existing localized creation notice. Sign-in/sign-out operate only on Better Auth; they do not clear, rewrite or migrate guest traveler data or locale. Profile links to the canonical Saved screen rather than showing a separate legacy-only saved list. That screen retains current and historical saved routes and explicit removal.

New native wording covers de/en/da/sv/nl/es plus Arabic. Existing Web wording is unchanged. Native bridges, keyboard behavior, SecureStore and real service outcomes still require device verification; mocked tests are not physical acceptance.

## Validation — preceding checkpoint

| Final command | Result |
| --- | --- |
| `npm --prefix mobile run test:run -- --maxWorkers=2` | **487 passed / 57 files**, zero skipped, zero failed. |
| `npm run test:run -- packages/i18n packages/traveler-core` | **62 passed / 4 files**, zero skipped, zero failed. Existing Vite configuration warnings only. |
| `npm run i18n:check` | **447 UI keys × 7 locales, zero errors.** |
| `npm --prefix mobile run typecheck` | PASS |
| `npm --prefix mobile run lint` | PASS, zero warnings |
| `./node_modules/.bin/tsc --noEmit --incremental false` | PASS; includes shared packages and Web consumers |
| `npm run lint` | PASS |
| `git diff --check` | PASS |

No backend/auth source changed, so isolated DB integration tests and migrations were not needed or run. No build was run. Remote `develop` was verified read-only with `git ls-remote`: it still matches the base SHA above. Nothing is staged.

Regression coverage includes different session IDs and translated place names, reopened edits, finish/order/city identity distinctions, unchanged-save timestamps, completed routes, historical duplicates, explicit removal notifications, empty-save races, actual Preview save labels, signup/sign-in/sign-out and canceled/failed requests without local storage mutations. Native bridges and authentication service responses are mocked.

Rerun notes: the initial focused run had eight outdated expectations (the new lineage write and Save label); the corrected focused run passed 88 tests across five files. The first complete mobile run had 475 passes / 12 failures: five 5-second timeouts while other validation processes ran concurrently, and seven outdated mocks/assertions for the new Profile/storage contract. Subsequent limited-worker runs had 486 passes / one remaining old Arabic-title expectation (twice, because the first attempted test edit did not match its literal). The final limited-worker run passed all 487. One diagnostic Profile-only run had one pass / one failure / 18 filtered skips before that correction. Final full-suite results have no skips. Timeout limits were not increased. Existing route/data assertions remain; tests now account for saved timestamps/lineage and verify Profile links to the canonical Saved view instead of the former legacy-only list.

Initial mobile typechecks identified a missing message-property reference and test typing mistakes; all were corrected before the final passing checks. Initial mobile lint identified effect placement before its state setter; the effect was moved below the declaration. No accepted navigation, audio, media or planner behavior was changed to make tests pass.

## Physical iPhone checklist — all pending owner confirmation

Do not delete app storage.

1. Build/save a valid route. Verify Saved ✓, tap repeatedly, open Saved and confirm exactly one new record. Reopen it, switch EN → DE → EN and restart the app; it remains the same saved route.
2. Remove/add/reorder a stop on that reopened route. Verify Update saved walk; save and check the original record was updated. Build a materially different new route and confirm a distinct record.
3. Remove the last draft stop: Start/Save remain disabled with the accepted explanation, and the old valid saved copy survives. Complete a non-empty itinerary and confirm its save state is valid.
4. Remove a saved copy explicitly in Saved, return to the current walk and verify Save walk is available while membership and favorites remain unchanged. Retain any historical duplicates until you explicitly remove them.
5. As a guest, explore/build/save, open Profile and verify the concise profile/account-features copy plus Create account/Sign in/Continue as guest. Open each email entry and Back/Continue as guest; confirm the same walk, progress, favorites and language remain.
6. Exercise invalid input, failed login, then approved test-account signup/sign-in/sign-out. Verify local saves, current walk/progress, language and review history survive. Signup should explain that sign-in is still required. Do not infer cross-device synchronization.
7. At 110% text size while mounted, inspect German/Dutch labels, Arabic RTL, email keyboard, Back/guest escape, error text and inline busy state. No clipping, tiny text or obscured submission controls. Repeat on Android separately; Android acceptance is not inferred.

## Separate future work

- Define an authenticated saved-walk/favorites/progress sync contract, ownership, conflict resolution, privacy and guest-to-account migration before advertising cross-device recovery.
- Review native guest identity linking and whether/when to expose persisted profile preferences; do not mistake the existing link endpoint for route migration.
- Configure and verify Apple/Google only in a separately approved provider integration.
- Verify paid access/store restoration separately before adding benefits copy.
- Real iPhone and Android account-session, keyboard/accessibility, persistence and release-build acceptance remain separate gates.

## Exact changed files

```text
docs/qa/saved-walk-account-ux/README.md
mobile/src/app/account/index.tsx
mobile/src/app/saved.tsx
mobile/src/components/NativeWalkFlow.tsx
mobile/src/lib/walkStorage.ts
mobile/tests/account-guest-flow.test.tsx
mobile/tests/native-city-experience.test.ts
mobile/tests/native-screen-chrome.test.tsx
mobile/tests/native-v2-regressions.test.tsx
mobile/tests/product-design-polish.test.ts
mobile/tests/saved-route-identity.test.ts
mobile/tests/walk-flow.test.tsx
mobile/tests/walk-save.test.ts
mobile/tests/walk-session.test.ts
packages/i18n/src/locales/ar.json
packages/i18n/src/locales/da.json
packages/i18n/src/locales/de.json
packages/i18n/src/locales/en.json
packages/i18n/src/locales/es.json
packages/i18n/src/locales/nl.json
packages/i18n/src/locales/sv.json
```

No dependency/manifest changes were needed. All implementation changes are native; shared changes at this preceding checkpoint added seven UI keys per catalog. The follow-up hardening adds profile/security wording as documented separately. Existing Web keys and behavior remain unchanged.
