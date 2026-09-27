# Account lifecycle isolated Preview validation — 2026-09-27 UTC

Source: `a6aa9984fd65bffa4c09100f4c9e61c1414e110e` on `feat/account-lifecycle`.
Commit: `feat(account): complete password recovery and account deletion` (33 files, 1,178 additions, 21 deletions).

Exact Preview: https://lubeck-ai-guide-c5pcfqjhk-iamassiaajdaais-projects.vercel.app

The initial evidence below was recorded after the authorized implementation commit/push. This report is included in the later documentation-only acceptance checkpoint. No merge is authorized.

## Deployment and isolation

- Vercel branch and commit metadata match the exact pushed SHA; deployment **READY**.
- Isolated lifecycle database had **0 public tables** before deployment. After the automatic build: **15/15 committed migration hashes and timestamps match**, **38 public tables**, required auth/account Saved Walk tables present.
- Initial user, account, session, verification, account Saved Walk, traveler profile and guest-link counts were all **0** before smoke testing. No Production user/account data was copied. No seed or content import ran.
- Exact-branch database/auth/Redis/Resend/test-sender bindings remained unchanged through deployment; dynamic auth URL handling retained.
- Production active deployment, Production deployment list, develop deployment list and all original environment-record fingerprints were unchanged from the pre-push snapshot.
- Better Auth installed/locked remains **1.7.2**; shared password bounds **12–128** unchanged.

## Remote synthetic smoke: 40 assertions passed

Two synthetic accounts were created through the deployed auth API. One used the documented Resend test recipient; the other served as an isolation control. No existing/non-synthetic account was modified or deleted.

- Signup, sign-in and authenticated session: PASS for both accounts.
- Account Saved Walk list, anonymous deletion rejection, wrong-password rejection and preservation after rejected deletion: PASS.
- Existing and unknown reset requests returned identical generic responses; malformed email rejected: PASS.
- The fourth reset request for a unique nonexistent synthetic email returned **429**, proving the deployed limiter path ran with the approved Preview Redis configuration. No email was sent for the nonexistent account.
- Exactly one reset request for the existing test-recipient account was made. Resend listed the newly accepted message and allowed its retrieval through the authenticated API. Sender/recipient matched `onboarding@resend.dev` / `delivered@resend.dev`.
- Reset URL origin matched the exact Preview above, path `/account/reset-password`; token present only in the fragment. Token was inspected only in memory, never printed or written to the QA report. Deployed token-validation API returned **200**.
- Commerce-linked, inactive-staff and audit-linked synthetic control-account deletion attempts each returned **409**; the account/session remained valid. Only synthetic guard fixtures were inserted and subsequently removed; no payment-provider calls or real staff/content changes.
- Explicit current-password/confirmation deletion returned server-confirmed success. Read-only verification found zero matching user, credential account, session, Saved Walk, traveler profile, guest-link and reset-token rows for that deleted account.
- Deleted credentials could no longer sign in, the old session was rejected, and its outstanding reset token became invalid.
- The other synthetic account's Saved Walk and authenticated session remained intact. This control account/save remains in isolated Preview as test data.

### Saved Walk fixture boundary

No traveler catalog was imported. The deletion test inserted synthetic pre-existing Saved Walk/profile/guest-link records directly into the isolated DB for API-created synthetic accounts, then verified Saved Walk visibility through the deployed list API and deletion through the deployed account endpoint. This is **not** a claim that valid route creation through the Saved Walk API was tested against an empty content catalog. The separate isolated Saved Walk API regression suite passed locally.

### Reset / email boundary

Resend API acceptance and the retrieved test-message template are verified; a test-recipient delivered simulation is not Gmail/Outlook/user-inbox delivery. The outstanding token was deliberately left unconsumed to test deletion cleanup. Password-change completion, single-use/concurrent-use rejection, expiry, old-password failure and all-session revocation were verified in the local real-Better-Auth/PostgreSQL harness, not claimed as a completed physical email click-through.

No reset URL/token, password, cookie, API credential or private database endpoint was printed by the smoke runner. No Production email was sent. Provider test messages themselves necessarily contain the synthetic reset link; no assertion of provider-side data erasure is made.

## Final automated gates before commit

