# Marketing SaaS — local owner-onboarding UI slice

**Status: interactive local preview, NOT a deployed or authenticated SaaS.** Issue [#382](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/382).

- Separate Vite/React app under `apps/marketing-saas`, not CITYWALK AdminShell or staff/traveler routes.
- Reuses the already merged `@marketing/core` schema for strictly validated **owner-declared** website/app/local-business briefs; there is no duplicated Brand Context engine.
- Design based on the founder-approved Desktop/Mobile concept archived in `docs/design/marketing-saas/v1/` and documented in `docs/design/marketing-saas/onboarding-v1.md`.
- Browser data stays in React memory. **No authentication, tenant persistence, human confirmation audit, website fetching, AI strategy, billing or publishing**. The UI explicitly labels Stage 3 "No external analysis performed" and Stage 4 "Not confirmed". A dashboard is only a local empty-state preview.
- This app shares packages/development tooling via the current monorepo during development. It **must not** be exposed externally or treated as tenant-isolated just because it has a separate UI host; dedicated auth, database and server authorization will follow independently before external beta.
- Never use production CITYWALK credentials or DB to test this UI. No service credentials needed.

## Run locally from the repository root

```bash
npm ci
node scripts/verify-marketing-onboarding-design.mjs
npm run test:run -- apps/marketing-saas/src/intake.test.ts
npm --prefix apps/marketing-saas run typecheck
npm --prefix apps/marketing-saas run build
npm --prefix apps/marketing-saas run dev
```

Open `http://127.0.0.1:3108`. Vite binds to loopback only. Mobile device responsiveness can be tested in desktop Chrome's device toolbar or Playwright with 390×844 and 375×812 viewports.

## Automated local Chrome browser QA

Start the local Vite dev server using the command above and leave it running. From a **second terminal**, in the repository root, run:

```bash
CITYWALK_PLAYWRIGHT_MODULE="$HOME/.cache/citywalk-brand-playwright/node_modules/playwright" \
PLAYWRIGHT_CHANNEL=chrome \
node scripts/marketing-saas-onboarding-smoke.mjs
```

The smoke script only accepts `http://127.0.0.1:3108` (or `http://localhost:3108`), refuses non-local requests, uses synthetic data and writes screenshots to a fresh `/tmp/marketing-saas-ui-...` directory. It checks both desktop/mobile, required input validation, honest no-analysis/no-confirmation states, empty unsaved dashboard, and 390px/375px overflow. **This is not an authenticated SaaS or a WCAG certification**. Results are pending until the founder executes the script; do not claim the test is green before seeing the terminal output.

## Manual acceptance / shortcomings

1. At 1440px, select **Website** then enter a company name, valid HTTPS URL, objective and offer; follow through to review and the **unsaved** dashboard.
2. At 390px, start over and select **Local Business**, provide city without a URL, edit an optional owner-declared claim, and check 375px overflow, keyboard focus and labeled fields.
3. Enter missing/invalid URL, city, name, goal, short description and budget; inline errors should appear and entered fields must remain untouched.
4. Analysis must **never** report a scan or AI result. Review must **never** create confirmation/audit/publish authorization. No request to Google/OpenAI/Resend/Neon/Cloudflare should occur.

No GitHub Actions approval, deployed Preview, WCAG audit, auth flow or persistence test is implied. Missing source extraction and user/tenant ownership are blockers for a real customer workflow. See #329 / #380 / #382.

**Next engineering slice:** architect standalone project membership/auth and dedicated disposable Postgres schema, then link actual revision-safe `@marketing/core` persistence without reusing CITYWALK staff/city scopes. Detailed auth screens, error states and legal/consent copy remain founder design gates.
