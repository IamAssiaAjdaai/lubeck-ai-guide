# Sprint 02 — Brand Context persistence and review audit

CITYWALK remains internal Customer #001. This adds opt-in persistence inside its
repository; extract the application/repository/database before external paying
customers. There is no UI, public endpoint, external tenancy, provider call,
strategy/generation execution, publishing integration or production operation.
Mobile/iOS/Android and Public Web: not applicable. Admin Web: server foundation
only; no presentation change. Existing Marketing CMS/QA/publication is unchanged.

## Boundaries and contracts

`@marketing/core` remains unchanged, pure TypeScript plus Zod. It owns schema v1,
raw brief validation and evidence-bound human confirmation. Generic project and
context identifiers contain no city/campaign identifiers. Human-confirmed claims
are declared business knowledge, not independently verified place/source evidence.
Nothing in this module creates generation jobs or fills migration 0024 snapshots.

`src/db/brandContextSchema.ts` owns four generic tables: projects, current context
revision pointers, versioned JSON revisions, and one audit event per revision.
`src/db/citywalkBrandContextSchema.ts` owns two adapter tables: project-to-campaign/
city ownership and opaque reviewer-to-user mapping. Generic tables have no host
identity/scope FK. Each project has one current context in this sprint. Multiple
internal projects may bind to the same campaign; generic project IDs, not campaign
IDs, distinguish their data. Other hosts can reuse the core without CITYWALK.

The server-only service under `src/lib/marketing/brandContext` supports create,
read, history, confirmation, full-brief correction and explicit project purge.
It is deliberately outside the existing CMS runtime modules. No `use server`
export, route or browser entry point is added. Its DI factory is for trusted host
code/tests only, never browser-supplied authentication functions or metadata.
Production wrappers use the existing session/staff capability loader.

Create accepts only `{campaignId, brief}`. Read/history accept only generic
project/context IDs. Confirmation accepts IDs plus `{expectedRevision, factIds}`.
Correction accepts IDs, expected revision and a new raw brief. Purge accepts IDs,
expected revision and literal `eraseHistory: true`. Strict Zod request schemas
reject reviewer/time/approval/ownership/evidence fields, including nested extras.
The campaign is loaded server-side; city scope never comes from submitted fields.

## Authorization, concurrency and integrity

Creation/correction require city-scoped `marketing:manage`; read/history require
`marketing:view`; confirmation requires `publishing:review`. Purge additionally
requires actual admin/super-admin membership, not content-editor rights. The
service reloads and locks the authenticated user's active membership and scope
within the same database transaction. It ignores asserted caller roles and scope.
Account and membership locks serialize writes against revocation/identity deletion.
A three-second local lock timeout bounds contention. Project binding row locks
serialize reads/mutations/purge for an internal project, preventing partial reads
or purge/write deadlocks; this is not a high-throughput external tenant design.

A conditional SQL UPDATE advances the current pointer only when expectedRevision
matches. The core transition then confirms the stored facts, using database clock
time and the host-resolved opaque actor. Revision JSON and audit INSERT commit in
that same transaction. Concurrent requests with the same revision yield one winner
and one stale conflict; audit failures roll the pointer and confirmation back.

Read paths revalidate JSON with the core, check schema/revision/project/context
identity and compare a SHA-256 digest of canonical JSON. They reject unsupported
versions, mismatched confirmation evidence, unexpected normalization and corrupt
storage. Arrays retain order; JSON object key order is immaterial. These checks
are defense in depth, not a signature or proof against a database owner who can
change data/DDL and recalculate hashes. Full Zod validation belongs to the service;
SQL enforces bounded envelopes/version/ownership, not the whole domain schema.

Handwritten SQL enforces contiguous revisions, fixed context/project ownership,
a current-revision FK and a deferred required-audit constraint. A revision cannot
commit without its audit event or leave a dangling current pointer. Revision and
audit UPDATE/direct DELETE/TRUNCATE are rejected while their owners remain.
History includes exact statement, basis, selected provenance snapshot, opaque
reviewer and confirmation time. It preserves old evidence when a correction resets
all current approvals. Correction creates a new raw-brief provenance identifier;
old confirmed evidence stays in earlier revisions. There is no in-place editing,
publication certificate or implicit source trust.

## Explicit retention, correction and erasure policy

This internal review workspace retains history only until its authorized owner
purges the project or erases its host campaign/city. It has no indefinite legal
hold and no automatic timed retention job. Administrators must purge closed
projects or requests requiring removal of personal/source data. External customer
use is blocked on a separately approved retention schedule and backup policy.

- **Correction:** write a new revision using expectedRevision. All confirmations
  reset. This preserves the old history, so it is not erasure of personal data.
