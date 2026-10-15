# Independent SaaS authentication and tenant isolation

Status: approved auth UI preview in separate branch; real auth backend **not yet implemented**. See #384 and design gate #380.

## Fixed V1 decision
- Email + password with mandatory email verification; Google login deferred.
- Founder-approved Desktop/Mobile V1 auth screens: signup, signin, email verification, forgot password and expired-link recovery.
- The client validates fields only. It does **not** create accounts, authenticate or send emails. Never persist passwords in browser storage or log them.

## Server security gates
1. Separate SaaS authentication API, dedicated secrets and **separate disposable PostgreSQL database** with its own migration history. Do not reuse CITYWALK user accounts, staff sessions, role tables or production database.
2. Review existing Better Auth dependency and its supported PostgreSQL adapter/schema generation, then configure email/password, verified-email gate, secure HTTP-only cookies and anti-enumeration reset behavior. Never write a homegrown password storage/session layer.
3. Only local test email sink until an external sender/domain/provider is approved. Enforce one-time verification/reset tokens, expiry, rate limits, origin/CSRF checks and safe redirects. Do not expose tokens or credentials in logs.
4. Real project authorization: server-authenticated user → organization membership (owner/editor/viewer) → tenant-scoped project, on every read/write/review action. Never trust client-supplied actor IDs or reviewer timestamps.
5. Reuse versioned @marketing/core schemas, revision conflict protection and provenance contracts; keep human fact confirmation, editorial approval and publishing authorization separate.

## Evidence before any merge or release
- Founder-run local UI unit/typecheck/Vite build/Chrome Desktop and Mobile tests.
- Two users/two organizations integration tests: cross-tenant reads/writes/review denied; stale revisions conflict; session revocation respected; verify-before-workspace access enforced.
- Dedicated local DB migrations verified without accessing CITYWALK or production DB.
- GitHub Actions restored from billing/spending blocker and real deployed Preview accepted.
- Approved privacy/legal copy, rate limits, backup/restore and operational review before external users.

Never deploy/provision paid providers or create external customer accounts merely because UI design was approved.
