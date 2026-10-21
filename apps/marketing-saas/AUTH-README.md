# Independent Marketing SaaS — auth UI slice

**Status:** Founder-approved Desktop/Mobile auth design; local-only interactive Vite UI, no actual user auth/session/email delivery/database.

## Preview

Parent UI: Draft [PR #383](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/383), currently still unmerged. Backend architecture and follow-up steps: [#384](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/384). The current UI lives at `http://127.0.0.1:3108/auth`. Existing local project-onboarding design remains at `http://127.0.0.1:3108/`.

- Native, keyboard-friendly forms for sign-up (name + email + password), sign-in and forgot-password; local-only Zod error feedback and password visibility toggle.
- Read-only verification pending and expired-link states, with honest messages that **no email was sent, no account was created**.
- Never send a request, persist a password, fake a successful login, mint a session, or reuse CITYWALK auth.
- Approved design reference: `docs/design/marketing-saas/auth-v1-approved.md`, original HTML SHA-256 `1ccc0110fea2b7b7e7b65113abae3438646859a457c5f04e1f516182722c14e4`. Original HTML to be archived by founder under `docs/design/marketing-saas/v1/auth_design_v1.html`.

## Run local verification

From this feature's separate Git worktree/repo root (Node 22):

```bash
npm ci
npm run test:run -- apps/marketing-saas/src/auth/validation.test.ts
npm --prefix apps/marketing-saas run typecheck
npm --prefix apps/marketing-saas run build
npm --prefix apps/marketing-saas run dev
```

Use a second terminal for the Chrome test after Vite is ready:

```bash
CITYWALK_PLAYWRIGHT_MODULE="$HOME/.cache/citywalk-brand-playwright/node_modules/playwright" \
PLAYWRIGHT_CHANNEL=chrome \
node scripts/marketing-saas-auth-ui-smoke.mjs
```

Expected `MARKETING_SAAS_AUTH_UI_BROWSER_PASS`. Chrome screenshots are written in a temporary directory, not into the Git worktree. Tests cover 1440px desktop, 390/375px mobile, 5 screen variants, invalid/corrected signup and local-only status. Do not infer a WCAG audit or a real auth test from this smoke run.

## Real implementation remains blocked by backend/security gate

Dedicated Better Auth server + independent PostgreSQL migrations, verification and reset link flows with anti-enumeration/rate limits, secure cookies, server-side organization memberships/permissions and two-tenant isolation testing all remain future slices. Keep this PR **Draft** and do not deploy, expose externally or collect real credentials while it remains a local design preview.