| Gate | Result |
| --- | --- |
| Root auth/provider/reset form | **41 passed / 12 DB-gated skipped**, 9 files passed / 1 skipped |
| Mobile account/auth | **67 passed / 8 files**, no skips |
| Isolated lifecycle PostgreSQL / Better Auth | **12 passed / 1 file**, executes the 12 gated tests above |
| Isolated Saved Walk PostgreSQL/API | **13 passed / 1 file**, migration upgrade/rerun preservation also PASS |
| Root/mobile TypeScript | PASS |
| Root/mobile lint | PASS |
| i18n | **495 keys × 7 catalogs; zero errors** |
| Diff / selected-file secret/private-path checks | PASS |

Commands are recorded in README. No assertions/timeouts weakened. Existing Vite configuration deprecation warnings and PostgreSQL SSL-mode forward-compatibility warning were observed; no unhandled test errors.

## Physical acceptance and launch limitations

**Ready for scoped iPhone lifecycle acceptance: YES**, using the exact feature origin and current source, with approved Preview access. Account creation/sign-in, generic reset acknowledgement, rate-limit/error feedback, deletion confirmation, and device-local data preservation can be physically checked. No permanent mobile profile/origin was changed automatically.

Not yet accepted: physical reset-link click-through, local traveler-data retention after real device deletion, EN/DE/NL 110% form readability, Android lifecycle behavior, arbitrary real inbox delivery, verified CITYWALK sender/domain, SPF/DKIM/DMARC and reputation. The empty catalog also limits rebuilding/recreating Saved Walks through normal traveler UI until a separately reviewed content/bootstrap step. Existing local traveler data must not be wiped to make acceptance pass.

Commerce/staff/audit-linked accounts remain blocked pending approved retention/anonymization and operator-handling policy. Broader cloud sync/import remains deferred. No merge, Production deployment, domain purchase/configuration or real-inbox acceptance is implied.

Preserved: pre-existing untracked `.expo/` and held stash. Private `.env.preview.local` remains ignored and untracked. Only the account-lifecycle commit was pushed.

## Lübeck bootstrap and API-origin cache isolation — 2026-09-27 21:59 UTC

This follow-up supersedes the earlier empty-catalog limitation above. Mobile Core: applicable to iOS/Android implementation; physical acceptance remains pending. Public/Admin Web behavior unchanged.

### Target and authorized import

- Re-read the exact `feat/account-lifecycle` Preview `DATABASE_URL` override through authenticated Vercel access. Its metadata fingerprint is unchanged from the deployment snapshot for the exact Preview above.
- Connected only to `citywalk_account_lifecycle_preview`; PostgreSQL's actual Neon project identity differs from Production's provider project metadata, and normalized endpoints differ. No Production database connection or write was made. No connection strings, credentials, private endpoints or project IDs recorded here.
- Ran **`npm run cms:import-lubeck` once**, with the verified branch database URL supplied directly to the child process environment. The repository environment loader preserves this value (`override: false`). No seed, migration, deployment, environment change or automatic-build importer was added.
- Result: **1 published Lübeck city, 25 published Lübeck places, 1 published tour**, 175 authored place localizations, 5 Hidden Gems and 5 tour stops. All 5 tour-stop references resolve to published places in the same city.
- Existing user/account/session/account-Saved-Walk counts stayed 1/1/1/1; verification/profile/guest-link counts stayed 0. Managed-media asset count stayed **0**. The canonical importer writes editorial content only; no Production data was imported.
- Post-operation checks: all original Vercel environment-record fingerprints, Production target/deployment list and develop deployment list unchanged.

### Deployed API evidence

Requests used the exact feature Preview above and existing authorized Preview access. Immediately after import, the city index briefly retained its earlier cached empty response. After normal CDN revalidation, the exact URL (no cache-busting query) returned **200**, JSON, CDN HIT:

`GET /api/content/cities?locale=en`

```json
{"cities":[{"slug":"lubeck","countryCode":"DE","timezone":"Europe/Berlin","name":"Lübeck","shortDescription":"A Hanseatic city of UNESCO-listed streets, Brick Gothic landmarks and waterside lanes.","requestedLocale":"en","resolvedLocale":"en","didFallback":false,"media":[]}]}
```

