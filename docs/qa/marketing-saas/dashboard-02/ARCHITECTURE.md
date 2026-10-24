# MKT-DASHBOARD-02 — architecture and capability boundaries

Pinned local parent: a06d9772ef7725413753d37f399d3dbb01f7a53a.
Fetched develop: 72c87245bbb2f0332feb7fe261cee5668ca06b7e; GitHub #425 merged there.
The existing local branch and commit remain intact; the new local commit is additive.
D2 public landing and independent Better Auth/server contracts are outside the edit boundary.

## Screen architecture

| Surface | Working capability / proposed presentation |
| --- | --- |
| Overview | Selected-company welcome; one server-data-based next action; latest persisted Pack with its actual goal, three text previews, version and review state; brand-fact readiness; honest future strategy/calendar notices |
| Content Packs | Current user's draft preparation plus versioned Pack campaign groups, channel/goal/date, exact review badges and resume. Text-led cards; photo thumbnail only from a currently approved source actually referenced by a valid review, with image failure fallback |
| Create | Existing goal/channel/audience → sufficiency questions → distinct-theme confirmation → mock Pack. No strategy generator and no changes to admission or quota rules |
| Review/editor | Saved version/goal/channel context, readable text-first post cards, optional approved image, per-post exact review status, consent and download readiness. Existing tabs, keyboard arrows, provenance, immutable history and manual export stay functional |
| Brand & Knowledge | Business profile, website/manual inputs and confirmed facts; separate local tabs for profile/knowledge vs Brand Kit, with one source of truth and existing forms |
| Media | Existing private upload/rights/approval library, source disclosure and deletion controls. Existing Creative Studio remains connected inside the saved-post editor, not a pretend independent generation surface |
| Settings | Compact real quota, usage/cost reservation and closed-pilot / manual-export disclosures. Price hypotheses remain explicitly non-purchasable |

## Navigation

Working routes remain `/workspace` with the existing finite `view` allowlist.
`overview`, `campaigns`, `contents`, `projects` and `usage` keep their actual behavior.
A finite `media` view may reuse existing CreativeStudio with the same project access
checks; no arbitrary destination, backend route, identity or permission is added.
Visible navigation: Übersicht, Content Packs, Inhalte erstellen, Marke & Wissen,
Medien, Einstellungen. On mobile, six short, readable labels expose these working destinations with
44px-or-larger targets. The desktop retains the full area names. Strategy and Calendar stay outside active
navigation; future placement is between Overview/Content Packs and Packs/Brand.

## Implemented vs planned

| Capability | Status |
| --- | --- |
| Website/manual intake, confirmed fact context | Available now, requires human confirmation |
| Three posts, hooks/CTA, seven-day actions | Available as current offline/mock Pack workflow; not proof of original AI quality |
| Text editing, immutable versions, exact review, manual export | Available now |
| Private source media, Brand Kit, optional mock creative | Available in local controlled QA only; synthetic mock labels remain |
| Read-only Overview and library summaries | This frontend task; authorized data only |
| AI marketing strategy, scheduling/calendar, stories/reels/video | Planned, no working controls or invented outputs |
| Live text/image/video providers, public registration, billing | Disabled; no activation by this task |
| Naming | Existing configurable temporary identity retained; product vision does not imply legal name clearance |

## Data/review design

No schema or persistence change. Reuse `projects`, `workspace/readiness`, user-scoped
`workspace/draft`, `packs`, immutable version data, `workspace/reviews` and private
`creative` reads. Completion is never approval. No lifetime/export/engagement KPI.
History remains limited to 100 jobs/project and labeled accordingly. Reviews are
load-time snapshots; server export revalidation is authoritative. Optional media
read failure must retain the text-first experience without inventing thumbnails.
No automatically retried provider work or clearing uncertain cost reservations.

## Validation plan

Actual baseline and final authenticated screenshots for Overview, creation, review,
library, profile/media and settings at 1440/1024/768/390/375. Full offline units,
Marketing PostgreSQL/security suites, UI/API/Core TypeScript, Marketing lint/build,
canonical authenticated/review/export journey, closed registration and D2 demo.
New regressions for thumbnail approval/source failure, finite routing, summary status,
future-feature honesty, media/profile presentation and dirty-navigation protection.
Keyboard, focus, touch sizing, overflow, reduced motion and automated axe at all widths.
No claim of real-device or independent human/assistive-technology acceptance.
