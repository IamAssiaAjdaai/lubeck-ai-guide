# Marketing generation database foundation — #319 Phase 1

This phase adds persistence only. No request endpoint, worker, AI provider,
CMS screen, publishing hook, credential or production operation is included.
Existing Marketing campaigns/pages/content and media remain authoritative.

Surface classification: Mobile Core not applicable; iOS and Android implementation
and device acceptance not applicable; Public Web not applicable; Admin Web requires
this shared database foundation, with its AI Studio UI deferred to Phase 2.

## Data and trust boundaries

- `marketing_source_snapshots`: campaign/city/locale, creator, creation time,
  bounded allowed facts, selected places, verified references, approved selected
  media and brand rules. EN/DE/FR only for this V1 foundation.
- `marketing_generation_jobs`: same campaign/city/language as its snapshot,
  request kind and requested output kinds, queued by default, worker/lease fields,
  nonnegative attempts, timestamps and requester. Claimed/processing rows require
  worker identity, a lease and at least one attempt. This is data integrity, not
  a worker claim protocol or a complete transition state machine.
- `marketing_generation_outputs`: same campaign/city/language as its job, requested
  kind, text/structured/media payload, positive version, timestamps, optional
  existing CMS associations. Insertion must be draft. Approval of an output does
  not approve media or publish a CMS page/content row.

Snapshot JSON contracts:

| Column | Shape | Bound |
| --- | --- | --- |
| `facts_json` | `[{id: verifiedChunkUuid, placeId, sourceId, statement}]` | 1–100; 256 KiB |
| `places_json` | `[placeId]` | 1–50; 4 KiB |
| `references_json` | `[{sourceId, title, canonicalUrl}]` | 1–100; 128 KiB |
| `media_json` | `[{assetId, assetKey: uuid}]` | 0–50; 16 KiB |
| `brand_rules_json` | JSON object | 16 KiB |

SQL checks and insertion triggers enforce bounds and evidence integrity. Facts
must exactly copy active verified knowledge in the selected locale, from published
places in the selected city, with a currently verified, unexpired source linked to
that place. Selected places and references must participate in the selected facts.
References must copy source titles and canonical URLs. Selected media must be
approved, unarchived, in the same city, and match its immutable asset key. Facts,
references and media reject extra fields. Row locks serialize these checks against
concurrent changes to the checked source/media records.

Snapshots retain historical input when live facts or approval change. They are
not permanent permission to reuse media. Future execution must recheck current
rights/approval. Brand rules are bounded context, not verified factual evidence.

Errors use nullable allowlisted `error_code`, rather than free-form provider
messages: `invalid_source`, `generation_failed`, `lease_expired`, `upload_failed`,
`internal_error`. Future code must map failures to these codes and keep secrets,
prompts and stack traces out of job rows.

## Immutability and ownership

Database triggers reject snapshot UPDATE, DELETE and TRUNCATE, including no-op
updates. These are normal database-operation guarantees; database owners can
change DDL/disable triggers. There is no claim of tamper resistance against owners.
Integration cleanup rolls transactions back without disabling triggers.

Composite foreign keys enforce campaign/city, snapshot/job/language, output/job,
CMS association/campaign/city and media/city boundaries on both inserts and parent
updates. Optional CMS links must already belong to the same campaign; unassigned
CMS rows cannot be linked until assigned. Foreign keys restrict deletion to retain
traceability. Campaign/city deletion and requester account erasure can therefore
be blocked once snapshots/jobs exist. Any future retention/erasure policy requires
an explicit reviewed migration; this phase adds no deletion bypass.

No server authorization surface is added. Future APIs must derive staff identity
and city capabilities server-side; the user FK alone does not prove staff access.
Approval updates require future human-review authorization. No generated content
is exposed through public DTOs or public repositories in this phase.

## Migration and verification

`0024_marketing_generation_foundation.sql` creates three tables, three enums,
checks, indexes, foreign keys and validation/immutability triggers. It adds four
unique composite target indexes on existing campaign/page/content/media tables.
They include existing primary keys, so they cannot introduce duplicate-data errors.
Index creation can briefly lock these existing tables; plan migration timing as
their volume grows. No imports, backfills, publication changes or destructive DDL.

The previous Drizzle snapshot was 0019; migrations 0020–0023 were handwritten.
The 0024 snapshot reconciles their already committed schema with this addition.
Their DDL is deliberately excluded from 0024 SQL. Run `npm run db:generate` to
confirm no remaining drift. Triggers are maintained in committed SQL because
Drizzle does not generate them.

Run baseline schema tests and the standard full gate. Against an isolated local
database, apply migrations and seed the canonical fixture, then run
`npm run cms:test:integration` (includes generation boundary tests). Tests reject
non-local databases and roll back all generation fixtures. CI also runs the real
0023→0024 migration test in an empty disposable database:

```bash
MARKETING_MIGRATION_INTEGRATION=1 npm run test:run -- src/db/marketingGenerationMigration.integration.test.ts
```

That separate migration test requires DATABASE_URL to point to an **empty local
database**. It applies the committed prior SQL, inserts existing marketing data,
applies 0024, verifies data preservation, and rolls the complete transaction back.
Ordinary unit tests skip PostgreSQL acceptance unless explicitly enabled. Local
acceptance does not prove Preview acceptance; review Preview migration and CI on
the pushed PR SHA before any future merge. No deployment is part of Phase 1.
