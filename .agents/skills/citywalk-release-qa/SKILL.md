---
name: citywalk-release-qa
description: "Assess CITYWALK candidate CI, integration, Preview, device and store readiness with exact-revision evidence. Excludes Marketing copy evaluation and authority to release."
---

# CITYWALK release QA

## Responsibility and inputs
Judge a candidate gate reproducibly. Input: full SHA, acceptance criteria, artifact/build IDs and intended environment. Read #187/#387/#424, manifests/workflows and subsystem runbooks; reuse valid same-revision evidence, rerun when source changes invalidate it.

## QA workflow
1. Identify source/artifact relationship, dependencies and changed-file/non-goal boundary. Verify exact-head CI jobs individually: skipped integration, runner refusal and assertion failure are distinct. Old green jobs cannot prove a newer tree. #413/#423 are CI evidence, never product merge recommendations.
2. Use full repository code gate plus affected DB/auth/CMS/media/commerce/lifecycle/knowledge integrations; establish isolated target before DB writes. Add mobile doctor/lint/types/tests/config and Cloudflare build/binding checks as relevant. Check migration drift and rollback; never weaken suites to pass. Docs-only work does not require DB execution.
3. Inspect real deployment revision/environment/bindings/health read-only. Separate historical Vercel protection/SSO from app errors and current Cloudflare targets. Expo/EAS Preview origin must be explicit isolated HTTPS with separate DB/storage/auth/tester access. Locked #419/#422 offline fixtures do not prove provisioning/connectivity. No automatic unlock/upload.
4. Record iOS and Android device/OS, signed build/version, source SHA, date and scenarios separately. Test guest→planner→walk→finish/save, GPS allow/deny, Lübeck field walk, Return-by/adaptation, audio locale, DE/EN/RTL, Guide limits, poor network, login/deletion, deep links and revoked shares as scoped.
5. For commerce verify approved sandbox purchases, restore/expiry/cancellation/revocation/duplicates, wrong city/user and outage denial with server entitlements. No live product/config/payment changes. Check legal fail-closed guard, private operator/counsel approval, consent/deletion, media rights, store privacy/listings, support, AI abuse limits, backup/restore and production routing/rollback.

## Quality gate and expected output
Return exact-revision table with PASS/FAIL/BLOCKED/SKIPPED/UNVERIFIED/NOT APPLICABLE, commands/job links, negative cases, observed defects versus missing evidence, iOS/Android outcomes and owner actions. Give gate-specific GO/NO-GO; missing mandatory evidence means release NO-GO. Done means every gate is evidenced or precisely blocked, not authorization to deploy, publish legal pages or submit stores.

## Shared workflow and authority
Start with [github-project-truth](../github-project-truth/SKILL.md), root/deeper `AGENTS.md`, `docs/agent/CITYWALK_ARCHITECTURE.md` and `docs/agent/CITYWALK_WORKFLOW.md`. Paths are repository-relative unless linked. Read relevant issue acceptance and latest explicit owner decisions; surface unresolved conflicts. Use GitHub Evidence → Product Scope → Design Review → Engineering Plan → Implementation → Tests and QA → Handoff. Analysis-only requests mark implementation/tests not applicable; they do not authorize feature edits.

Inspect source, tests, design references and incomplete drafts at their actual revision before proposing replacements. Reuse existing components, contracts and tested infrastructure; declare changed-file boundaries and non-goals. Preserve all worktrees and unfinished changes. Report local/draft/merged/tested/visual-approved/device-accepted/deployed/production-ready separately. Missing evidence is unverified, not a failure observed in the product.

Default stop before commit/push/PR unless explicitly authorized. Never automatically merge PRs, delete branches, deploy production, run destructive migrations or change payments. These skills do not grant infrastructure, provider-spend, legal-publication or store-submission authority. Report actual commands/results, skipped/blocked checks and owner decisions needed; do not invent passes.

## CITYWALK constraints
Preserve approved LANDING-NEXT #402/#403 and legal/support layouts #412, Navy `#09234D`, Blue `#155CAF`, Off-white `#FBFDFF`, Personal City Experience and €4.99/72h City Pass. Do not revive rejected Coming Soon or the canceled 28-day promotion. Guest-first behavior, staff/traveler separation, source-grounded Guide, exact-locale audio, independent CMS/RAG/media approval and server-verified entitlements remain intact. Native Free + Premium direction follows current #387/#227; no free-only fallback or Web checkout by assumption.

iOS and Android are primary traveler clients with native parity. Classify Mobile Core, Public Web (required/optional/not applicable), Admin Web (required/not applicable); record implementation and device acceptance for iOS and Android separately. Public Web owns acquisition/SEO/sharing/legal/intentional previews; preserve existing Web without imposing full native replication. Admin owns operations. Reuse shared domain rules rather than duplicating planner/adaptation/eligibility logic.
