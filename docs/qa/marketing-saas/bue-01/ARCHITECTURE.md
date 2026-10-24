# Architecture

## Existing contracts reused

`ProjectStore.authorize` enforces organization membership and writer permission. The existing verified Better Auth session supplies the principal. `mkt_projects.revision`, `mkt_brand_versions.context/evidence`, `brandContextSchema`, and document provenance are reused. **Zero SQL/schema migrations.** The table's existing `revise` audit action is retained; document origin is explicit in provenance and per-fact evidence. `confirmBrandFacts` remains unchanged.

`POST /api/projects/:id/documents/preview` accepts raw `application/pdf`, `X-Context-Revision`, and a percent-encoded filename in `X-Document-Label`. Origin, verified session, write authorization and expected revision are checked before parsing. The HTTP adapter bounds binary buffering at 2 MiB. Parsing returns at most 24 candidates from at most 20 pages / 50,000 extracted characters. Page-aware source text is conservatively whitespace-normalized; no marketing copy or inferred assertions are created.

The parser is PDF.js 6.4.299 in a child Node process, using byte input and text extraction only. There is no viewer, scripting manager, OCR, rendering or URL-loading workflow. The worker has a sanitized environment, restricted read permissions, no writes/child processes/worker-thread permission, network-denial preload, 96 MiB V8 old-space setting and an 8-second parent watchdog. The V8 limit is not a hard total-RSS or OS container boundary.

Preview records exist only in server memory, bound to actor + project + captured revision, with opaque tokens and a 15-minute expiry timer. Restart safely invalidates previews. Each API process permits two active parsers globally, one per actor, five-second actor admission spacing, 32 staged previews and 128 recent actor admission records. These are local-process limits, not distributed production rate limiting.

`POST /api/projects/:id/documents/accept` accepts only token, selected candidate IDs, captured revision and explicit acknowledgement. Candidate statements, page metadata and approvals cannot be supplied by the browser. The server selects its staged records and performs an authorized transaction with the existing project row lock. It preserves the old context, confirmations and evidence; appends only selected nonduplicate facts with `confirmation:null`; appends only required document-page provenance; checks existing schema limits; then creates the next immutable revision. The preview is consumed only after commit. A network interruption may leave a successful saved revision; reloading the project shows that canonical state rather than retrying an overwrite.

The source ID includes the full original-byte digest and page; fact IDs hash digest/page/normalized statement. Evidence retains document label, digest, source page, snippet, extraction time and `importStatus:saved_unconfirmed`. That field records import status, **not current approval**; current review state comes only from the fact's confirmation. Declined candidates are never saved. Exact duplicates do not acquire a second approval or silently change existing provenance.

## Knowledge states / future host adapters

| State / claim type | BUE-01 meaning | Future evidence requirement |
|---|---|---|
| Extracted candidate | Untrusted document text, ephemeral | Human comparison with source |
| Saved unconfirmed | Selected into a version, not usable as an approved fact | Existing explicit confirmation |
| Human-confirmed | Owner accepted this exact statement and sources | Does not prove objective truth or CITYWALK RAG trust |
| Shipped / verified capability | **Not inferred by this parser** | Exact implementation revision plus executable verification |
| Planned capability | Preserve words such as “geplant” verbatim; caution shown | Explicit classification and delivery state |
| Uncertain / outdated | Owner must compare current context and document | Recency/conflict review; no automatic resolution |
| Owner positioning | Remains a sourced assertion | Distinguish positioning from independently verified capability |
| Price / offer | Verbatim document statement, caution shown | Currency, VAT, validity date, scope and owner approval |

A document saying two contradictory things may produce two unconfirmed candidates. No lexical heuristic guarantees semantic conflict detection or factual correctness. The UI explicitly requires comparison with existing facts. No semantic engine is claimed completed.
