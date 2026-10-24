# Wirkfaden design system v1 — candidate, not a declared freeze

The owner-selected dashboard image remains canonical. The editorial layout, palette, typography hierarchy, cards, hero frame and responsive composition are owner-approved. This package records implementation and outstanding acceptance, not new visual concepts or commercial name approval.

## Identity and tokens

| Role | Implemented token/value |
| --- | --- |
| Forest Ink / primary | `--brand-ink: #162D2C` |
| Soft Sage | `--brand-paper: #F0F3EC` |
| Lime / Lilac | `#D0EB8D` / `#C8BCEE` |
| Warm canvas / white surface | `--reference-canvas: #FAFAF7` / `--reference-card: #FFFFFF` |
| Neutral border | `--reference-border: #E4E7DE` |
| Supporting text | `--reference-muted: #5B6560` |
| Pastel card fills | lime `#EDF5DC`, lilac `#F1EBFB`, yellow `#FFF5D5` |
| Editorial | locally hosted Fraunces, `--font-editorial` |
| Operational | locally hosted Manrope, `--font-ui` |

The workspace wordmark is scoped/configurable in `WorkspaceIdentity.tsx`, explicitly provisional. Auth and public surfaces retain the global provisional Marketing Workspace identity. Name/trademark/legal approval is separate; the two working labels are not a finalized legal identity.

## Typography and spacing

Authenticated Overview heading: 36–44px; secondary editorial headings approximately 30–42px; section headings 20–24px. Operational forms/body: 16px; sidebar: 15px; main buttons: 15px; supporting copy: 14–15px; limited metadata: 13px. At 375/390 the six bottom-nav labels are 14px with full accessible destination names. These are implemented workspace values, not a claim every legacy auth element meets them.

**Known exception:** auth/recovery inputs are 16px, but labels/primary buttons are 13px, password-toggle/recovery actions 11px, desktop provisional notice 9px. See AUTH-TYPOGRAPHY.json and SCREEN-ACCEPTANCE.md. This mismatch remains a freeze blocker; no auth redesign or hidden typography patch is included in the focused commit.

Existing cards use 12–15px corners, fine borders, restrained shadows and generous form spacing. Desktop sidebar is 240px (216px at 1024), topbar 74px (70px at tablet/mobile). The approved hero keeps its asymmetric rounded frame and fixed reserved height across fallback/photo/error states.

## Components and behavior

- `WorkspaceOverview`: selected business, existing readiness-based Next Best Action, actual saved Pack/post/version/review data, four truthful summaries, direction/plan row, three text/source previews, knowledge/action rail and retained saved drafts. No fabricated analytics or strategy.
- `WorkspaceHeroVisual`: only an exact-reviewed selected-project private source with `business_photo` role can be a photograph. Logos/unrelated/public URLs are not eligible. No image/denied/deleted/error cases use hand-authored neutral brand SVG; captions explicitly identify an illustration rather than an enterprise photo. No D2 florist fallback. Server authorization/hash/source approval remains authoritative.
- `CampaignCard`, `ContentLibrary`, native forms/tabs/disclosures and existing `CreativeStudio` remain functional components connected to existing APIs.
- Buttons preserve primary/secondary/disabled states and visible focus. Changes do not alter callbacks, dirty-state protection, exact-version review or export.
- Small-screen navigation remains six working destinations: Übersicht, Inhalte erstellen, Content Packs, Marke & Wissen, Medien, Einstellungen. It uses 60px minimum button height, at least 44px width, `84px + env(safe-area-inset-bottom)` navigation height and `124px + env(safe-area-inset-bottom)` content clearance.

## Responsive and motion contract

1440: pale fixed/sticky rail, split hero, pastel summaries, direction/plan columns, three content columns and right knowledge/action rail. 1024: narrower rail and reflow. 768: no rail, working bottom navigation and appropriate two-column sections. 390/375: one column, legible previews and next action near the hero. No new active strategy/calendar destinations.

Motion remains subtle and respects reduced motion. Acceptance captures temporarily emulate reduced motion to avoid transient button-color screenshots; normal navigation/editing still runs outside capture. Reserved hero geometry is checked across all five widths for no-image, approved and denied-image states. This is not a whole-product CLS performance certification.

The public D2 landing/assets, source API/DB contracts, Better Auth, tenant security, quotas and provider/billing gates are unchanged. Physical-device safe areas, virtual-keyboard behavior and assistive-technology acceptance are UNVERIFIED.
