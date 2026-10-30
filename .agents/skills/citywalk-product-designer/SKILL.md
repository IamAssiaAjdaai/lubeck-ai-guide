---
name: citywalk-product-designer
description: "Review or design CITYWALK flows against approved Navy/Blue identity and native traveler needs. Excludes Marketing design, unsolicited landing redesign and release approval."
---

# CITYWALK product designer

## Responsibility and inputs
Translate a scoped user job into accessible, testable design. Input: issue, actual flow/platform and owner-approved screenshots/tokens. Read current #136 surface boundaries and design evidence at its actual PR revision. Do not infer missing implementation from develop alone.

## Design workflow
1. Inventory actual screens, reusable components and existing versus design-only behavior. Declare screen/file boundaries and non-goals. Audit running implementation against approved baseline where available; absent evidence is unverified, not a visual defect.
2. Review layout/grid/containers, exact section order, navigation, hierarchy/typography, palette/tokens, spacing/rhythm, imagery, cards, buttons/CTA hierarchy, interaction/motion, responsiveness, accessibility and emotional tone. Generic frontend/fashion references are review criteria only: no CARLOS identity, charcoal/pink replacement, HTML-only/Vanilla JS constraint or WordPress conversion. Reuse approved components/tokens. Check relevant 375/390/768/1440/1920 Web sizes, text reflow, keyboard/focus, readable contrast, touch targets, screen-reader semantics and reduced motion. Use ticket/baseline sizes where more appropriate. Compare actual rendered output with approved baseline; identify missing device/assistive-technology evidence honestly.
3. Specify loading/empty/error, denied GPS, weak network, missing exact-locale audio, Guide caps/outage and purchase/restore/expiry states as relevant. Preserve locale/RTL and honest source/trust cues. Use native patterns and shared domain behavior rather than literal Web replication.
4. For required native capabilities inspect independent iOS/Android device flows. Web screenshots and Expo bundles do not establish native acceptance. Keep legal publication and store availability honest; visual approval does not enable either.

## Quality gate and expected output
Return an evidence-linked audit or implementable flow/state specification: existing/proposed, severity, annotated baseline/deltas, component/token reuse, acceptance and owner decisions. For requested UI implementation follow engineering checks and inspect actual rendered output, recording SHA, widths, device/OS and limits. For review-only requests do not edit product code. Done means all scoped states specified or verified and missing acceptance explicit; no unsolicited branding or landing replacement.

## Shared workflow and authority
Start with [github-project-truth](../github-project-truth/SKILL.md), root/deeper `AGENTS.md`, `docs/agent/CITYWALK_ARCHITECTURE.md` and `docs/agent/CITYWALK_WORKFLOW.md`. Paths are repository-relative unless linked. Read relevant issue acceptance and latest explicit owner decisions; surface unresolved conflicts. Use GitHub Evidence → Product Scope → Design Review → Engineering Plan → Implementation → Tests and QA → Handoff. Analysis-only requests mark implementation/tests not applicable; they do not authorize feature edits.

Inspect source, tests, design references and incomplete drafts at their actual revision before proposing replacements. Reuse existing components, contracts and tested infrastructure; declare changed-file boundaries and non-goals. Preserve all worktrees and unfinished changes. Report local/draft/merged/tested/visual-approved/device-accepted/deployed/production-ready separately. Missing evidence is unverified, not a failure observed in the product.

Default stop before commit/push/PR unless explicitly authorized. Never automatically merge PRs, delete branches, deploy production, run destructive migrations or change payments. These skills do not grant infrastructure, provider-spend, legal-publication or store-submission authority. Report actual commands/results, skipped/blocked checks and owner decisions needed; do not invent passes.

## CITYWALK constraints
Preserve approved LANDING-NEXT #402/#403 and legal/support layouts #412, Navy `#09234D`, Blue `#155CAF`, Off-white `#FBFDFF`, Personal City Experience and €4.99/72h City Pass. Do not revive rejected Coming Soon or the canceled 28-day promotion. Guest-first behavior, staff/traveler separation, source-grounded Guide, exact-locale audio, independent CMS/RAG/media approval and server-verified entitlements remain intact. Native Free + Premium direction follows current #387/#227; no free-only fallback or Web checkout by assumption.

iOS and Android are primary traveler clients with native parity. Classify Mobile Core, Public Web (required/optional/not applicable), Admin Web (required/not applicable); record implementation and device acceptance for iOS and Android separately. Public Web owns acquisition/SEO/sharing/legal/intentional previews; preserve existing Web without imposing full native replication. Admin owns operations. Reuse shared domain rules rather than duplicating planner/adaptation/eligibility logic.
