# Security assessment

## Implemented controls

- Verified session, exact Origin and existing project write authorization before parser admission; viewer and cross-tenant denials tested.
- Strict MIME and PDF signature, 2 MiB input, 20 pages, 50k extracted characters, 24 candidates, 8-second child watchdog, bounded response and process admission.
- Parsing accepts bytes only; no URL, shell, viewer, scripting manager, embedded attachment execution, external-resource traversal or OCR. Document/page JavaScript and embedded attachments are rejected. The subprocess receives no inherited auth/provider/database secrets. Its read allowlist includes parser code/dependencies only, without write/subprocess/native-addon/worker permissions. Network APIs are denied before parser import.
- Supporting statements are verbatim or whitespace-normalized. Obvious credential/instruction-containing lines are excluded before staging. Document labels are redacted, length-bounded and React-escaped. No raw PDFs, document text, parser stderr, stack traces or request bodies are logged by the intake. Errors are fixed public codes with German explanations.
- Opaque preview tokens are actor/project-bound and expire; client-supplied statements or approval fields are not accepted. Context revisions are checked again under row lock during append. No candidate automatically becomes a confirmed fact.
- Existing human confirmations, tenant boundary, quotas, immutable history and manual-only publishing remain unchanged. Importing context correctly invalidates prior context-bound Pack approval.

## Dependency review

Pinned `pdfjs-dist@6.4.299`, Node >=22.13; current official package and API documentation reviewed 2026-10-24. It is newer than the fixes documented in [GHSA-wgrm-67xf-hhpq](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq) and [GHSA-hq66-cqwq-w95j](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j). `isEvalSupported:false`, no XFA, fonts/canvas rendering, WASM or scripting integration. API reference: [PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html); [official package](https://www.npmjs.com/package/pdfjs-dist).

Optional canvas platform packages appear in the lockfile; no canvas rendering or native-addon permission is granted to the parser. Existing lock entries/versions are preserved. `npm ci --dry-run --ignore-scripts --no-audit` validates the lock/manifest relation.

Current `npm audit --omit=dev`: **24 advisories (14 moderate, 8 high, 2 critical)**. The exact baseline lockfile produces identical package/severity findings. No PDF.js/canvas finding was returned. Existing Next/DOMPurify and other advisories are **not fixed** or waived by this task. See [comparison](DEPENDENCY-AUDIT.json); do not treat a clean parser advisory result as whole-repository safety.

## Retention and remaining release limits

Original bytes exist in bounded request/child memory only; no raw-document disk storage or download route. Preview candidates expire after 15 minutes, are removed after successful selection, and disappear on process restart. Memory garbage collection is not cryptographic erasure. Selected sanitized snippets, filename, digest and page provenance remain in the existing immutable context history. No rejected text is appended. Automatic historical Brand Context erasure is **not implemented here**; define owner erasure, audit retention, backups and document naming policy before real-customer intake. No GDPR certification is claimed.

Credential redaction is best effort, not comprehensive DLP. Layout-heavy PDFs, tables, missing fonts and ambiguous line order can extract imperfectly. Owners must inspect the original; the product does not assert complete document understanding. Semantic truth, recency, conflicts, regulated claims and prices still need human review. The Node permission model plus JavaScript network guards is defense in depth, **not a kernel sandbox** against a parser/native-runtime vulnerability. No fuzzing, kernel egress isolation, hard total-RSS enforcement or deliberate full 8-second hang test was performed. A container/OS sandbox, robust operational admission/retention policy and security review are required before production.

Production, real AI, provider spend, public signup, billing, social publishing and CITYWALK production access remain disabled/out of scope.