`GET /api/content/cities/lubeck/summary?locale=en`: **200**, JSON, **25 unique non-empty place slugs**, finite coordinates and **1 tour**. Public place identifiers are slugs; internal database numeric IDs are not part of this DTO. Read-only DB and API assertions passed for expected counts and valid tour references. No new audio-delivery or physical-playback acceptance is claimed.

### Mobile correction

The shared `publicContentCacheKey` previously omitted backend identity. It now encodes the validated, normalized API origin together with resource, locale and identifiers. Hooks, prefetches and membership lookups already use this one key builder, so all use the same namespace.

- Memory, persisted data, ETags and in-flight requests are separated between origins.
- Legacy unscoped entries are ignored, not migrated to an arbitrarily chosen backend or deleted.
- Same-origin 5-minute freshness, 24-hour stale fallback and locale separation are preserved, including Production mode.
- No favorites/current-walk/account storage wipe; no Saved Walk or lifecycle behavior changes.
- Native fix is **local and uncommitted**; it must be loaded through the current Development Client JavaScript project. It is not included in the already deployed backend SHA or an old native binary bundle.

### Focused validation

| Command | Result |
| --- | --- |
| From `mobile`: `npm run test:run -- tests/public-content-cache.test.ts tests/content-loading-retry.test.tsx tests/api-client.test.ts tests/api-environment.test.ts tests/walk-membership.test.tsx tests/membership-screens.test.tsx` | **65 passed / 6 files**, zero skipped/failed |
| Root: `npm run test:run -- src/lib/content src/app/api/content src/lib/admin/content/importPolicy.test.ts` | **77 passed / 13 files**, zero skipped/failed |
| Root: `npx tsc --noEmit` | PASS |
| From `mobile`: `npm run typecheck` | PASS |
| Root and `mobile`: `npm run lint` | PASS |
| Root: `npm run i18n:check` | **495 keys × 7 locales, zero errors** |
| `git diff --check` | PASS |

Seven new cache regression cases cover all three resource namespaces, cross-Preview memory/persistence isolation (including failed network requests), legacy-entry isolation without deletion, and same-origin persisted reuse/24-hour expiry in Preview and Production. No timeout or assertion weakening. Existing Vite deprecation and pg SSL forward-compatibility warnings remain.

Preserved the pre-existing root `tsconfig.json` edit, untracked `.expo/`, other existing QA evidence, and held stash. The local TypeScript result includes that existing root config; it is not a claim about a clean CI installation. `.env.preview.local` is ignored, untracked and unstaged. Nothing staged, committed, pushed or merged in this round.

### iPhone retest — pending owner confirmation

1. Load the current working-tree JavaScript in the existing Development Client, configured with the exact lifecycle Preview origin above; reload the app. Do not delete app storage or change permanent build profiles.
2. Open Home in English: Lübeck should appear; Hamburg/Düsseldorf from the previous Preview must not appear. Open Lübeck, Explore and a place detail; verify the current backend's catalog loads.
3. Close/reopen the app and confirm the same-origin catalog is reusable. After a successful load, temporarily go offline and confirm same-origin cached content remains usable; return online afterward.
4. If comparing another authorized Preview, switch the development API origin and reload the JS project; its content must be separate. Return to the lifecycle origin and reload. An offline first visit to an uncached backend should show recovery, never another backend's catalog.
5. Confirm existing favorites/current walk and account behavior remain intact. Continue scoped lifecycle acceptance; neither this report nor automated tests establishes new iPhone/Android physical PASS results.


## Owner-confirmed physical iPhone acceptance — 2026-09-28

Status: **PASS for the 16 owner-reported scenarios below**, recorded on 2026-09-28 (Europe/Berlin). Results come directly from the owner's physical iPhone report, not inferred from automated tests or HTTP status. The report does not specify device model, iOS version, installed native build or exact JavaScript fingerprint. Known server implementation baseline and isolated Preview origin are recorded above. Android physical acceptance is **not claimed**.

