---
name: marketing-ai-quality
description: "Evaluate German Pack originality, grounded claims, human review, exports and model costs. Separates offline fixtures from real-model quality; excludes general UI QA and automatic provider execution."
---

# Marketing AI quality

## Responsibility and inputs
Judge a specific engine/version with reproducible evidence. Input: candidate SHA/schema/prompt/model configuration, confirmed fact snapshot, scenarios and evaluation mode. Read actual contracts/provider/QA and #416/#417/#418/#420 decisions. Reuse existing fixtures/harnesses and preserve v1/v2 history; declare changed paths/non-goals.

## Evaluation workflow
1. Label deterministic selectors, authored mocks, synthetic fixtures, live-model outputs and human edits separately. Offline authored v2 proves contract behavior, not model quality. Record source SHA, model/prompt/schema and fact revision/hash; never invent human scores.
2. Validate approved IDs/snapshot membership AND semantic entailment separately. Citations do not prove paraphrases follow. Check unsupported names/numbers/prices/dates/certifications/locations/services/testimonials/guarantees, contradictions, regulated claims and multilingual/prompt injection, including instruction-shaped approved facts. Human confirmation is not factual proof; uncertain meaning is needs_review/blocked, never silently safe.
3. Assess original natural German, specificity/actionability/channel/audience, useful seven-day plan, three genuinely distinct message angles, hooks/CTA. Reworded identical bodies are not distinct. Sparse facts require honest smaller output or owner questions, not invented benefits. Report false positives and false negatives; deterministic checks cannot prove complete semantic safety.
4. Run matched v1/v2 representative and adversarial fixtures: wrong/rejected fact, stale hash, nonentailed paraphrase, hidden guarantees/numbers, conflicting facts, one-fact scarcity, repeated angles, channel mismatch, injection and benign editorial. Retain per-case flags/limits. Test edit→new version→review invalidation, stale-review denial, retained old-version readers and exact content/hash-bound export. No production engine/schema replacement for an offline experiment.
5. Prepare blinded human German grading and service-SME usability evidence; report graders/results only when actually completed. Separate coherence/distinctness scores from factual safety. Production v2 and paid pilot remain NO-GO until required human and operational evidence.
6. Live evaluation needs explicit model/rates/credential authorization, safe runner, scenario count, tenant quotas and per-attempt/total/stop-loss budgets. Historical proposals are not spend permission. Stop on unexpected spend, unsafe claim leakage or accounting failure. Report measured tokens/usage/invoice cost versus reservations/estimates, FX, retries and failures; estimates are not actual cost. Redact private business data, credentials and prompts from public reports.

## Quality gate and expected output
Return exact-revision/mode evidence, per-case quality/claim matrix, false-positive/negative examples, test results, human status, measured/estimated costs, blockers and gate-specific GO/NO-GO. Done means reproducible results and explicit remaining human/live/operational gates; offline PASS is not commercial GO. Do not make live calls merely to complete evaluation.

## Shared workflow and authority
Start with [github-project-truth](../github-project-truth/SKILL.md), root/deeper `AGENTS.md`, `docs/agent/CITYWALK_ARCHITECTURE.md` and `docs/agent/CITYWALK_WORKFLOW.md`. Paths are repository-relative unless linked. Read relevant issue acceptance and latest explicit owner decisions; surface unresolved conflicts. Use GitHub Evidence → Product Scope → Design Review → Engineering Plan → Implementation → Tests and QA → Handoff. Analysis-only requests mark implementation/tests not applicable; they do not authorize feature edits.

Inspect source, tests, design references and incomplete drafts at their actual revision before proposing replacements. Reuse existing components, contracts and tested infrastructure; declare changed-file boundaries and non-goals. Preserve all worktrees and unfinished changes. Report local/draft/merged/tested/visual-approved/device-accepted/deployed/production-ready separately. Missing evidence is unverified, not a failure observed in the product.

Default stop before commit/push/PR unless explicitly authorized. Never automatically merge PRs, delete branches, deploy production, run destructive migrations or change payments. These skills do not grant infrastructure, provider-spend, legal-publication or store-submission authority. Report actual commands/results, skipped/blocked checks and owner decisions needed; do not invent passes.

## Marketing constraints
Preserve Green Direction B and selected Concept A Workspace UX. Concept A is a specification, not proof of implementation; locate its approved reference rather than confusing it with historical palette concepts. Workspace work leaves the approved landing unchanged unless explicitly requested. Tokens from #415: Forest Ink `#162D2C`, Soft Sage `#F0F3EC`, Lime `#D0EB8D`, Lilac `#C8BCEE`; Fraunces editorial and Manrope UI. Verify current source before edits. Marketing Workspace remains temporary; Wirkfaden is not an approved commercial name.

German service SMEs are the audience. Prioritize original useful German content, confirmed facts/provenance, human editing/review, immutable versions and honest exports. No invented company facts, testimonials, results or product capabilities. CITYWALK is intended internal customer #001, not evidence of external demand. Independent SaaS auth, tenant ownership, DB, API and release boundaries must not inherit CITYWALK staff privileges. Public signup/paid pilot, production v2, legal/naming and live-model operations require separate readiness evidence and authority; pricing hypotheses are not live billing approval.
