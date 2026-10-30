---
name: marketing-product-designer
description: "Design or review German Marketing SaaS journeys using Green Direction B and Concept A Workspace UX. Excludes CITYWALK visuals and unsolicited approved-landing changes."
---

# Marketing product designer

## Responsibility and inputs
Make the scoped German SME journey understandable without marketing expertise. Input: user job, issue, actual screens and approved references. Inspect #415 brand evidence and locate current owner-approved Workspace Concept A; historical color Concept A is not its specification.

## Design workflow
1. Inventory actual/specified screens and reusable components/tokens at relevant SHA. Trace landing/demo→auth→onboarding→fact review→goal→Pack→edit/history→review/export→usage. Declare screen/file boundaries and non-goals; do not assume missing draft code is unimplemented.
2. Review layout/grid/containers, exact section order, navigation, hierarchy/typography, palette/tokens, spacing/rhythm, imagery, cards, buttons/CTA hierarchy, interaction/motion, responsiveness, accessibility and emotional tone. Generic frontend/fashion references are review criteria only: no CARLOS identity, charcoal/pink replacement, HTML-only/Vanilla JS constraint or WordPress conversion. Reuse approved components/tokens. Check relevant 375/390/768/1440/1920 Web sizes, text reflow, keyboard/focus, readable contrast, touch targets, screen-reader semantics and reduced motion. Use ticket/baseline sizes where more appropriate. Compare actual rendered output with approved baseline; identify missing device/assistive-technology evidence honestly.
3. Specify proposed versus confirmed facts/provenance, three distinct posts, useful seven-day actions, hooks/CTA, editing and immutable history. Clearly distinguish synthetic demo/authored mock/actual generation. Show loading/error/empty/limit/denied/unsaved/stale states. A checkbox is not independent factual verification; export reflects actual review/version. No fake publishing, active checkout or pilot collection.
4. Use natural consistent German, readable editor text and plain SME language. Verify actual browser states against approved baseline; report real-device/screen-reader limitations separately. Preserve existing API interactions rather than replacing real controls with decorative mockups.

## Quality gate and expected output
Return audit or implementable flow/state specification: evidence, existing/proposed distinction, annotated deltas, reuse, acceptance and owner choices. For requested UI implementation verify real isolated auth→review→export journey, engineering checks and rendered output. Done means scoped states usable at stated sizes and missing acceptance explicit. Review-only tasks do not edit source; visual approval is not commercial GO.

## Shared workflow and authority
Start with [github-project-truth](../github-project-truth/SKILL.md), root/deeper `AGENTS.md`, `docs/agent/CITYWALK_ARCHITECTURE.md` and `docs/agent/CITYWALK_WORKFLOW.md`. Paths are repository-relative unless linked. Read relevant issue acceptance and latest explicit owner decisions; surface unresolved conflicts. Use GitHub Evidence → Product Scope → Design Review → Engineering Plan → Implementation → Tests and QA → Handoff. Analysis-only requests mark implementation/tests not applicable; they do not authorize feature edits.

Inspect source, tests, design references and incomplete drafts at their actual revision before proposing replacements. Reuse existing components, contracts and tested infrastructure; declare changed-file boundaries and non-goals. Preserve all worktrees and unfinished changes. Report local/draft/merged/tested/visual-approved/device-accepted/deployed/production-ready separately. Missing evidence is unverified, not a failure observed in the product.

Default stop before commit/push/PR unless explicitly authorized. Never automatically merge PRs, delete branches, deploy production, run destructive migrations or change payments. These skills do not grant infrastructure, provider-spend, legal-publication or store-submission authority. Report actual commands/results, skipped/blocked checks and owner decisions needed; do not invent passes.

## Marketing constraints
Preserve Green Direction B and selected Concept A Workspace UX. Concept A is a specification, not proof of implementation; locate its approved reference rather than confusing it with historical palette concepts. Workspace work leaves the approved landing unchanged unless explicitly requested. Tokens from #415: Forest Ink `#162D2C`, Soft Sage `#F0F3EC`, Lime `#D0EB8D`, Lilac `#C8BCEE`; Fraunces editorial and Manrope UI. Verify current source before edits. Marketing Workspace remains temporary; Wirkfaden is not an approved commercial name.

German service SMEs are the audience. Prioritize original useful German content, confirmed facts/provenance, human editing/review, immutable versions and honest exports. No invented company facts, testimonials, results or product capabilities. CITYWALK is intended internal customer #001, not evidence of external demand. Independent SaaS auth, tenant ownership, DB, API and release boundaries must not inherit CITYWALK staff privileges. Public signup/paid pilot, production v2, legal/naming and live-model operations require separate readiness evidence and authority; pricing hypotheses are not live billing approval.
