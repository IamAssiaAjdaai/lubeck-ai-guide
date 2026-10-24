# MKT-DEMO-POLISH-10 — local owner review

2026-10-24 (Europe/Berlin). Branch `codex/mkt-consolidate-01`; verified clean tracked baseline and exact HEAD `86f0d7dc0ef0082984c775f65d7808c568a401d0` before edits. That prior D2 polish commit remains intact as the direct parent of this focused local commit. No push, merge, deployment, PR modification or provider activation.

## Modal-only changes

- Disclosure main text, lists, headings, review text and primary controls use 16px; provenance/metadata, reset and secondary descriptions use at least 14px, with 1.5–1.6 line height. Original modal title hierarchy and green colors remain. Extra spacing below disclosure headings protects the visible keyboard focus outline.
- Native dialog retains Escape handling and modal semantics. A separate 44px close toolbar remains visible outside the one primary content scroll pane. The outer dialog clips overflow; the inner named region scrolls within a 94dvh maximum. Textarea continues to fit its content and has no nested scrollbar. Mobile action bars now stay in normal content flow, avoiding overlays on expanded disclosures.
- Opening saves the actual opener and page coordinates, then reversibly locks background scrolling. Close restores prior inline values/priorities, exact coordinates and opener focus without scrolling it into a different position. Cleanup releases the lock on unmount; repeated open and queued-close races do not overwrite the restoration snapshot or unlock a newly opened dialog. The previous page styles are also restored if native showModal fails.
- Native details/summary is retained. Opening uses a short 160ms opacity enhancement and closing keeps native immediate content semantics plus existing chevron feedback. No animated height, focus clipping or delayed native close is introduced. Reduced motion removes animation/transitions, including live preference changes.

The three fictional curated posts, claims/data, editing/reset logic, version-bound review and Markdown export are unchanged. No content, generation, analytics, signup, pricing, billing, authenticated workspace, API, Better Auth or CITYWALK changes. Landing hero/footer, photographs, D2 polish CSS and its motion hook are unchanged; LandingD2 changes only import/open handling and the modal wrapper.

## Real before/after evidence

The before captures use an immutable temporary source copy of exact commit 86f0d7d, not a reconstructed mockup. After captures use the current working frontend. Both run with local fonts, synthetic content, reduced motion and an intercepted anonymous session read. No tenant/customer data or provider credentials are needed.

| Expanded state | Desktop 1440px | Mobile 390px |
| --- | --- | --- |
| Hooks/CTA and surrounding controls | [Before](before/modal-expanded-1440.png) / [After](after/modal-expanded-1440.png) | [Before](before/modal-expanded-390.png) / [After](after/modal-expanded-390.png) |
| Plan/source facts and reset | [Before](before/modal-sources-1440.png) / [After](after/modal-sources-1440.png) | [Before](before/modal-sources-390.png) / [After](after/modal-sources-390.png) |

All five widths were checked: 1440/1024 use 1000px viewport height, 768 uses 1024px, 390/375 use 844px. Additional captures and raw axe records remain in private temporary storage. [Before metrics](before/RESULTS.json) / [after metrics](after/RESULTS.json) include measured font sizes and exact browser assertions. The committed screenshot subset was visually inspected.

## Verification

| Check | Actual result |
| --- | --- |
| Modal browser acceptance | 100 checks PASS across five widths |
| Existing curated demo regression | All 271 checks PASS, unchanged script |
| Frontend + CI-guard units | 65 passed, zero failures; includes three new modal lifecycle tests |
| Prior D2 polish browser regression | All 69 checks PASS in a new evidence directory |
| Frontend TypeScript | PASS |
| Focused lint | PASS, zero errors/warnings |
| Marketing Vite build | PASS |
| Whitespace | git diff --check PASS |

Browser checks verify disclosure Enter activation, Space collapse/focus, 16px main/14px metadata, one scroll pane, expanded close visibility, background wheel lock, release, exact scroll restoration, hero/footer opener restoration, Escape, no horizontal overflow and reduced-motion behavior. Unit tests cover preserved inline style priority, repeated open, unmount and old queued-close events. Native close is asynchronous: assertions wait for both restoration and lock release instead of sampling before the close event.

Automated axe WCAG-tag tests report zero violations in expanded modal states at all five widths. The unchanged 271-check suite verifies tabs, local edits/reset, exact-version review/download, Markdown disclosures, keyboard navigation, no image requirement, no external browser requests or application mutations. Incomplete/manual axe categories remain. No physical-device or screen-reader certification, measured conversion improvement or live-model quality is claimed.

No backend/DB contract changed; DB suites and CITYWALK host/mobile gates were not rerun for this isolated frontend task. The new local commit has not run on GitHub. Prior D2 reports/captures were not overwritten. 117/117 protected Human Review hashes and all 321 held-file hashes match the existing preservation baseline. No branch/worktree was removed.

## Exact changed files

Application/test files:

- apps/marketing-saas/src/marketing/direction-d2/LandingD2.tsx
- apps/marketing-saas/src/marketing/direction-d2/curated-demo.css
- apps/marketing-saas/src/marketing/direction-d2/useDemoDialog.ts
- apps/marketing-saas/src/marketing/direction-d2/useDemoDialog.test.tsx
- scripts/marketing-demo-polish-browser.mjs

Evidence (11 files): this REVIEW.md; before/RESULTS.json; after/RESULTS.json; before/ and after/ each contain modal-expanded-1440.png, modal-expanded-390.png, modal-sources-1440.png and modal-sources-390.png. Total: 16 changed files. No private session/login/mail/export material is included.

Reproduce with separate loopback Vite origins for the recorded baseline and current candidate. Run `node scripts/marketing-demo-polish-browser.mjs` with MARKETING_DEMO_POLISH_PHASE=before or after, MARKETING_BROWSER_ORIGIN, and an isolated MARKETING_DEMO_POLISH_EVIDENCE directory. The existing `scripts/marketing-consolidate-demo-browser.mjs` reproduces the full demo/export regression. Tests use installed Chrome by default, or MARKETING_BROWSER_CHANNEL=bundled with existing bundled Chromium.

## Remaining limits

Owner visual/motion comfort review and manual assistive-technology/real iOS and Android browser acceptance remain. Native disclosure closing stays immediate to preserve focus and avoid height instability; unsupported opening animation falls back to native disclosure. Background locking is verified in desktop Chrome's responsive viewports, not on physical mobile Safari. All release/provider/billing/public-pilot gates remain closed. #425 is untouched and remains Draft.
