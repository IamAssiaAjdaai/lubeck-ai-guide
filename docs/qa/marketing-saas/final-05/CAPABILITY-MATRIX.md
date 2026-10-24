# Capability matrix

The product vision is a Marketing Team that understands a business, plans its marketing, creates content and lets the owner review before publishing. Current verified capabilities are a first stage of that vision.

| Capability | Status | Evidence / qualification |
| --- | --- | --- |
| Independent auth, closed public signup and tenant/project ownership | IMPLEMENTED | Local authenticated, closed-access and PostgreSQL suites. QA signup is temporarily enabled only for synthetic setup on separate loopback ports, then verified closed. Owner port 3208 remains closed throughout. |
| Business profile, website/manual entry, editable service city | IMPLEMENTED | Manual onboarding, persistence/logout-login journey and server validation/security tests. External live website intake is not executed in this offline acceptance run. |
| Human-confirmed facts/provenance and sufficiency/theme checks | IMPLEMENTED | Sparse-fact request blocked before quota; three confirmed themes acknowledged in QA. Confirmation is not external verification of truth. |
| Three posts, hooks/CTA and saved seven-day action tasks | IMPLEMENTED — MOCK/TEMPLATE QA | Real v1 assembly/persistence used with local mock provider; no claim of original live-model editorial quality or full business strategy. |
| Saved drafts, Pack versions, editing and source-bound reviews | IMPLEMENTED | Existing APIs and immutable versions; current-version review/export protections pass. Historical error-banner UX remains a known acceptance defect. |
| Brand Kit and private media | IMPLEMENTED | Upload/metadata/source approval, tenant/source integrity and retention/cost safeguards rechecked locally. |
| Context-safe workspace hero | IMPLEMENTED | Reviewed authorized business-photo role plus selected-project URL; illustration fallback/error handling. No unrelated florist photo in cleaning-company workspace. |
| Image creative brief/mock/review/attachment | IMPLEMENTED — LOCAL MOCK ONLY | Authored mock raster, mandatory human review and manual export. Default-off QA capability; no live model demonstrated. |
| Manual reviewed text / campaign export | IMPLEMENTED | Actual ZIP/download/clipboard journey and stale/historical rejection. No automatic publishing. |
| Usage, image/video reservations and failure/unknown-charge safeguards | IMPLEMENTED LOCAL CONTROLS | Existing unit/PostgreSQL tests; no payment or provider charge is made. |
| Full-company Strategy Engine | PLANNED | Direction card uses existing objective/channel/facts, not a generated strategy. |
| Content Calendar / scheduling | PLANNED | Seven-day tasks are not scheduled posts or a publishing calendar. |
| Reels, Stories, real video | PLANNED | No live generation/player or active navigation. Mock video contracts are not a delivered customer video feature. |
| Live AI text/image generation and provider economics | UNVERIFIED / DISABLED | Passing offline contracts do not establish real provider operation or quality. |
| Commercial onboarding, checkout, billing, public pilot, legal/name approval | UNVERIFIED / CLOSED | Separate owner/legal/operational authority is required. |
| Native-device safe areas, screen reader and SME acceptance | UNVERIFIED | Headless Chrome/reflow/keyboard evidence does not replace physical device, assistive technology or human usability work. |

No fabricated reach, revenue, follower metrics, strategy results, human scores or reviewer timings are included. Existing independent Human Review materials remain unchanged.