- **Identity erasure:** reviewer mapping uses user FK `ON DELETE SET NULL`.
  Generic JSON/audit records use only opaque actor UUIDs, never user IDs, emails or
  names added by the service. A SQL guard permits unlinking but refuses actor/user
  identity reassignment. Once existing staff/editorial erasure eligibility is
  satisfied, the existing account-deletion transaction succeeds and unlinks the
  mapping; this sprint adds no requester/creator user restriction. Existing staff
  and migration 0024 retention policies are not bypassed. Reviewer attribution
  remains to the erased opaque actor, not to a recoverable account identity.
- **Full erasure:** explicit admin project purge deletes its contexts, revisions,
  audit and host binding atomically. Expected revision and city authorization
  prevent accidental/stale/cross-scope erasure. Cascades apply only to this new
  private project graph; migration 0024 triggers/FKs are untouched. No trigger is
  disabled for normal cleanup. Direct history-row deletion is not a supported path.
- **Host lifecycle:** project scope cannot be reassigned. Deleting its campaign
  (including cascade from its city) deletes the binding and its entire generic
  project through a tested trigger. If another existing constraint blocks campaign
  deletion, the whole transaction rolls back; this policy does not evade 0024.
  Project deletion itself cascades the binding safely without recursive retention.
- **Limits:** unlinking is pseudonymization, not a promise of complete anonymization.
  Human-entered brief text/source URLs may still contain personal data despite
  credential filtering. Use full project purge for those erasure cases. This erases
  the associated audit too; there is intentionally no retained identifying purge
  tombstone. Operational purge receipts/access logs and expiry of backups require
  a future reviewed host policy; backups can retain erased data until expiry.

Database principals with direct DELETE permission on projects/bindings can perform
this policy without the service. Application authorization is not PostgreSQL RLS.
Normal production permissions must remain private server-only. No public SQL role
or external tenant access is introduced. DDL owners can alter triggers; no claim of
owner-proof audit immutability is made. Live identity links contain no duplicated
email/name and are host-owned; remove them from future generic exports.

## Migration and acceptance

Latest inspected develop includes merged #359/#360/#361. Existing journal ends at
0024, so this sprint adds **0025_brand_context_persistence.sql** and its snapshot.
It adds six tables, an event enum, constraints/indexes and explicit policy triggers.
The composite target index precedes its FK (generated Drizzle order was corrected).
The snapshot registers the one-context-per-project unique index. Trigger/deferred
DDL and the supplemental JSON-type check remain handwritten SQL; repeated db:generate must produce no schema drift.
No existing data is backfilled, seeded during build, published or converted.

Upgrade acceptance applies committed 0000–0024 SQL in a disposable empty local
PostgreSQL transaction, creates existing campaign/published-page fixtures, applies
0025, compares records and generation function definitions, then rolls back only
0025 and reapplies it before rolling the full test transaction back. This proves
transactional rollback before commit, not a supported downgrade after live data.
Full migrations and PostgreSQL service tests run separately in a disposable local
database; all fixture cleanup follows the supported purge policy.

Commands (explicit local DATABASE_URL required):

```sh
BRAND_CONTEXT_MIGRATION_INTEGRATION=1 npm run test:run -- src/db/brandContextMigration.integration.test.ts
npm run db:migrate
npm run brand-context:test:integration
npm run db:generate
```

CI preserves standalone core typecheck and generation migration/integration gates;
it adds separate Brand upgrade and persistence acceptance. Tests cover CITYWALK and
fictional Nordlicht Metallbau briefs in two independently authorized internal city
scopes, concurrent confirmations, injected audit failure, forged metadata, stale
writes, revocation, cross-scope CRUD/history, direct history tampering, corrections,
project/campaign purge and the actual existing account erasure service.

## Future export/import into the independent SaaS database

No export/import command or production cutover is added here. A future authorized
export selects one project under the same host scope transaction, validates every
revision/audit pair with the core and digest, and emits a versioned manifest of
project/context IDs, current pointer, complete revision sequence, evidence and
opaque reviewer/event lineage. Include counts/checksums and erased-identity status;
exclude CITYWALK bindings and raw user identities. Never export traveler, commerce,
verified place knowledge or generation rows as Brand Context records.

The new app gets independent authentication/project memberships. Map opaque actor
IDs through explicit consented identity mapping; keep erased actors unlinked.
Its own additive migrations create generic tables and supported retention policy,
not CITYWALK's complete migration chain. Validate schema versions, JSON/digests,
contiguous revision/audit pairs and current pointer before any transactional import;
map all IDs consistently if collisions require remapping (including confirmation
actors/provenance), regenerate digests, and reject partial/unsupported imports.
Host bindings stay in CITYWALK. Require isolated rehearsal, count/checksum comparison,
backup/restore and a deliberate cutover/write reconciliation plan. Extraction must
finish before external paying-customer access. No dual writes or auto-generation.
