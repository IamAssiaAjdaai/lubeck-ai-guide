# Screen acceptance — engineering evidence, owner approval pending

## Decision

**GO to preserve/review the two approved local fixes. NO-GO for complete Design Freeze v1.0.** Two pre-existing material UX findings remain below. The owner has approved the selected dashboard composition at all five widths; this report does not extend that approval to remaining screens or waive device/accessibility acceptance.

Actual browser evidence uses synthetic businesses/accounts, real local APIs/PostgreSQL and mock providers. The separate fixture evidence intercepts APIs for deterministic error/loading/empty/source-denial tests. All screenshots are actual browser captures. No generated dashboard concepts or human scores are used.

## Screen-by-screen review

| Active screen | Functional/visual assessment | Observed states and interaction evidence | Acceptance |
| --- | --- | --- | --- |
| Übersicht | Reference layout retained: editorial Fraunces, warm canvas, pale rail, real pastel summaries, direction/plan and content/knowledge hierarchy. Neutral illustration is appropriate for the cleaning-company test data. | Actual new/returning account; fixture loading/error/retry/empty/multi-project/stale review; eligible/denied/logo/no-image states; six mobile destinations; reserved hero frame; keyboard and reduced-motion checks. | PASS scoped fixes; owner final confirmation pending. |
| Creation: goal/channel/audience | One primary continuation, readable controls, visible focus and clear goal selection; no provider/model choice. | Actual saved goal/audience survives missing-fact navigation. No-company onboarding and sparse-fact gate checked. Generic long-running/fatal-API UI is not exhaustively screenshot-tested. | PASS tested states. |
| Creation: fact sufficiency/themes | Missing-information questions precede quota reservation. Three source-linked themes and explicit acknowledgment remain visible. | Actual one-fact rejection consumes zero quota/cost; confirmed three-theme path proceeds to local mock Pack. Desktop/mobile images retained. | PASS tested states; not proof of AI copy quality. |
| Content Packs list and current detail | Actual project groups/statuses/dates; older preparation draft retained. Real reviewed source thumbnail appears only on its bound post; text-first fallback is clear. Detail uses the existing editor, not an invented route. | Actual pending/approved version states, saved resume identity and logout/login persistence; empty/error derivation covered by unit/fixtures. | PASS tested states; owner visual sign-off pending. |
| Editor | Clear post tabs, channel/current-version information, readable text/image split and optional-image language. | All three posts edited/saved; tab keyboard arrows; dirty route guard; exact text survives resume. Unit/database/browser checks reject stale approvals. | PASS current editor. |
| Historical version | Old immutable content is read-only and export remains disabled, as required. | Selecting an older version triggers the current-only review endpoint and a misleading stale-version error banner. | FAIL visual/interaction acceptance: HISTORY-01. |
| Review and approval | Current-version review and optional image/text controls are explicit; no implied automatic publishing. | Actual three-post acknowledgment, edit invalidation, mock image review/attachment and delayed old-review rejection. Source/provenance enforcement remains server-side. | PASS safety/function; not independent human claim verification. |
| Manual export | Text-only and campaign choices remain distinct; no image required for texts. Status reflects actual current review. | Actual ZIP/clipboard exports; unsaved/historical/stale states denied; buttons scroll above mobile nav. No remote publication. | PASS tested paths. |
| Marke & Wissen / onboarding | Existing website/manual form, service-city explanation, facts/source cards and Brand Kit separation retained. | Actual empty-company form, manual profile, fact confirmation, city persistence and tenant-scoped API tests. Live external website intake not run; no external website request is required for this acceptance. | PASS local/manual path; external intake end-to-end UNVERIFIED here. |
| Media / Creative Studio | Private upload/metadata/source controls remain readable. Mock result and synthetic/documentary distinctions are explicit. | Actual empty/populated media, synthetic PNG upload, metadata/source approval, Brand Kit save, open mock Studio, review/attach/export; source-integrity, expiry, authorization, recovery and conservative costs rechecked in existing PostgreSQL suites. | PASS local mock path; real models/video UNVERIFIED and disabled. |
| Settings | Compact actual quota/budget cards and honest closed-pilot/billing disclosures; no fake purchase or analytics. | Actual usage and unknown-cost disclosure; loading/error component behavior covered by unit tests. Every backend-failure presentation was not manually forced in the browser. | PASS observed success state; specific fault presentation not fully visually accepted. |
| Login / recovery | Inputs and primary surfaces are orderly and contrast checks pass, but several action labels and provisional metadata are below the workspace readability target. | Actual inline errors, password toggle, invalid/expired-link states, QA signup/verification, local reset request/token/reset/login success, closed public registration and protected routes. | Functional PASS; visual FAIL: AUTH-01. |
| Public D2 / curated dialog | Approved photography, sections and public conversion/demo remain unchanged. | Actual five-width regression, post-tab keyboard, Escape/focus restoration, review focus, exact-version download, modal/action bounds and reduced-motion captures. | PASS regression; no claim of measured conversion or first-time SME testing. |