| Scenario | Owner result |
| --- | --- |
| Forgot password request | PASS |
| Generic anti-enumeration response | PASS |
| Reset password | PASS |
| Old password rejected after reset | PASS |
| New password accepted | PASS |
| Existing sessions revoked | PASS |
| Reused reset link rejected | PASS |
| Account deletion with correct current password | PASS |
| Wrong-password deletion rejected | PASS |
| Deleted account cannot sign in | PASS |
| Account-backed Saved Walks removed | PASS |
| Local favorites preserved | PASS |
| Local current walk preserved | PASS |
| Language/preferences preserved | PASS |
| Historical device saves preserved | PASS |
| EN/DE/NL at 110% readable | PASS |

This supersedes the earlier pending status only for these specific scenarios. Physical token expiry, Arabic RTL, offline/interrupted flows and any other unreported checks remain unverified. The earlier 40-assertion backend smoke and isolated database results remain separate evidence.

### Explicit launch limitations

- **Resend test mode only**; real Gmail/Outlook delivery is NOT accepted.
- No verified CITYWALK sending domain; SPF/DKIM/DMARC pending.
- Commerce/staff/audit-linked account deletion stays blocked pending an approved retention/anonymization and operator-handling policy. No retention duration is invented.
- Android physical acceptance is not claimed.
- Favorites/current progress/preferences/historical device saves remain device-local; broader cloud sync/import is outside this change.

### Documentation commit boundary

The acceptance commit changes documentation only. The locally validated API-origin public-content cache fix (`mobile/src/lib/publicContentCache.ts` and its test) is not included in this PR's committed implementation; it remains a separate uncommitted follow-up. The local root `tsconfig.json` edit (including Expo inheritance), `.expo/`, private env files and held stash are also excluded. No private database endpoints, connection strings, reset links, tokens or account identifiers are recorded here.

### Final PR preparation validation — 2026-09-28

| Exact command | Result |
| --- | --- |
| `npm run test:run -- src/lib/auth src/lib/admin/bootstrap.server.test.ts src/app/account/reset-password/ResetPasswordForm.test.tsx --maxWorkers=1` | **41 passed / 12 DB-gated skipped**, 9 files passed / 1 skipped |
| `npm --prefix mobile run test:run -- tests/account-guest-flow.test.tsx tests/account-lifecycle.test.ts tests/auth-errors.test.ts tests/auth-configuration.test.ts tests/account-walk-api.test.ts tests/account-walk-scope.test.tsx tests/launch-locale-selector.test.tsx tests/locale-preference.test.tsx tests/walk-save.test.ts tests/walk-storage.test.ts tests/saved-route-identity.test.ts --maxWorkers=1` | **92 passed / 11 files**, no skips |
| `node scripts/test-account-lifecycle.mjs` | **12 passed / 1 file**, no skips; executes the 12 DB-gated cases above |
| `node scripts/test-account-saved-walks.mjs` | **13 passed / 1 file**, no skips; migration upgrade/rerun preservation PASS |
| `npx tsc --noEmit`; `npm run mobile:typecheck` | PASS |
| `npm run lint`; `npm run mobile:lint` | PASS |
| `npm run i18n:check` | **495 keys × 7 catalogs, zero errors** |
| `git diff --check` | PASS |

No failing reruns, changed assertions or timeout increases in this final gate. The 12 skipped root cases are executed by the isolated lifecycle gate; do not count them twice. Integration harnesses created and removed only their own loopback databases, never loaded private env files and sent no mail. No full-suite/build claim is made for this focused run. TypeScript checked the working tree including the pre-existing root config change, which is excluded from the commit; clean committed-source CI remains a separate gate.

Better Auth root/mobile installed and lockfile versions verified **1.7.2**. No manifest/lock changes. Private `.env.preview.local` is ignored, untracked and unstaged. Original Production/develop environment-record fingerprints and deployment references reverified unchanged; exact lifecycle Preview database override still isolated. The initial read-only API probe received an expired-session 403; the already authenticated Vercel CLI refreshed its session, and the repeated metadata/isolation checks passed without changing settings or logging in. No email, Preview migration, content write or service-setting mutation performed in this acceptance-recording task. Held stash remained unchanged.

The approved branch push may create the normal Git-triggered isolated Preview deployment. This task does not authorize merging, Production deployment or provider/domain configuration. PR CI and that latest Preview must be checked on the final documentation head before merge readiness is asserted.
