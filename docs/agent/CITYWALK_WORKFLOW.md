# CITYWALK Engineering Workflow

Use this workflow for CITYWALK feature, bug, refactor, CMS, database, auth, RAG, audio, media, map, and deployment tickets unless a GitHub issue explicitly overrides it.

## 1. Intake

Before editing:

1. Read the referenced GitHub issue and acceptance criteria.
2. Read root `AGENTS.md`.
3. Read `CITYWALK_ARCHITECTURE.md`.
4. Inspect the current branch and working tree.
5. Confirm the intended base branch, normally `develop`.
6. Identify ticket dependencies and trust boundaries that must remain unchanged.

Do not ask the user to repeat information already available in the issue/repository.

## 2. Branch

For new implementation work:

```bash
git checkout develop
git pull origin develop
git checkout -b <feature-branch>
```

Use a branch name that reflects the ticket.

Never implement feature work directly on `main`.

If unrelated local work exists, preserve it. Do not reset/stash/drop work unless the user explicitly authorizes that action or it is clearly your own temporary work.

## 3. Plan around invariants

Before broad edits, identify:

- database tables/migrations affected
- server/client boundary
- RBAC/city-scope rules
- publication/trust implications
- locale/RTL implications
- public DTO/API effects
- migration/fallback strategy
- Preview-only external dependencies

For high-risk data mutations, define rollback/failure behavior before writing the mutation.

## 4. Implement narrowly

Follow the issue scope.

Prefer:

- server-side validation for untrusted input
- explicit domain/service/repository boundaries
- transactions for multi-table state
- additive migrations
- immutable identifiers where appropriate
- deterministic fallbacks
- tests that encode trust/integrity behavior

Avoid:

- client-controlled roles/actor IDs/scopes
- silent public fallback that mislabels locale/trust
- destructive schema resets
- mixing future roadmap work into the ticket
- production credentials in local/Preview testing

## 5. Test while iterating

Run focused tests first.

Examples:

```bash
npm run test:run -- <relevant test>
```

or subsystem-specific commands.

When a bug is discovered during review, add a regression test that fails before the fix when practical.

## 6. Full quality gate

For substantial code changes, run:

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

Also run the dedicated integration suite for the subsystem, such as CMS/media/PostgreSQL integration tests.

Interpret results carefully:

- skipped tests are not equivalent to passing integration tests
- `db:generate` should not produce unexplained schema drift
- local DB success does not prove Preview DB success
- Vercel build success does not replace manual acceptance where required

## 7. Security/diff review

Before handoff:

```bash
git status --short
git diff --check
git diff --stat
```

Inspect for:

- `.env*` files containing secrets
- credentials/tokens
- accidental `package-lock.json`/dependency churn
- unrelated generated files
- destructive SQL
- changes to RAG/audio/source trust that were not requested
- client-side privilege assumptions

## 8. Default handoff: stop before commit

Unless the user explicitly authorized commit/push, return the implementation report and stop.

Do not automatically commit just because tests are green.

### Standard implementation report

Use the issue's own requested report fields when provided. Otherwise include:

1. branch
2. files created/modified
3. architecture/schema/API changes
4. validation and trust-boundary behavior
5. RBAC/city-scope behavior
6. migration/import behavior
7. targeted tests
8. integration tests
9. full test count
10. lint
11. TypeScript
12. build
13. `db:generate`
14. `db:migrate`
15. `db:verify`
16. diff check
17. security review
18. public/guest-first regression status
19. blockers / Preview-only acceptance remaining
20. confirmation: no commit/push performed

Report actual outputs. Never claim a check passed if it was not run.

## 9. After explicit commit/push approval

When the user authorizes it:

```bash
git add <intended files>
git diff --cached --check
git diff --cached --stat
git commit -m "<ticket-appropriate message>"
git push -u origin <branch>
```

Verify only intended files are staged.

Do not merge yet.

## 10. PR

When requested, open a Draft PR targeting `develop`.

PR body should contain:

- issue reference
- summary
- included scope
- trust boundaries preserved
- local validation
- Preview acceptance still required
- explicit note that `main` remains untouched

## 11. CI and Vercel

After push/PR:

- verify the PR head SHA
- verify GitHub CI on that SHA
- verify Vercel deployment is for the same SHA/branch
- inspect build logs when migrations/environment configuration matters
- inspect runtime logs for route/auth/runtime failures

Do not infer application success from a platform redirect or protected Preview login page.

## 12. Preview operational steps

For Preview DB/storage operations:

1. explicitly identify the target host/bucket/prefix
2. verify it is not production
3. load only the minimum required environment values
4. run the operation
5. verify results independently
6. remove temporary local secret files

Never commit pulled Vercel environment files.

## 13. Manual acceptance

Run the ticket's acceptance flow on Preview.

For localized user-facing work, include at least the locales defined by the ticket; DE/EN/AR are common visual/regression checks.

For protected Vercel Previews, use a browser-authenticated request or proper Preview access method. A PowerShell/HTTP client that receives SSO HTML is not proof of the application API response.

## 14. Merge gate

Only merge when all required conditions are true:

- implementation review green
- CI green on latest head
- Vercel Preview green on latest head
- migration/external-service acceptance green where applicable
- user/manual acceptance green

Then:

1. mark Draft PR ready
2. merge to `develop` using expected head SHA protection when available
3. close the issue as completed
4. never merge to `main` as part of the normal feature workflow

## 15. Blockers

If an external dependency blocks final acceptance:

- complete everything else
- state exactly what is blocked
- state the smallest next action needed
- do not invent success
- do not broaden the ticket to work around the dependency with unsafe shortcuts

Examples:

- object-storage credentials unavailable
- Preview environment variable not propagated
- third-party billing/API approval required
- store/review account not available

## 16. Short prompt contract

Once these repository instructions are installed, a prompt like:

> Implement GitHub issue #72 using the CITYWALK engineering workflow. Do not commit or push. Return the standard implementation report.

should be enough for the agent to discover the issue, follow repository rules, implement, validate, and stop at the correct handoff point.
