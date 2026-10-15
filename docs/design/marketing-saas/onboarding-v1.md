# Marketing SaaS Phase 1 — Founder-approved Desktop + Mobile Onboarding V1

**Status:** DESIGN SLICE APPROVED for implementation; original rendered assets awaiting archival in this branch.
**Date:** 2026-10-15.
**Product issue:** [#382](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/382)
**Design gate:** [#380](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/380)
**Existing implementation reference:** [Draft #364](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/364) (CITYWALK staff-only Brand Workspace; **not merged, not the SaaS UI**).

## Founder design decision

The founder explicitly approved **both** the Desktop and Mobile onboarding preview on 2026-10-15. Retain the approved structure, information hierarchy and major visual treatment. Do not silently redesign it. The approved screen design is a **prototype**, not implemented research, AI, database persistence or a complete finished sign-in system.

- Base UI: quiet near-white workspace, white rounded cards, dark compact desktop sidebar, purple/indigo primary accent, strong hierarchy, plain-language explanation suitable for non-marketers.
- Desktop reference: **1440 × 900** onboarding and confirmation.
- Mobile reference: **390 × 844** onboarding, details, confirmation; also test at **375px**.
- Four stages: **Project Type → Your Business → Analysis → Confirm Facts** → first empty-state Dashboard.
- All three project types are **Phase 1**: **Website**, **App**, **Local Business** (local-business mode is not a Phase 2-only add-on).
- User-facing copy must tell the truth about provenance: owner-declared input is not independently verified research. Human fact confirmation never authorizes content publication; content editorial approval and Publish/Schedule authorization are separate later actions.
- `MKT.ai`, sample project names, fake example URLs, example metrics, and illustrations are **placeholders**. Founder has **not** approved the final product name/logo, exact typographic license/color tokens, final German translations, legal copy, or auth screens.

## Approved visual asset inventory (for exact version lock)

The design has been delivered in the ChatGPT conversation on 2026-10-15 as a ZIP and standalone files. **The assets themselves are not yet in GitHub**; add them under `docs/design/marketing-saas/v1/` before starting UI implementation, without altering the approved bytes.

| Original file | SHA-256 | Meaning |
| --- | --- | --- |
| `phase1_onboarding_v1.html` | `4c38ecf1835fa0aa0f8ba1333e439d74e2d5120b8427c1b3907365c91ae16488` | Clickable static concept; no auth, network, persistence or AI |
| `desktop_onboarding.png` | `2d38ebb42527393fd865d8d42b765df191e063dc30096625afcc5883efcfe7e7` | Desktop Stage 1 |
| `desktop_confirmation.png` | `bcb35faa7d4aeeb404a1c15bc40dab45e384ddc80493427326b69de739b9bfb9` | Desktop Stage 4 |
| `mobile_onboarding.png` | `af620dca1e903b0fc592846ff4acf48c6f89a1a41dccdf99ac735a1495e7f5e9` | Mobile Stage 1 |
| `mobile_details.png` | `c931dc66b61a371a657971d599e7534a51edb1521380dab57adcf522a88fc4ff` | Mobile Stage 2 |
| `mobile_confirmation.png` | `2deb29b724fdbfabf4ad9909cc126cdc4fe0e9c9e6cf466ff405683e411ca78b` | Mobile Stage 4 |

If the source ZIP is downloaded, its files are nested inside `marketing_saas_design/`. Preserve the source file names and hashes; update this document only if the founder explicitly approves a revised design.

## Screen and behavior contract

### Stage 1: Project Type
Three equally understandable choices: Website / App / Local Business. Keyboard operable, clearly selected state. No marketing experience or paid account purchase is required merely to choose a type.

### Stage 2: Owner-supplied information
Project/business name; URL for website/app or location for local business; plain-language goal, budget, description/offer. Validate using the existing generic `@marketing/core` raw brief and Zod contracts. Do not silently scrape or assert external evidence. Show error text next to offending inputs; preserve data on Back/retry. Treat URLs and descriptions as untrusted and handle secrets/personal data conservatively.

### Stage 3: Analysis
Show truthful per-stage progress, loading, failure and retry states. If no source research integration exists, clearly say **not analyzed**; never label demo data as verified. Real URL crawling/intake adapter is separate #329 work and needs SSRF/private IP/redirect/size/time safety, provenance and user disclosure.

### Stage 4: Review and Confirm Facts
Explicitly distinguish `owner-declared`, `source-backed (not yet human-confirmed)`, `hypothesis`, `unknown`, and `human-confirmed`. Allow editing each item, rejecting unsafe/false claims, seeing source/provenance, and only confirming statements deliberately reviewed by an authenticated authorized user. Revision concurrency and audit must be enforced on the backend, not just by disabled client buttons. Confirmation is NOT publication permission.

### Dashboard
A welcoming, accurate empty state for a newly created project. Do not show invented KPIs, scheduled posts or real AI work. Present next actions as Planned/Unavailable until their respective modules exist.

## Architecture rules (non-negotiable)

- Reuse `packages/marketing-core` from merged #360 and versioned Brand Context/audit concepts from merged #362. Reuse interaction/test approaches from **unmerged** #364 only after explicitly reviewing/porting them; do not treat its code as already present in `develop`.
- Customer SaaS requires its own authenticated tenant/project membership/authorization and dedicated persistence boundary. **No CITYWALK traveler/staff sessions, retained-city access tables, existing AdminShell or CITYWALK production database for external customers.**
- Develop reusable modules in this repository as needed, with CITYWALK as internal test customer #001; extract independent app/repo/database before onboarding paying external customers, according to `docs/architecture/marketing-saas-extraction.md` (currently on Draft #364 branch, must be reconciled).
- Never conflate (1) business fact confirmation, (2) editorial content approval, or (3) explicit Publish/Schedule authorization.
- No real AI/provider calls, Google Cloud provisioning, Cloudflare deployment, revenue claim, or public customer beta is authorized by this design document.

## Acceptance gates

- [x] Desktop design direction and onboarding preview founder-approved.
- [x] Mobile design direction and onboarding preview founder-approved.
- [ ] Archive exact HTML/screens in GitHub and verify checksums against this contract.
- [ ] Resolve remaining unapproved details (sign-in/out UX, localized labels, precise tokens, error/retry/empty states, legal/consent) with founder before implementing those affected screens.
- [ ] Separate real customer app boundary and tenant model, dedicated local test DB, and explicit authorization tests.
- [ ] Build an accessible responsive first UI slice matching the archived V1 and run local 1440/390/375px Playwright, keyboard, focus, input validation and cross-tenant rejection.
- [ ] Require explicit human confirmation and persistent revision-safe backend before showing a real completed state.
- [ ] Founder visual QA acceptance on running UI vs archived approved screens.
- [ ] GitHub Actions, deployed Preview and release/security gates (currently blocked by Actions account spending-limit).

**Reminder:** The founder-approved design is one implementation direction, **not an assertion that the customer-facing SaaS feature already exists**.
