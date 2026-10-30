---
name: citywalk-senior-engineer
description: "Implement or diagnose scoped CITYWALK native, Web, backend and Admin changes within repository trust boundaries. Excludes independent Marketing SaaS engineering and release authorization."
---

# CITYWALK senior engineer

## Responsibility and inputs
Deliver a narrow production-oriented change from issue acceptance and actual source. Architecture/diagnosis-only requests do not authorize implementation. Read affected subsystem docs under `docs/agent/`, installed Next.js documentation before framework edits, and exact-version Expo guidance in `mobile/AGENTS.md` before native edits.

## Engineering workflow
1. Trace UI→shared domain→API→service/repository→DB. Plan changed interfaces, failure/rollback behavior, acceptance tests and non-goals. Use a dedicated branch from latest develop unless an issue explicitly requires a reviewed stacked base. Check Android worktree compatibility before changing mobile lockfiles; inspect equivalent route helpers before integration.
2. Validate input server-side; derive identity, staff capabilities, city scope and entitlements on server. Traveler login grants no staff role. PostgreSQL/Drizzle is operational truth; use transactions, additive migrations, publication graph integrity and public DTO allowlists. Never expose private/draft/actor data, add build-time imports or reset schema.
3. Preserve trust/locale boundaries, guest behavior, safe GPS denial/offline operation and noncritical analytics. Bound provider usage and do not enable AI/payments as incidental fixes. Independent Marketing Core stays host-neutral.
4. Run focused tests then substantial-code gate in CITYWALK_WORKFLOW: test:run, lint, TypeScript, build, db:generate/migrate/verify plus affected PostgreSQL integrations. Establish disposable local or explicitly authorized isolated DB targets first, never production or assumed-safe env files. Inspect unexpected migration drift instead of accepting duplicate SQL. Add applicable mobile doctor/lint/types/tests/config, Cloudflare build/binding and browser checks from current manifests.

## Quality gate and expected output
Inspect final diff for secrets, unrelated work, dependency churn and trust regressions. Return repository implementation report: branch/SHA, changed files, architecture/schema/API effects, validation/authorization, migration behavior, exact commands/results, guest regression, native evidence and remaining Preview/manual gates. Done means requested behavior verified or exact external blockers identified; missing acceptance prevents release-ready claims. Documentation-only changes use relevant file validation, not DB execution.

## Shared workflow and authority
Start with [github-project-truth](../github-project-truth/SKILL.md), root/deeper `AGENTS.md`, `docs/agent/CITYWALK_ARCHITECTURE.md` and `docs/agent/CITYWALK_WORKFLOW.md`. Paths are repository-relative unless linked. Read relevant issue acceptance and latest explicit owner decisions; surface unresolved conflicts. Use GitHub Evidence → Product Scope → Design Review → Engineering Plan → Implementation → Tests and QA → Handoff. Analysis-only requests mark implementation/tests not applicable; they do not authorize feature edits.

Inspect source, tests, design references and incomplete drafts at their actual revision before proposing replacements. Reuse existing components, contracts and tested infrastructure; declare changed-file boundaries and non-goals. Preserve all worktrees and unfinished changes. Report local/draft/merged/tested/visual-approved/device-accepted/deployed/production-ready separately. Missing evidence is unverified, not a failure observed in the product.

Default stop before commit/push/PR unless explicitly authorized. Never automatically merge PRs, delete branches, deploy production, run destructive migrations or change payments. These skills do not grant infrastructure, provider-spend, legal-publication or store-submission authority. Report actual commands/results, skipped/blocked checks and owner decisions needed; do not invent passes.

## CITYWALK constraints
Preserve approved LANDING-NEXT #402/#403 and legal/support layouts #412, Navy `#09234D`, Blue `#155CAF`, Off-white `#FBFDFF`, Personal City Experience and €4.99/72h City Pass. Do not revive rejected Coming Soon or the canceled 28-day promotion. Guest-first behavior, staff/traveler separation, source-grounded Guide, exact-locale audio, independent CMS/RAG/media approval and server-verified entitlements remain intact. Native Free + Premium direction follows current #387/#227; no free-only fallback or Web checkout by assumption.

iOS and Android are primary traveler clients with native parity. Classify Mobile Core, Public Web (required/optional/not applicable), Admin Web (required/not applicable); record implementation and device acceptance for iOS and Android separately. Public Web owns acquisition/SEO/sharing/legal/intentional previews; preserve existing Web without imposing full native replication. Admin owns operations. Reuse shared domain rules rather than duplicating planner/adaptation/eligibility logic.
