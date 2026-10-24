# BUE-01 — Secure PDF Business Understanding

Baseline: `b908151e76169db120b156d9374368ad7d4f2569` (latest origin/develop fetched for this task). Design PR #435 is merged via `36f6b287fa0ca5b8cb08a69c772249f78704f5f1` and is an ancestor. Isolated branch: `feat/marketing-business-understanding-01`; worktree: `/private/tmp/mkt-bue-01`.

## Implemented

Authenticated project writers can upload a text PDF in **Marke & Wissen → Unternehmen & Fakten → PDF als Wissensquelle**. Processing produces explicitly untrusted, deterministic candidates with original-document SHA-256, page, label, supporting text, extraction time and stable fact IDs. Nothing is saved during preview. The owner selects candidates and acknowledges their review; these are appended as **unconfirmed** facts. The existing explicit fact-confirmation workflow is the only approval path. Existing confirmed facts, source evidence and immutable revisions survive document import. Concurrent/stale acceptance cannot overwrite a revision.

No new database, migration, AI request, OCR, repository ingestion or paid provider was introduced. Overview, D2, Concept A layout, authentication, quotas and publishing boundaries remain unchanged. Existing manual and website intake regression tests/journeys pass. Manual correction and website replacement retain their existing semantics; document import is additive, not an automatic overwrite or semantic conflict resolver.

## Owner preview

Loopback-only: http://127.0.0.1:3458/workspace (API 3459). Existing port 3208 preview is untouched. Synthetic account details are **outside Git** at `/private/tmp/mkt-bue-private/LOGIN.txt`; do not copy them into reports. Synthetic PDF: [Fiktive Leistungen](fixtures/Fiktive-Leistungen.pdf) (also available at `/private/tmp/mkt-bue-private/Fiktive-Leistungen.pdf`).

1. Open `/auth` and use the private synthetic login.
2. Open **Marke & Wissen**, then **Unternehmen & Fakten**.
3. Choose the fictional sample PDF and press **PDF prüfen**.
4. Compare each statement with its page/source. Leave incorrect or irrelevant items unchecked. Planning and price statements need particular care.
5. Acknowledge the selected statements and press **Auswahl ungeprüft speichern**.
6. Under **Fakten prüfen und bestätigen**, inspect the new sources, select the correct unconfirmed facts, acknowledge and use **Ausgewählte Fakten bestätigen**.
7. Existing confirmed facts remain visible. Saving a new context revision correctly makes older Pack approvals context-stale.

Start after shutdown: `node /private/tmp/mkt-bue-start.mjs` (from this worktree; private preview environment must still exist). The initial launch uses a retained terminal session. To stop, use Ctrl-C in that runner, or identify the listener PID with `lsof -nP -iTCP:3458 -iTCP:3459 -sTCP:LISTEN`, verify its cwd is this worktree, and send TERM only to those preview processes. No Docker/database shutdown or destructive cleanup is needed. The helper and credentials are local conveniences, not distributable artifacts.

## Evidence and decision

- [Architecture / compatibility](ARCHITECTURE.md)
- [Security and limitations](SECURITY.md)
- [Exact test evidence](TEST-RESULTS.md), [canonical summary](CANONICAL-CI.json), [final unit/database counts](VERIFICATION.json)
- [Browser results](BROWSER-RESULTS.json), [screenshots](SCREENSHOTS.md), [preservation](PRESERVATION.json), [changed files](FILES.txt)

**GO for local owner acceptance and code review. Production release NO-GO.** No push, PR, merge or deployment is authorized. Manual screen-reader/device acceptance, operational parser sandboxing/abuse limits, retention policy and existing repository dependency advisories remain separate release gates.

## BUE-02 proposal — not implemented

Read-only GitHub ingestion should reuse the same candidate → selected unconfirmed facts → existing confirmation transition, with repository/commit/path/line identity and immutable content hashes. Begin with explicitly allowlisted public repositories or separately authorized minimal read scopes; no workflow execution, cloning hooks, writes, secret retrieval or model calls. Treat repository prose and instructions as untrusted. Define shipped/planned/uncertain/positioning/price evidence classification and conflict resolution before any strategy engine consumes it. No CITYWALK production adapter or data access is part of BUE-01.
