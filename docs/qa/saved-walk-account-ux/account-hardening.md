# Account/Profile hardening — 2026-09-27

**Subsequent product decision:** [Launch visibility and account Saved Walks](account-saved-walks.md) supersedes the local-only permanent-save policy and Account benefit limitations below. These earlier results remain historical; existing local records are preserved.

Branch: `feat/saved-walk-account-ux`; base HEAD: `74684d3faad7df3d5ed9e2b63173125debb87fae`. This extends the uncommitted saved-walk/guest-first work. Nothing staged, committed, pushed, built, deployed or published. No stash, provider/configuration, database, payment, storage or media changes. No remote auth/account mutations were performed for this task.

## Capability audit and password policy

Evidence: installed Better Auth **1.7.2**, `src/lib/auth/factory.server.ts`, `src/lib/auth/server.ts`, native `lib/auth/client.ts`, and installed route implementations in `better-auth/dist/api/routes/{update-user,password,account}.mjs`. Public reference: [email/password](https://better-auth.com/docs/authentication/email-password), [users/accounts](https://better-auth.com/docs/concepts/users-accounts). Configuration tests execute the actual factory with external services mocked.

| Capability | Finding / implementation |
| --- | --- |
| Email signup/sign-in | Enabled; public signup opts into the existing factory. Signup does not sign in automatically. |
| Password policy | **Before and after: 12–128 characters.** Native new-password validation matches the server. The factory also serves staff identities; a blanket change to 8 would weaken the existing shared policy. No hashing/auth policy change. A future 8-character traveler-only decision must explicitly address that shared boundary. |
| Display-name update | Existing authenticated `updateUser` endpoint updates the current user's name and session data. Native now uses it; no client-provided user ID or email update. |
| Password change | Existing `changePassword` verifies the current credential server-side and enforces new-password bounds. Native passes `revokeOtherSessions: true`; Better Auth invalidates old sessions and issues a replacement current session. Returned tokens are never displayed or logged. Actual SecureStore/session rotation needs device acceptance. |
| Credential-provider discovery | Authenticated `listAccounts()` gates Change password by `providerId === credential`. Failed discovery shows a recoverable error, not a social-only claim. Provider/user identifiers are not displayed or logged. |
| Reset mail | **BLOCKED.** No `sendResetPassword` hook or outbound mail transport is configured. Installed reset-request route rejects before lookup when the hook is absent. No reset emails can truthfully be claimed sent. |
| Reset token lifecycle | Installed server supports time-limited verification records (default one hour), server-generated tokens and atomic consumption. Not activated/tested end-to-end here. No native token destination, successful reset, expired-token result or post-reset session-revocation acceptance is claimed. |
| Verified email change | Not enabled/configured; native displays email read-only. |
| Account deletion | **BLOCKED.** `user.deleteUser.enabled` is absent; installed authenticated endpoint returns disabled. Native exposes an explicit Delete account entry with an unavailable explanation, without sending a destructive request or showing false success. |
| Apple/Google / username | No configured social providers; no buttons or username field. |
| Local/cloud data | Auth identity and profile are server-backed; native traveler records remain local. No sync, migration, purchase restore or cross-device benefit is claimed. |

Reset/deletion blockers prevent calling account lifecycle production-ready. Enabling deletion also requires reviewing account-related dependencies, retention and the shared staff/traveler boundary. Do not merely turn the backend flag on.

## Implemented UX

- Guest screen: CITYWALK account, works without an account, concise profile/account-features value. Create account, Sign in and Continue as guest; no new traveler auth gate or duplicate language selector.
- Signup: display name (trimmed, 1–100 characters), email, password; explicit sign-in after successful creation. No email-derived display name. Sign-in remains email/password with Forgot password and guest escape.
- Password fields: secure by default; separately controlled eye buttons with localized, field-specific accessibility labels and 48×48 minimum touch targets. Current/new password autofill and name/email autofill are configured. Passwords are cleared on form changes/completion. Font scaling remains enabled, with minimum heights rather than fixed-height clipping.
- Existing keyboard-adjusting Screen/ScrollView and full-width wrapping buttons remain. Arabic row direction and text alignment use existing primitives; no global RTL/navigation rewrite.
- Forgot password opens an email panel with a truthful unavailable explanation and disabled Send reset link. It returns identical unavailable messaging for any entered address and performs no lookup/request; there is no account-existence oracle or invented success.
- Signed-in Profile shows display name/email, Edit profile, current language label, account actions and the existing canonical Saved link. No password, session/user IDs or entitlements appear.
- Edit profile saves the name through Better Auth, reports success/failure, and leaves email read-only. Session display follows the auth client's refreshed session rather than an invented local profile.
- Change password requests current/new/confirm, validates before submission, distinguishes incorrect current password and calls the authenticated server endpoint. Provider-only accounts do not get this action.
- Delete account opens an explanation: unavailable, nothing deleted. No destructive confirmation pretending a working backend exists.
- A shared synchronous ref lock prevents duplicate form mutations. Inline busy indicators, recoverable errors and late-response guards apply to auth/profile/password actions. Back ignores late UI feedback; it does **not** claim to undo a server request already submitted.
- Sign-out calls Better Auth only. Saved walks, favorites, active walk/progress, locale, private feedback and review history are neither cleared nor uploaded.

All new static copy lives in shared catalogs for **de/en/da/sv/nl/es/ar**. No dependency or server implementation changes. Existing saved-dedup, audio, navigation, membership, planner and presentation work is preserved.

## Changed paths in this hardening round

```text
mobile/src/app/account/index.tsx
mobile/src/components/PasswordField.tsx
mobile/src/lib/auth/errors.ts
mobile/tests/account-guest-flow.test.tsx
mobile/tests/auth-errors.test.ts
mobile/tests/native-city-experience.test.ts
mobile/tests/native-screen-chrome.test.tsx
packages/i18n/src/locales/ar.json
packages/i18n/src/locales/da.json
packages/i18n/src/locales/de.json
packages/i18n/src/locales/en.json
packages/i18n/src/locales/es.json
packages/i18n/src/locales/nl.json
packages/i18n/src/locales/sv.json
src/lib/auth/native-policy-contract.test.ts
docs/qa/saved-walk-account-ux/README.md
docs/qa/saved-walk-account-ux/account-hardening.md
```

Other already-dirty saved-walk source/tests belong to the preceding task and were preserved. The new server-side file is a **test**, not a backend implementation change.

## Validation

| Command | Result |
| --- | --- |
| `npm run test:run --prefix mobile -- tests/account-guest-flow.test.tsx tests/auth-errors.test.ts tests/native-screen-chrome.test.tsx tests/native-city-experience.test.ts --maxWorkers=2` | Initial focused run: **50 passed / 4 files**, no failures/skips. |
| `npm run test:run --prefix mobile -- --maxWorkers=2` | Final complete mobile suite: **500 passed / 57 files**, no failures/skips or unhandled errors. |
| `npm run test:run -- packages/i18n packages/traveler-core src/lib/auth` | **82 passed / 9 files**, no failures/skips. Existing Vite configuration warnings only. |
| `npm run i18n:check` | **469 UI keys × 7 locales; zero errors.** |
| `npm run typecheck --prefix mobile` | PASS |
| `npm run lint --prefix mobile` | PASS, zero warnings. |
| `./node_modules/.bin/tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |
| `git diff --check` | PASS |

Reruns: the first complete mobile run passed 498 tests. Two explicit duplicate-submit regressions and email RTL alignment were then added; the final complete run passed 500. The first typecheck flagged a possibly undefined credential state, fixed with optional access before subsequent successful checks. No assertions were weakened or timeouts increased. Native/auth bridges remain mocked. No live account, SecureStore, keyboard, Android or release acceptance can be inferred from mocked component tests. Reset successful/expired-token and actual deletion scenarios are BLOCKED, not passing or silently skipped tests. Backend implementation was unchanged; DB integration tests/migrations are not required for this native-only integration and were not run.

## iPhone retest — UNVERIFIED

Use a Preview test account only; do not delete app storage.

1. As guest, build/save a route and favorite a place. Open Profile, read the concise copy, open Signup/Sign in, Back and Continue as guest. Verify walk/progress, saved routes, favorite and locale remain.
2. Signup: enter a name, email and test password. Verify 8/11 characters fail locally, 12 passes the length check, empty name/invalid email fail. Check each eye toggle, Password AutoFill, email/name keyboard, repeated submit taps and network failure recovery. On real success, verify explicit sign-in is still required.
3. Sign in: wrong password gives localized failure; valid credentials reveal actual name/email without identifiers. Forgot password opens the unavailable state with disabled Send reset link; Back returns to Sign in. No email-sent claim.
4. Edit profile: change name, save once/repeated taps, confirm updated name and persistence after reopening. Email is read-only. Test failure/retry without losing traveler data.
5. Change password: wrong current password fails server-side; short/mismatching new password fails validation. Eye controls operate independently. With an approved test account, change successfully, verify old password fails/new password works and another existing test session is invalidated while the current session remains usable. Do not share or record passwords/tokens.
6. Delete account: opens only an unavailable explanation; no account/local data is deleted. Back returns to Profile.
7. Sign out: Profile returns to guest. Saved walks, favorites, current walk/progress, language and review history survive; reopen app and verify persistence. No cross-device sync is expected.
8. EN/DE/DA/SV/NL/ES and Arabic: inspect translated forms/messages and Arabic ordering; test German/Dutch long labels at normal, 110% and larger text while mounted. Keyboard must not hide submit/Forgot password; eye targets stay usable. Existing Home/Explore/Back, audio and Add-stop flows remain unaffected.

Run Android device verification separately; neither platform has new physical acceptance in this round.

## Follow-up work (separate tickets, not implemented)

- **Password recovery:** choose/approve outbound mail transport, secret handling and sender/domain; implement and verify the existing Better Auth mail hook and approved native/web reset destination. Test generic responses, rate limiting, expired/consumed links, matching passwords, token-safe logging and session revocation after reset before enabling Send reset link.
- **Account deletion:** define retained/deleted account data, staff/commerce dependencies, required reauthentication and recovery/confirmation wording; implement/verify authenticated deletion. Explicitly decide whether any local-only records should survive. Do not imply local deletion by default.
- **Verified email change:** verification and notification workflow before editing login identity.
- **Cloud sync:** define ownership/isolation for saved walks, favorites and current/history data; stable route identity, conflict/update/delete rules, guest import consent, account switching, offline queue/retry, schema/API authorization, privacy/export/deletion, migration and cross-device tests. Preserve local records through failure. Add benefits copy only after end-to-end sync and restore are verified. No cloud ticket was created remotely.
