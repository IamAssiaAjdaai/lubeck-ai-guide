# Project skill routing

Choose the product and role below; begin substantial work with `github-project-truth`. Skills contain durable constraints, not a cached roadmap. Paths mentioned inside skills are repository-relative unless linked. Read matching deeper AGENTS and current issue acceptance before changing source.

| Skill | Trigger | Inputs | Expected output | Scope boundary |
| --- | --- | --- | --- | --- |
| [github-project-truth](github-project-truth/SKILL.md) | Substantial task/status/consolidation preflight | Goal, issue/PR, checkout | Linked evidence/risk matrix, next three actions per product | Read-only; no integration authority |
| [citywalk-senior-engineer](citywalk-senior-engineer/SKILL.md) | CITYWALK implementation/diagnosis | Acceptance, source, subsystem docs | Narrow change, test results, engineering handoff | No independent SaaS or incidental payment changes |
| [citywalk-product-designer](citywalk-product-designer/SKILL.md) | CITYWALK design/review | Flow/platform, approved baseline | Audit or state specification, visual acceptance | Preserve brand/landing; native evidence separately |
| [citywalk-product-manager](citywalk-product-manager/SKILL.md) | CITYWALK scope/priorities | User job, issues, research | Issue-ready slices, criteria/dependencies/metrics | No feature edits or release authority by default |
| [citywalk-release-qa](citywalk-release-qa/SKILL.md) | Candidate readiness review | SHA/artifacts, criteria, environment | Gate-specific GO/NO-GO evidence | No deployment/store/legal/payment activation |
| [marketing-senior-engineer](marketing-senior-engineer/SKILL.md) | Independent SaaS implementation | Acceptance, draft source, contracts | Tenant-safe change and validation handoff | No inherited CITYWALK privilege or model-quality sign-off |
| [marketing-product-designer](marketing-product-designer/SKILL.md) | German SaaS UX/review | Flow, Green B and Workspace A references | State specification/audit and browser evidence | No unsolicited landing/brand/backend change |
| [marketing-product-manager](marketing-product-manager/SKILL.md) | SME validation/prioritization | Research, current capability, goal | Falsifiable slices, acceptance, experiments | No pilot/billing activation or fixture-based market claims |
| [marketing-ai-quality](marketing-ai-quality/SKILL.md) | German Pack quality/cost evaluation | Engine SHA, facts, scenarios, mode | Claim/quality/cost matrix, human gates, GO/NO-GO | Offline is not live-model proof; no automatic spend |

Example prompts:

- Use $github-project-truth and $citywalk-senior-engineer to triage the current Android native issue. Inspect the Android Auth0 worktree and #387/#424 before proposing a fix; preserve uncommitted work. Report Android and iOS evidence separately. Do not commit or push.
- Use $github-project-truth, $marketing-product-designer and $marketing-senior-engineer for the approved Concept A Workspace task. Inspect existing draft and uncommitted Workspace implementation before editing. Preserve Green Direction B, the existing landing, versioned review/export and independent SaaS boundaries. Implement only verified gaps; stop before commit/push/PR.
- Use $github-project-truth to plan no-loss consolidation under issue #424. Refresh PR heads/checks, distinguish CI-only evidence from product branches, and compare source coverage plus local worktrees. Return a dependency/coverage matrix and owner decisions; do not merge, close PRs or delete branches.
