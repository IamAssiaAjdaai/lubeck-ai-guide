# Marketing SaaS — V1 authentication design approval + implementation gate

**Founder sign-off:** 2026-10-16 — "ah" explicitly approves the presented [Desktop + Mobile Auth Design V1] (the white/violet offline interactive HTML preview), alongside the previously selected **email + password + mandatory email verification**. [#384](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/384) / [#380](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/380).

## Exact approved offline design source

Original conversation file: `marketing_saas_auth_design_v1.html`
Expected SHA-256: `1ccc0110fea2b7b7e7b65113abae3438646859a457c5f04e1f516182722c14e4`.

Archive the **original unchanged bytes** under `docs/design/marketing-saas/v1/auth_design_v1.html` and verify with:

```bash
shasum -a 256 docs/design/marketing-saas/v1/auth_design_v1.html
```

This design source was approved in chat but its bytes have **not yet been uploaded to GitHub** from the founder's Mac. This decision document does not pretend otherwise.

## Locked V1 visual intent

- Desktop: white form on right, dark blue/navy feature panel on left, soft indigo/purple primary actions, calm typography, generous whitespace, no CITYWALK traveler branding.
- Mobile: single-column form, 44px+ interactive hit targets, no marketing sidebar, aligned with founder-approved responsive onboarding #380.
- Explicit screens: **Create account**, **Sign in**, **Verify email**, **Forgot password**, **Expired/invalid link**.
- Work email and password; sign-up name. No Google/social login in V1.
- Emails must be verified before accessing private workspace. Forgot-password responses **must not disclose** whether an email belongs to an account. Link errors must not sign anyone in.
- Mock product name `Marketing Workspace` is a placeholder; final logo/name/license, legal terms/privacy language remain separate release gates.
- Design's proposed 12-char minimum for passwords may be used as a baseline **but must also be enforced server-side** when the real auth provider is configured.

## Boundaries and rollout

### Slice 1 — standalone auth UI, before auth backend
- React/Vite `/auth` experience in `apps/marketing-saas`, **local preview only**, with clear “no account created, no email sent, not signed in” state.
- Client-side validation for user feedback; no password logging, API calls, local storage or fake account creation.
- Keep existing `/` customer onboarding preview unchanged and accessible for UI review.
- Only locally tested UI after founder runs unit tests, typecheck/build and desktop/mobile Chrome.

### Slice 2 — actual account creation and sessions (separate approval/test gate)
- Dedicated SaaS auth server/provider on same origin/proxied localhost, separate `marketing_saas_qa` PostgreSQL DB and independent migration journal.
- Strict origin/CSRF, secure HTTP-only cookie (production `Secure` and exact domain), verified-email account gate, password reset, replay-resistant one-time verification tokens, resend/rate-limit throttles; no tokens in logs.
- Local-only email sink first, then configured provider with verified sender only when founder authorizes cost/domain. Avoid assuming CITYWALK's Resend settings or importing its app auth.
- UI calls same-origin API only after backend and API contract are tested. Server makes authorization decisions from its own session.

### Slice 3 — tenant/project store
- Server-scoped user → organization membership → project checks, roles `owner/editor/viewer`, dedicated SaaS database, negative isolation tests and revision/audit persistence using `@marketing/core`, separately from CITYWALK entities.
- No CITYWALK admin/staff/traveler cookie/session or CITYWALK database migrations.
- No paying customers or deployments until all backend, security, CI and Preview gates are satisfied.

**Reminder:** Approving a static design does **not** approve a production auth rollout, Google/provider expenditure, backend schema migration, CI bypass or publication permission.
