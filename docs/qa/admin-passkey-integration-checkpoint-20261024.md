# Admin passkey/TOTP integration checkpoint — 2026-10-24

Status: **IN PROGRESS / NO MERGE / NO DEPLOY**. Source PR #213 was based on an older CMS feature branch, not current `develop`.

## Verified collision
- Source #213 adds `drizzle/0019_tense_snowbird.sql`, `drizzle/meta/0019_snapshot.json` and a journal ending with `0019_tense_snowbird`.
- Current `develop` already uses `0019_subscription_entitlements` through `0026_shared_walk_links`. Never copy the old migration or journal.
- Current `develop` retains `better-auth:^1.7.7`, whereas #213 adds `@better-auth/passkey:1.7.7`. Preserve current lockfile changes and generate a new dependency resolution.
- Server auth factory, auth schema, bootstrap, staff UI and tests differ between the two branches. Do **not** wholesale overwrite current source files.

## Required implementation sequence
1. Compare latest `develop` and #213 feature changes file-by-file. Port only passkey-first staff login, optional password+TOTP backup-code flow, WebAuthn RP origin/verification, limited lockout and staff-restricted credential administration.
2. Add only additive schema changes for `passkey`, `twoFactor` and `user.two_factor_enabled`. Generate new migration **after 0026**, with matching snapshot and journal using Drizzle tooling; do not hand-write migration metadata.
3. Preserve existing staff memberships/roles, bootstrap safety, account recovery, guest access, API auth and account lifecycle. Test no public staff enrollment and no traveler-admin privilege escalation.
4. Install matching Better Auth passkey package against **current** package-lock and run npm install --package-lock-only plus audit, typecheck, lint.
5. Run tests: Admin UI, passkey credential registration/login/revocation, TOTP/backup code replay, 5-attempt temporary lockout, auth origin and CSRF, PostgreSQL disposable migrations and staff RBAC.
6. Validate real Touch ID/Android passkey UX and origin configuration on isolated Preview before any merge. No production identity/billing/DB changes.

## Acceptance
This checkpoint is documentation only. It does **not** implement passkeys, replace #213, run migration, or pass acceptance gates. Keep this PR Draft until an implementation is added and exact-head CI/device tests prove it safe.
