# Marketing Core

`@marketing/core` is a private TypeScript workspace package for Project / Brand
Context. It runs without Next.js, React, a database, identity provider, network,
provider SDK or host-specific locale catalog. Its only runtime dependency is Zod.
The root application imports the public package entry point, as it does for the
existing workspace packages. Zod is declared directly here, rather than relying
on its incidental presence through authentication dependencies.

## Sprint 01 contract

A raw brief contains a required narrative (`rawText`) and named business identity.
The caller can supply offerings, target audiences, marketing goals/CTA, tone,
forbidden claims, markets, languages, factual proposals, provenance, hypotheses
and explicit missing information. Optional sections default to empty values;
deterministic questions describe missing sections without inventing answers.
This sprint validates human-entered structured fields alongside the narrative.
It does **not** extract fields from natural language or fetch URLs/documents/repos.

```ts
import {
  createBrandContext,
  confirmBrandFacts,
  getApprovedBrandFacts,
} from "@marketing/core";

const draft = createBrandContext({
  rawText: "We supply replacement parts made to customer drawings.",
  identity: { name: "Example Manufacturing" },
  facts: [{ id: "custom-parts", statement: "Parts are made to customer drawings." }],
}, {
  projectId: "project-001",
  contextId: "context-001",
  briefSourceId: "brief-001",
  createdAt: "2026-10-13T10:00:00Z",
});

// After the host loads the stored context, authenticates the human reviewer,
// and authorizes that reviewer for this project:
const reviewed = confirmBrandFacts(draft, {
  expectedRevision: 1,
  factIds: ["custom-parts"],
}, {
  actorId: "reviewer-001", // host-derived, never taken from the command
  confirmedAt: "2026-10-13T11:00:00Z", // host clock
});
const approvedFacts = getApprovedBrandFacts(reviewed);
```

The generic `BrandBriefAdapter<TInput>` normalizes source-specific input into
`RawBusinessBrief`; `createBrandContextFromAdapter` validates the result again.
It is a normalization port, not permission to access a source. New source adapters
must independently handle access, privacy and trust in their host environment.

## Trust semantics

| Data | Meaning | Automatically approved? |
| --- | --- | --- |
| Identity, offerings, target audiences, goals, tone, markets | Declared business context/intent | No factual certification |
| `facts[].basis = user_supplied` | Human-entered proposal; defaults to raw brief provenance | No |
| `facts[].basis = source_backed` | Proposal referencing a website, document or repository | No; a reference does not prove a claim |
| Fact with `confirmation` | Explicit human confirmation with exact statement and provenance bound to review | Included in approved-facts view |
| `hypotheses[]` | Assumption for future investigation | Never promoted by fact confirmation |
| `missingInformation[]` | Unknown or unanswered question | Never fabricated into a fact |

`rawBusinessBriefSchema` rejects confirmation, reviewer and approval fields.
Confirmation commands select existing fact IDs and an expected revision. Unknown
IDs, hypotheses, duplicates, stale revisions and earlier review timestamps fail.
Each selected fact records the host-derived reviewer, timestamp, exact statement,
basis and source metadata. Editing that evidence makes the stored context invalid
until the confirmation is cleared and a human reviews it again. Functions return
new parsed data and leave input objects unchanged.

`brandContextSchema` validates the shape of **trusted stored** data. It cannot
authenticate a human, detect forged stored records, or prove external facts.
Never accept an entire confirmed context or reviewer metadata from a browser as
trusted persistence. `getApprovedBrandFacts` is a private domain view; it contains
reviewer identity and is neither a public DTO nor a source-verification certificate.
Human confirmation does not certify independent RAG evidence or authorize media,
content publication, social posting or account access.

The host owns unique IDs, its clock, project authorization, persistence, revision
compare-and-swap, transaction/audit behavior, retention and new context creation.
The core has no global store, clock, user roles, tenants or automatic state writes.
Revision checking here cannot replace atomic concurrency checks in a future store.

## Validation and privacy limits

- Strict Zod objects reject unknown keys; named IDs, bounded strings/arrays,
  unique identifiers and local provenance links are validated.
- Raw narrative is capped at 20,000 characters; facts/hypotheses at 100 each,
  with 2,000 characters per statement. Each fact can cite up to ten sources.
- Raw briefs allow up to 99 provenance records and 40 explicit missing items;
  canonical contexts reserve capacity for the narrative source and derived gaps.
- Languages accept conservative BCP-47-style syntax without a host-specific
  language allowlist. Country codes validate two uppercase letters, not an ISO
  registry. There is no claim that a language or market is supported by a provider.
- Obvious tokens, credential assignments, Bearer tokens, private keys and URL
  credentials are redacted in free text. Credential-bearing source URLs are
  rejected. This is best-effort filtering, not exhaustive DLP or a PII anonymizer.
  Do not log raw input or full validation errors. All context stays private by default.
- Version 1 serializes to JSON. No locale translation, currency/pricing logic,
  competitor research, strategy, AI generation or external ingestion is provided.

## Verification

```bash
npm run test:run -- packages/marketing-core src/lib/admin/marketing/brandContextAdapter.test.ts
npm run typecheck --workspace @marketing/core
```

Unit tests use synthetic travel-product and unrelated German manufacturing briefs.
Import-boundary tests constrain production modules to local modules and Zod and
prove existing CMS runtime flows do not import the new adapter. The standalone
TypeScript config uses ES2022 only, with no Node, browser or application typings.
