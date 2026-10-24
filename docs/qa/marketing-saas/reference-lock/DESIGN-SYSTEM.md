# Owner-selected reference — authenticated design system

Scope: independent Marketing SaaS. All selectors are under `.simple-workspace`; the D2 landing, its fonts and assets are unchanged. No dependencies, backend, migration or persistence changes.

## Tokens

| Role | Token / value |
| --- | --- |
| Ink / primary CTA | existing `--brand-ink` · `#162D2C` |
| Canvas | `--reference-canvas` · `#FAFAF7` |
| Surface | `--reference-card` · `#FFFFFF` |
| Border | `--reference-border` · `#E4E7DE` |
| Muted text | `--reference-muted` · `#5B6560` |
| Soft lime | `--reference-lime` · `#EDF5DC` |
| Soft lilac | `--reference-lilac` · `#F1EBFB` |
| Soft yellow | `--reference-yellow` · `#FFF5D5` |
| Accent lime / lilac | existing `#D0EB8D` / `#C8BCEE` |
| Editorial | locally hosted Fraunces via `--font-editorial` |
| Operational | locally hosted Manrope via `--font-ui` |

Headlines: 36–44px Overview; 30–42px secondary screens. Body/form controls 16px; sidebar 15px; buttons 15px; supporting copy 14–15px. Limited compact metadata 13px. No remote fonts. Cards use 12–15px radius, fine borders and quiet shadows. Hero photo has an asymmetric 56/105px corner treatment. Desktop sidebar 240px (216px at 1024), operational topbar 74px (70px tablet/mobile). Fixed bottom navigation retains all six implemented destinations.

## Components and composition

- `WorkspaceIdentity`: scoped configurable provisional wordmark. Its `workspaceIdentity` constant carries the temporary name and status. Public/global `brandIdentity` and legal identity remain untouched. Owner reference is visual approval, not trademark clearance.
- `WorkspaceOverview`: preserves existing read lifecycle/error/retry/race protection, `nextAction` and callbacks. Owner-reference hero, pastel summary cards, direction/plan row, three-post grid, knowledge/next-action rail, recent work and forest band.
- `reference-surface`, `reference-icon`, `reference-post-state`, `reference-next`: presentation patterns for reusable cards, icon accents, status and contextual action.
- `ContentThumbnail`: reused private approved-source URL with text fallback on missing/failed image. No new media resolver. Only the reviewed post gets its bound thumbnail.
- `CampaignCard` / `ContentLibrary`: existing library and retained draft presentation adopt the same surfaces and editorial campaign titles. No persistence changes.
- Existing creation/editor, knowledge/facts, Brand Kit, Media Library, settings and onboarding inherit scoped operational tokens, form typography, headings and surfaces. Their functional components remain in place.

## Responsive and interaction rules

1440: reference hero split; four pastel metrics; direction/plan split; three posts beside knowledge/action rail. 1024: narrower rail, metrics across main width, posts full width, knowledge/action two columns. 768: no rail; two-column hero and direction/plan; three posts; existing bottom navigation. 390/375: one-column narrative, two-by-two summary cards, next action after hero, stacked posts. All seven tasks remain reachable via a native disclosure; the first three are previews, not a shortened paid deliverable.

DOM source order places the next action immediately after the hero. Desktop grid places it in the right rail; mobile follows source order. No new animation dependency; native buttons, links, disclosure, form and post-tab behaviors remain. Reduced-motion override covers the authenticated scope. Manual export remains separately guarded by exact-version approval.