### State coverage boundary

Loading/error/empty/success were inspected where exercised above, not assumed from a passing overall test count. Some rare auth/creation/settings/media network failures and prolonged loading states are only unit-covered or UNVERIFIED visually. Fixture-only screens are labeled as such. A lack of observed overflow or axe violations does not certify all possible content, assistive technologies or physical devices.

## Material findings

### AUTH-01 — P2 product readability gap (pre-existing)

Measured on the actual closed owner preview at 1440 and 375: inputs **16px**, labels and primary action **13px**, password-toggle and recovery action **11px**, desktop provisional-name notice **9px**. The recovery footer action is approximately **20.7px high**. See [AUTH-TYPOGRAPHY.json](AUTH-TYPOGRAPHY.json), closed-auth captures and auth/recovery screenshots.

These values fall below the intended product readability/comfort targets. This is an observed product UX gap, not a claim that font size alone violates WCAG; automated scans have no violations in the tested states. The auth screen also retains the global provisional Marketing Workspace identity while the dashboard has provisional Wirkfaden; naming consistency still needs owner approval.

Smallest proposed correction: a scoped auth-only typography/touch-target adjustment, retaining layout, Better Auth behavior, field associations, closed signup and password/recovery controls. No auth/backend redesign is required. It is not included in the focused hero/mobile commit.

### HISTORY-01 — P2 misleading historical-view conflict (pre-existing)

Reproduction: open an edited Pack → expand “Hooks, 7-Tage-Aktionsplan & Verlauf” → select an older saved version. The historical text is correctly read-only and download stays disabled, but a red “Diese Version wurde bereits bearbeitet …” banner appears. See [history viewport](screens/history-readonly-viewport-390.png).

Code evidence: `PackWorkspace.tsx`'s review effect requests `/workspace/reviews/:gid?version=<selected>` for both current and historical versions. `WorkspaceService.content()` in `apps/marketing-saas-api/src/workspace.ts` rejects a non-current version with `409 STALE_VERSION`; `api.ts` maps it to the confusing conflict message. No evidence of content loss or review/export bypass was observed.

Smallest proposed correction: historical mode should not query a current-only approval endpoint; clear historical-mode review messaging while retaining empty/unapproved review state, cancellation of late responses and all existing read-only/export locks. Preserve backend contracts. This is documented, not silently added to the two approved fixes.

## Screenshot inspection notes

Actual desktop and mobile captures were visually opened and inspected, not only axe-scanned: Overview, creation goal/missing-facts/themes, onboarding/profile, facts/knowledge, Pack library, editor/review/export, historical view, Brand Kit, media, settings, login/recovery and the mock Studio. Additional tablet/narrow-width captures and geometry checks are indexed in SCREENSHOTS.md. Auth readability and the history conflict were found during this inspection.

Captures intentionally use reduced motion for stable visuals. Long full-page images include a fixed mobile navigation composited at the current viewport; they are not proof that the bar covers unreachable content. Actual scroll/action-bound tests establish that creation/review/export actions can be brought above it. Viewport captures are provided for historical-mode diagnosis.

## Manual/device limitations

UNVERIFIED: physical notched iOS/Android safe areas, touch scrolling and on-screen keyboard occlusion, VoiceOver/TalkBack/NVDA, high-contrast/forced-color modes, and independent SME task timing/first-time comprehension. Browser scrolling, keyboard focus, reduced-motion media and fixed-control geometry were tested; they do not replace these manual gates. No human scores, timings or owner approvals are invented.
