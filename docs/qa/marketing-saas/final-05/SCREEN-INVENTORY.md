# Active screen inventory

All authenticated views require independent Marketing Better Auth and existing tenant/project authorization. The finite view allowlist remains unchanged. Screens are actual React/API components, not dashboard-image mockups. SCREENSHOTS.md contains all five widths.

| Screen / state | Entry / component | Actual data and boundaries |
| --- | --- | --- |
| Übersicht | `/workspace`, `WorkspaceOverview` | Authorized selected-company context, readiness, saved draft, Pack versions/reviews and private source metadata. Existing next-action callbacks; safe hero illustration/photo policy. |
| Creation: goal/channel/audience | `?view=campaigns`, `PackWorkspace` step 1 | User draft persisted via existing draft API. No model/provider selection. |
| Creation: insufficient facts | same, step 2 | Existing sufficiency gate requests missing information before quota/cost reservation. |
| Creation: three themes | same, step 2 | Owner-confirmed factual basis and explicit theme acknowledgment. Mock-only preparation in local QA. |
| Content Packs list | `?view=contents`, `ContentLibrary` | Actual project groups, saved drafts, current Pack/version statuses and allowed thumbnails. |
| Pack detail / editor | selected Pack via existing resume callback, step 3 | The same working editor is the actual detail view; there is no invented separate detail route. Three post tabs, hooks/CTA, optional image and current version. |
| Review/approval | editor review panel | Exact text/image/version binding; edits invalidate approval; server-enforced export checks. |
| Manual export | editor export panel | Actual text-only and campaign ZIP download, clipboard and optional approved media. No automatic publishing. |
| Historical version | editor native history selector | Immutable old content is read-only; export remains blocked. Existing misleading stale-version banner is documented. |
| Marke & Wissen | `?view=projects`, profile/facts subview | Website/manual business profile, editable service city, source/provenance and human fact confirmation. |
| Brand Kit | knowledge Brand Kit subview | Existing colors/type/style, approved source references and version binding. |
| Medien | `?view=media` | Private authorized uploads, metadata/source approval, delete/retention controls. |
| Creative Studio | optional image disclosure inside selected post | Existing default-off/local QA mock brief → result → review → attach workflow; mock PNG is labeled. No live provider or playable video. |
| Einstellungen | `?view=usage` | Actual usage/budget/uncertain reservations and closed-pilot disclosures. No purchasable plan. |
| Login | `/auth`, `AuthForm` | Existing independent identity; signup is closed in the owner/closed runtime. |
| Recovery / invalid links | same view state, token/error params | Real local sink reset lifecycle, token removal, inline errors and expired/invalid-link handling. No external email. |
| Authenticated onboarding | knowledge view with no company, then manual profile/facts | Actual company creation and persisted source/fact confirmation in isolated QA. |
| D2 landing / curated demo dialog | `/` anonymously | Selected public landing unchanged; fictional curated demo edit/review/Markdown export without login. |

PLANNED, not active screens: Strategy Engine, Content Calendar/scheduling, Reels, Stories, live image/video generation and social analytics. No dead navigation or pretend players are added.
