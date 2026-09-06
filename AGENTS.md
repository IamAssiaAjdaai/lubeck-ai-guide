<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CITYWALK engineering instructions

These instructions apply to the whole repository unless a deeper `AGENTS.md` overrides a narrower subtree.

## Read before substantive work

1. Read `docs/agent/CITYWALK_ARCHITECTURE.md` for current system boundaries and invariants.
2. Read `docs/agent/CITYWALK_WORKFLOW.md` for the implementation, validation, PR, Preview, and handoff process.
3. If the user references a GitHub issue, read the issue before editing code and treat its acceptance criteria as authoritative for scope.
4. Inspect the current branch and diff before making changes. Do not overwrite unrelated work.

## Branch discipline

- `develop` is the integration branch.
- `main` must remain untouched by feature work.
- Start feature work from the latest `develop` unless the user explicitly provides another base.
- Use a dedicated feature/fix/chore branch for each ticket.
- Do not merge directly to `main`.
- Default stop point: implementation report before commit or push. Do not commit, push, open a PR, or merge unless the user explicitly asks for that next step.
- When a PR is requested, target `develop` unless the user explicitly says otherwise.
- Never merge before required CI, Vercel Preview, and manual acceptance are green.

## Scope discipline

- Implement the requested ticket, not adjacent roadmap work.
- Do not silently broaden scope because a future architecture improvement is attractive.
- Preserve existing product behavior unless the ticket explicitly changes it.
- Prefer additive migrations and compatibility layers over destructive rewrites.
- If an adjacent bug is required to make the requested feature safe, fix it narrowly and report it explicitly.

## Architecture invariants

- Public CITYWALK remains guest-first unless a ticket explicitly changes traveler authentication requirements.
- Staff/admin identity and authorization are separate from traveler/customer identity.
- Staff roles/capabilities are enforced server-side. Never trust client-provided roles, actor IDs, scopes, publication state, or entitlement claims.
- PostgreSQL + Drizzle is the source of truth for database-backed operational content.
- Database migrations must be additive and reviewable. No schema resets, `DROP DATABASE`, `TRUNCATE`, or destructive seed/import behavior unless a dedicated migration ticket explicitly requires it.
- Canonical imports/bootstrap commands are explicit operational commands. Never add content imports to Vercel build automatically.
- CMS publication does not confer RAG/source trust.
- Verified RAG knowledge, source attribution, and media/audio approval are independent trust boundaries.
- Audio is exact-locale. Never make English audio masquerade as Arabic, French, or another locale.
- Curated editorial tours and personalized AI-generated tours are separate concepts.
- Public DTOs must exclude staff metadata, actor IDs, secrets, internal authorization state, and draft/archived content unless a privileged admin endpoint explicitly needs them.
- Secrets stay server-only. Never introduce `NEXT_PUBLIC_` credentials or commit `.env*` secret files.

## Data and integrity

- Validate untrusted input on the server.
- Use transactions for multi-table mutations and relationship changes.
- Preserve referential and publication graph integrity before writes become visible publicly.
- Prefer immutable identifiers/object keys for externally stored assets.
- Public read layers should remain defense-in-depth even when write paths already validate integrity.
- Do not let Preview tooling or imports touch production databases or production object storage.

## Testing and quality gates

Run the smallest relevant checks while iterating, then run the complete ticket-appropriate gate before handoff.

Baseline full gate for substantial code changes:

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

Also run dedicated integration commands required by the affected subsystem, for example PostgreSQL/CMS/media integration tests. Normal CI must not require production secrets.

If `db:generate` creates an unexpected migration after an intended migration already exists, stop and inspect schema drift instead of committing both blindly.

## Vercel and Preview

- Vercel build may apply committed migrations, but must not automatically seed/import editorial content.
- Environment changes require a fresh deployment that actually receives the intended environment values.
- Preview databases, object-storage buckets/prefixes, and credentials must be isolated from production.
- For protected Vercel Previews, distinguish platform authentication redirects from application/API responses during testing.
- User-facing and infrastructure tickets require manual Preview acceptance before merge when the ticket defines it.

## Handoff behavior

When implementation is requested with no explicit commit permission:

1. Implement the ticket.
2. Run targeted tests and the full required gate.
3. Inspect the final diff for unrelated changes and secrets.
4. Return a structured implementation report using `docs/agent/CITYWALK_WORKFLOW.md`.
5. Stop before commit/push.

When the user later says `pushed` or explicitly authorizes commit/push, continue from the existing work instead of repeating earlier diagnostics.

## Communication

- Surface concrete blockers or security/integrity findings as soon as they are known.
- Report actual command/test results, not assumed results.
- If a required external dependency is unavailable, complete all work that does not depend on it and describe the exact remaining acceptance step.
- Keep recommendations production-oriented; CITYWALK is not treated as a throwaway MVP.
