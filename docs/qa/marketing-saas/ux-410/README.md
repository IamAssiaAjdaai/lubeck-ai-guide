# MKT-UX-01 — implementation and acceptance

Issue [#410](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/410). UI branch `codex/mkt-ux-01-conversion-journey`, based exactly on Draft [#409](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/409), head `40d7bc7871603cb4df3fc3e07b57405b4c37057e`. Separate SaaS frontend; no CITYWALK traveler/admin surface change. Mobile Core / native iOS / native Android: not applicable. Responsive SaaS Web: required. CITYWALK Public Web and Admin Web: not applicable.

## Screen inventory and design direction

Baseline: the public `/` was a short paragraph and access link. Auth, project intake, proposed/confirmed facts, campaign setup, plan, post editor, saved versions, history and usage existed. Preserve this functional slice and the approved #380 auth/onboarding direction.

Direction delivered before implementation: a product-led German landing with charcoal product rails, off-white surfaces, restrained violet, clear typography, generous spacing and a prominent Marketing Pack. No stock assets, fake customers, fake charts, engagement numbers or copied competitor imagery. Position the confirmed-fact → goal → campaign → human edit/export journey, rather than website-to-posts as a unique feature.

New public screens: full landing `/`, anonymous interactive example embedded at `/#beispiel`, legal release status `/rechtliches` with three linked sections. Existing `/auth` and authenticated workspace remain connected through navigation. `/design/auth` remains a separate design reference.

## Working conversion journey

- Responsive sticky header, mobile menu, keyboard-operated workflow tabs, deliverables, pain/benefits, product screenshots, service-business uses, pricing hypotheses, review boundaries, ten FAQs, final CTA, footer and gated legal links.
- Primary conversion leads to the working example. Pilot contact collection is deliberately disabled, with a visible reason. No pretend request handler, purchase, checkout, trial or public signup promise.
- Example uses the **existing browser-safe pack assembler and Markdown renderer** from `pack.contract.ts`. It does not import server/provider modules or make API requests. Fixed synthetic inputs only; `.example` source addresses are plain text, never crawled links.
- Tour: fixture intake → select proposed facts → explicit confirmation → choose campaign objective → seven-day plan / exactly three posts, three hooks and CTA → edit → save immutable in-memory versions → review latest saved version → download/copy. Excluded facts are tested absent from export. Fixed template is disclosed; changing goals records the selected goal rather than pretending model personalization.
- Browser example state lasts only until reload/reset. This is explicitly distinguished from persistent authenticated workspace versions. Older versions are read-only; export follows the MVP latest-version rule. Manual edits remain unverified.
- Workspace polish covers login/signup/recovery, empty/project states, onboarding steps, source review, next-step CTA, objective setup, quota meter, history, plan, editor, versions and review/export. Unsaved edits block tab switching/logout; browser navigation prompts through `beforeunload`. Existing history/project/version guards stay intact.
- No schema, migrations, API contracts, authentication, membership checks, tenant authorization, quotas, provenance, provider logic or publishing behavior changed.

## Research (observed 2026-10-21)

All six public pages were read before implementation. Real Chrome at 390×844 confirmed no document overflow on any of the six and examined mobile navigation/hero hierarchy. Captures were inspected locally, not copied into product assets. Public claims below are observations, not verified customer outcomes or endorsements.

| Public source | Information architecture and conversion observations | Decision for this product |
| --- | --- | --- |
| [Yorby](https://www.yorby.ai/reel-growth) | Outcome hero → tools/demo → creator proof → monthly/annual credit pricing → FAQ. Mobile menu, prominent initial CTA. Focus on short-form scripts and account tracking; testimonials support its commercial message. | Show output early and explain quota. No viral promise, account spying or borrowed social proof. |
| [Pitoora](https://pitoora.de/) | Closest category overlap: strong automation hero, product/video proof, account-free website/example plan, feature showcase, process, pricing, FAQ. Starter publicly listed at €100/month ex VAT. Mobile prioritizes a large CTA and trial action; page also offers sample businesses and an editable content preview. | Low-friction product exploration is useful. Our tour is fixed, synthetic and token-free; differentiation rests on confirmed facts plus a goal-directed campaign and manual review/export. Website analysis alone is not unique. No automatic publishing/trial claims. |
| [Campaiva](https://campaiva.com/) | Broad platform hero, labeled demo dashboard, benefit-led feature sections, short process, trust explanations, extensive pricing/FAQ. Public Solo €39 / Starter €79 ex VAT; repeated trial CTA. Mobile stacks copy, CTA and dashboard. | Use labeled real product proof and answer buying objections clearly. Avoid claiming its wider CRM/automation/hosting capabilities. |
| [Digo.Social](https://www.digo.social/de) | Agency-oriented voice, visual post cards and actual screenshot gallery, approvals portal, credits, workflow and FAQ. Synthetic brands explicitly labeled. Mobile dashboard proof remains legible in stacked sections. | Clearly label synthetic businesses, explain human approvals and credit costs. Do not imply agency portal, scheduling or images exist here. |
| [PostMind](https://postmind.de/) | Problem-led self-writing posts hero, three-step explanation, industry cases, feature/benefit sections and self-serve offer, with FAQ/trial conversion. Public €59/month reference. Mobile opens with copy and primary action. | Familiar small-business language and concrete use cases; no invented industry evidence or autonomous content promise. |
| [sichtkompass](https://sichtkompass.de/) | Knowledge-grounded positioning, real calendar/interface proof, four steps, features, hosting choices, net pricing around €69/month and demo/contact path plus FAQ. Mobile simple menu and readable sections. | Explain the role of company facts and an understandable four-step journey. Do not adopt its hosting, compliance, automatic publishing or model-operation claims. |

## Assets and metadata

`apps/marketing-saas/public/product/*.webp` are optimized real Chrome screenshots of this local application with synthetic test data (approximately 19 KB each), regenerated by the authenticated smoke journey. They contain no real business data or credentials. New components render the hero proof from deterministic pack data; it is a live UI preview, not a screenshot claiming a live customer.

German document language, preview description/Open Graph title/description/locale and `noindex,nofollow` are present. No approved domain exists, so no invented canonical, public OG URL, sitemap or structured commercial claims were added. Approved domain/OG delivery and public SEO indexing remain release work. No analytics or marketing trackers were added. Legal links resolve to honest status pages, not invented operator policies.

## Reproduce

Use the existing isolated local PostgreSQL and `npm run marketing:demo` (forces AI off), as documented in the parent runbook. Browser scripts use installed Chrome locally and bundled Chromium in CI. They block external requests. No production DB, real emails, real AI, charges or deployment are involved.

```sh
npm --prefix apps/marketing-saas run typecheck
npm --prefix apps/marketing-saas run build
npm run lint
npm run test:run
MARKETING_TEST_DATABASE_URL='<isolated local Marketing QA URL>' npm run marketing:test:integration
npm run marketing:db:migrate
npm run marketing:db:verify
node scripts/marketing-saas-landing-smoke.mjs
MARKETING_FULL_JOURNEY=true node scripts/marketing-saas-pilot-smoke.mjs
```

The existing dedicated SaaS CI workflow now executes both browser journeys and uploads the tour/a11y evidence. No new project dependencies or lockfile changes.

## Evidence and remaining acceptance

Before: `before/workspace-{1440,390}.png`, copied unchanged from #409 evidence. After: `landing-{1440,768,390,375}.png`, `sample-{1440,768,390,375}.png`, `auth-{1440,390}.png`; actual workspace at all four widths in the parent `screenshots/complete-journey-*.png`. `sample-export.md` is the actual reviewed, version-two browser download. `axe-*.json` records automated WCAG-tagged checks (including manual-review/incomplete categories); automated results do not certify accessibility or replace screen-reader testing.

Owner visual/copy/pricing sign-off remains outstanding. No external Preview, public launch or paid pilot approval is claimed. External paid pilot remains **NO-GO**: the parent security, legal/operator identity, email, live-model quality/cost, deployment, retention/erasure and backup/restore gates remain. No merge/deployment is part of this task.

## Executed validation — final local implementation

| Gate | Actual result |
| --- | --- |
| Full unit regression | 237 files passed / 21 skipped; **1,516 tests passed / 142 skipped**. Skipped integrations are not counted as passes. |
| Isolated PostgreSQL integration | **9 passed**, auth/tenant and pack suites; real QA database, synthetic inputs, real AI disabled. |
| TypeScript | Root `npx tsc --noEmit`, independent API and UI typechecks passed. Initial sandbox attempt could not write the ignored incremental build cache; rerun with worktree write access passed. |
| Root Next production build | Passed with synthetic build-only auth/database settings. No production DB used. |
| Standalone Vite build | Passed; 123 modules; JS approximately 105 KB gzip and CSS 12 KB gzip. |
| Lint | Zero errors; eight existing CITYWALK warnings. No new warnings. |
| `db:generate` | No schema changes / nothing to migrate. |
| Migration / integrity | Independent `marketing:db:migrate` passed; `marketing:db:verify` passed with four unchanged migrations. CITYWALK `db:migrate`/`db:verify` were not run: no CITYWALK schema changed and its database is outside this UI ticket. |
| Browser authenticated journey | `MARKETING_SAAS_COMPLETE_DEMO_JOURNEY_PASS`; persisted fact confirmation, edit, original version preservation, export, clipboard, usage, unsaved navigation protection, four widths, no overflow/page errors. |
| Browser anonymous journey | `MARKETING_SAAS_LANDING_TOUR_PASS`; disabled fact gate, selected-fact-only output, goal, seven days/three posts, edit/version history, review-gated Markdown and clipboard, keyboard tabs, mobile menu, FAQ, legal and auth; four widths; **zero API calls** on landing/tour. |
| Accessibility | Zero axe WCAG-tagged violations in landing, sample result, legal status, login and authenticated Pack. Contrast findings corrected. Incomplete/manual-review items retained in JSON; not accessibility certification. |
| Final diff/security | `git diff --check` clean. No env/secret/sink files staged, no dependency/lockfile/API/schema changes, no new analytics, external requests, publishing, contact collection, charges or production access. |
| Guest/public behavior | Existing CITYWALK routes unchanged; full regression suite passed. SaaS `/` remains public even with a local session; `/auth` opens the existing authenticated workspace. |

React review: state updates use immutable arrays; effects have cleanup and declared dependencies; shared deterministic contract is browser-safe; no provider/server module is bundled; labels, current-step states, focus styles, reduced motion, lazy optimized images and explicit demo/version semantics were checked. No new runtime library was added.

Pushed/CI/PR status must be assessed on the final PR head. Local execution alone does not establish remote CI, Preview, owner acceptance, merge or deployment.
