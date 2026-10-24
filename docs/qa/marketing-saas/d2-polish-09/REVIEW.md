# MKT-D2-POLISH-09 — local owner review

2026-10-24 (Europe/Berlin). Baseline: `bf2b57f1f3dccc8bdc5b783f93cd06c4b3ab9636`, canonical Draft #425, branch `codex/mkt-consolidate-01`. One focused local commit only. No push, merge, deployment or new provider request.

## Scope and implementation

D2 retains its hero headline, photographic composition, synthetic image bytes, section order and curated demo implementation. Concept A workspace, authentication, routes, backend APIs, database contracts, dependencies, CITYWALK and release gates are untouched. The footer intentionally becomes a complete forest-green product/access/legal navigation surface. No operator identity, copyright ownership, approved legal text, customer evidence, price or availability was invented.

Typography is scoped to D2: feature/workflow body 18px at 1440 and 17px at 1024; 16px at 768/390/375. FAQ summaries increase from 12px to 18px desktop / 16px narrow; footer main text 9px → 16px with 14px secondary text. Supporting feature labels, disclaimers and navigation are generally 14px or larger. The miniature hero illustration keeps its original smaller labels to preserve its approved composition; this is a deliberate exception, not a claim that every label is 14px. Main hero heading typography and heading/portrait dimensions match baseline at all five widths. Existing synthetic photography and hero-card placement are preserved. Natural wrapping and existing mobile card layout remain.

Native motion hook uses transform/opacity, a 520ms editorial entrance with 65ms hero stagger, and one-time 10px scroll reveals. No content starts hidden in CSS, so absent observers/animation support cannot leave sections invisible. Cleanup cancels animations and disconnects observers. Existing hero cards have a separate 4px, 8–9s drift after entrance; the footer provides a motion pause/resume control. Live system reduced-motion changes cancel native animation and disable CSS animation/transitions. An explicit `data-d2-capture` document attribute suppresses entrances and transitions for stable capture; screenshots also use reduced motion. No animation dependency was added.

Feature hover lift is 4px, category feedback 3px; buttons include press feedback and existing visible focus. FAQ retains native details/summary semantics and keyboard behavior, with smooth progressive disclosure in browsers supporting interpolate-size; others retain immediate native disclosure. FAQ's deliberate disclosure-size transition is the exception to transform/opacity-only motion. Pause/reduced-motion behavior is tested; this is not measured runtime performance or CLS certification.

Footer contains provisional identity/value proposition and honest closed-pilot status, product links, real curated-demo controls, existing-account login, an in-page pilot status destination, and anchored legal-status links. Two navigation columns on narrow screens keep the footer compact enough to scan. Legal routes remain status pages, not approved legal documents. No copyright statement was added because ownership/publication identity is not established.

## Actual before/after evidence

All are real browser captures with the same synthetic assets, local fonts and viewport configuration. Session read is intercepted with a null response in isolated landing QA; there is no live account or customer data. Before captures were completed before changing landing styles/source. Full five-width measurements are [before](before/metrics.json) / [after](after/metrics.json).

| Section | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Hero | [Before](before/hero-1440.png) / [After](after/hero-1440.png) | [Before](before/hero-390.png) / [After](after/hero-390.png) |
| Features | [Before](before/features-1440.png) / [After](after/features-1440.png) | [Before](before/features-390.png) / [After](after/features-390.png) |
| FAQ | [Before](before/faq-1440.png) / [After](after/faq-1440.png) | [Before](before/faq-390.png) / [After](after/faq-390.png) |
| Footer | [Before](before/footer-1440.png) / [After](after/footer-1440.png) | [Before](before/footer-390.png) / [After](after/footer-390.png) |

Additional 1024/768/375 captures and raw accessibility/test reports stay in private temporary storage. Tall baseline section captures may include the existing offscreen skip-link capture artifact. The scoped fix keeps it clipped only while unfocused; keyboard-focus visibility is explicitly tested after the change.

## Executed checks

- 62 tests passed, zero failures: Marketing frontend (including four new motion lifecycle/fallback tests) and canonical CI guard tests.
- 69 D2 browser checks passed at 1440/1024/768/390/375: body/footer sizes, no horizontal overflow, heading/photo dimensions, visible keyboard skip link, native FAQ keyboard activation, real footer demo, pilot destination and gated legal links. Real browser motion runs, pause, live reduced-motion cancellation and capture suppression were tested. One initial reduced-motion assertion sampled before the preference-change event; final check waits for actual cancellation.
- 271 existing curated demo browser checks passed unchanged at all five widths: three tabs, text edits/reset, keyboard, exact-version human review, Markdown download, no image requirement and truthful post-demo conversion. Zero external browser requests and no mutation API calls; only the existing landing session read is allowed. No tenant/customer data used.
- Automated axe WCAG-tag checks: zero violations in tested landing/footer states at five widths and all existing demo states. Incomplete/manual categories remain; no screen-reader or physical-device certification.
- Frontend TypeScript PASS; focused lint PASS with zero errors/warnings; Marketing Vite production build PASS; git diff --check PASS.
- Browser route regression: legal status/conditions anchor, anonymous workspace → closed signin, obsolete design route → unavailable. These isolated route checks use null-session fixtures, not a new backend authentication integration run.
- No backend/database/mobile code changed; database integrations, CITYWALK root build and real-device tests were not rerun for this frontend-only polish. New local commit is not covered by GitHub CI until an authorized push.
- 117/117 protected Human Review hashes and 321/321 held-file hashes unchanged. No branch/worktree deletion, private reviewer content or raw credential/session/export artifacts included.

Reproduce with an isolated local Marketing Vite frontend, then `MARKETING_POLISH_PHASE=before` or `after` and `MARKETING_BROWSER_ORIGIN` configured when running `node scripts/marketing-d2-polish-browser.mjs`. Before phase must run against the recorded baseline; after phase uses that evidence directory (`MARKETING_POLISH_EVIDENCE`, private tmp by default) for geometry comparison. Existing `scripts/marketing-consolidate-demo-browser.mjs` covers unchanged demo behavior. No provider access or credentials are required.

## Exact changed-file inventory

Application/test sources:

- apps/marketing-saas/src/marketing/direction-d2/LandingD2.tsx
- apps/marketing-saas/src/marketing/direction-d2/polish09.css
- apps/marketing-saas/src/marketing/direction-d2/useD2Motion.ts
- apps/marketing-saas/src/marketing/direction-d2/useD2Motion.test.tsx
- scripts/marketing-d2-polish-browser.mjs

Review evidence (19 files): this REVIEW.md; before/metrics.json; after/metrics.json; before/ and after/ each contain hero-1440.png, hero-390.png, features-1440.png, features-390.png, faq-1440.png, faq-390.png, footer-1440.png and footer-390.png.

24 changed files total. Ready for local owner visual acceptance; not merge/release approval. Remaining limits: small illustrative hero labels intentionally retained; motion comfort and assistive technology require human review; native FAQ animation falls back on unsupported browsers. Public pilot, live AI, billing, analytics and lead collection remain disabled. #425 remains Draft.
