---
name: citywalk-engineering
description: Implement, review, validate, or prepare pull requests for CITYWALK engineering work using the repository's architecture, branch discipline, trust boundaries, quality gates, Preview acceptance, and report-before-commit workflow. Use for CITYWALK feature, bug, refactor, CMS, database, auth, RAG, audio, media, map, analytics, or deployment tasks.
---

# CITYWALK Engineering Skill

Use this skill only inside the CITYWALK repository or when the user explicitly asks to apply the CITYWALK engineering workflow.

## First actions

1. Locate the CITYWALK repository root.
2. Read the root `AGENTS.md`.
3. Read `docs/agent/CITYWALK_ARCHITECTURE.md`.
4. Read `docs/agent/CITYWALK_WORKFLOW.md`.
5. If a GitHub issue is referenced, read it and treat its acceptance criteria as the task contract.
6. Inspect the current branch and working tree before editing.

Repository instructions are authoritative. This skill is a convenience layer, not a replacement for `AGENTS.md`.

## Default execution contract

Unless the user explicitly says otherwise:

- work from latest `develop`
- create/use a dedicated feature branch
- keep `main` untouched
- implement the requested issue only
- preserve CITYWALK trust boundaries
- run targeted tests while iterating
- run the full required quality gate before handoff
- inspect the diff for secrets/unrelated changes
- return the standard implementation report
- stop before commit/push

Do not open a PR or merge until the user explicitly authorizes the next step.

## Critical invariants

Never violate these silently:

- CMS publication is not RAG/source verification.
- Audio approval is separate from CMS publication and uses exact-locale semantics.
- Staff authorization is server-side and separate from traveler identity.
- Public CITYWALK remains guest-first unless the ticket explicitly changes that.
- PostgreSQL/Drizzle migrations are additive and reviewable.
- Canonical imports are explicit operations, not Vercel build steps.
- Preview databases/object storage must be isolated from production.
- Client data cannot grant roles, actor IDs, city scope, publication authority, or trusted-source status.

## Quality gate

Use the repository workflow to determine the exact gate. For substantial code changes, the normal baseline is:

```bash
npm run test:run
npm run lint
npx tsc --noEmit
npm run build
npm run db:generate
npm run db:migrate
npm run db:verify
git diff --check
```

Add subsystem-specific integration tests where required.

## Handoff

Return the issue-specific report if the issue defines one. Otherwise use the standard report in `docs/agent/CITYWALK_WORKFLOW.md`.

Always state:

- what was changed
- what was tested
- what remains for Preview/manual acceptance
- whether any blocker exists
- whether commit/push happened

Do not claim success for unrun checks or intercepted Vercel SSO responses.

## Useful short prompts

Implementation:

> Use the CITYWALK engineering workflow. Implement GitHub issue #72. Do not commit or push. Return the standard implementation report.

Review:

> Use the CITYWALK engineering workflow to review the current branch against its GitHub issue. Find correctness, security, data-integrity, trust-boundary, and Preview risks. Do not modify code unless I ask.

Fix review findings:

> Fix the confirmed review findings on the current CITYWALK branch, add regression tests, run the required gate, and stop before commit/push.

PR preparation:

> Verify the current CITYWALK branch is clean and validated, then prepare a Draft PR to `develop`. Do not merge.
