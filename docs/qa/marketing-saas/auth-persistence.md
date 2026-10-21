# Independent local SaaS identity and persistence / 2026-10-21

Branch `codex/mkt-mvp-02-local-pilot` reconciles the existing unmerged #383 → #385 → #386 stack on top of the isolated intake branch. Original drafts/worktrees are unchanged. #364 CITYWALK staff UI is not copied. Mobile Core/iOS/Android/Public Web/Admin Web: not applicable. Independent browser SaaS required.

## Implemented

Loopback-only Node API + existing Vite/React frontend; PostgreSQL exclusively uses MARKETING_DATABASE_URL, a marketing-prefixed local database on a non-default port. CITYWALK session/cookies/schema/migration files are never imported. Better Auth requires verified email, enforces server password policy, records DB-backed auth rate limits, issues separate host-only HttpOnly/SameSite cookies and revokes sessions on logout/reset. Mutation origin checks run before body-sensitive work. Socket-derived IP overrides client IP headers. Verification/reset messages are written mode 0600 to a mode 0700 local sink; no outbound email adapter exists.

An authoritative user → organization membership → project query enforces owner/editor/viewer. Browser IDs/roles/reviewer metadata cannot grant permissions. Organization bootstrap is transaction-safe. Brand revisions are appended in transactions under a project row lock; exact expected revision prevents stale/racing writes. Manual browser declarations cannot assert source-backed provenance. Confirmed actor/time come from the session/server. Corrections reset confirmation and retain prior versions. Evidence is stored separately and read alongside the latest revision. Confirmation is neither RAG verification nor publication permission.

Committed Better Auth SQL is generated from the installed library into 0000_auth.sql using an empty disposable schema-review database. SaaS operational SQL is 0001_saas.sql. Explicit migration command validates immutable SHA-256 journal entries and applies pending files in one locked transaction; it never runs on server startup or a CITYWALK build. Root db:migrate/db:verify are intentionally not used for SaaS. A failed migration rolls back; application rollback keeps the additive schema and immutable history. Never drop customer tables to roll back code.

## Executed acceptance

- Fresh isolated committed migrations: passed; immediate replay: passed, no changes.
- Real PostgreSQL/Better Auth integration: **2 comprehensive tests passed**, covering two independent identities/orgs, verified login, unauthenticated/cross-tenant reads/writes/import/confirmation, origin denial, forged reviewer rejection, viewer/editor, stale revision, simultaneous edits (one success/one conflict), reset anti-enumeration, replay rejection, session revocation and logout.
- Full repository tests: **1,511 passed / 135 skipped**; the two DB tests are intentionally skipped without MARKETING_TEST_DATABASE_URL, not claimed as full-suite DB passes.
- Standalone API and frontend TypeScript: passed. Vite production build: passed.
- Chrome browser: `MARKETING_SAAS_AUTH_FACTS_BROWSER_PASS`; actual signup → local verification link → login → business → manual fact → human confirmation → reload preserved data. Desktop 1440 and mobile 390/375 overflow checks passed; zero page errors. Mobile screenshot visually inspected. Screenshots under screenshots/.
- Root Next webpack build limitation inherited from intake report remains; no checks disabled. Root lint fixed narrowly for imported JSX apostrophes, Vite-specific link semantics and generated app dist ignores. Existing approved designs preserved.

## Remaining scope

This slice is a working local auth/intake flow, not the completed Marketing Pack engine or a paid-pilot release. No membership-invitation management UI or remote release configuration; one personal workspace is created per new local account. Legal review, external email, dedicated external hosting, backup/restore/retention/customer-erasure acceptance and security review are still required. Account creation uses synthetic QA identities only. API origin and DB guards deliberately prohibit accidental remote operation.
