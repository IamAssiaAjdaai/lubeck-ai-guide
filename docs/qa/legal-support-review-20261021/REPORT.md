# Legal and support review — 21 October 2026

Public Web: required. Mobile Core: not applicable; iOS/Android device acceptance not performed. Admin Web: not applicable.

## Change

Based on `review/landing-legal-integration-20261021` at `aec0919c2112942beaf11fd7c069acaeabb21e6c`. This branch combines the approved LANDING-NEXT homepage and the existing legal publication guard. The Draft PR targets that integration branch to keep the review diff focused; its unmerged dependencies are outside this change.

- Distinguish incomplete operator configuration from publication approval pending. Complete configuration no longer produces an inaccurate missing-configuration heading.
- Keep the existing guard requiring both complete configuration and explicit publication approval. Unapproved legal bodies remain absent, including operator, address, representative, register and VAT details. Add direct public support contact to the pending notice.
- Introduce a shared server-rendered information-page shell for Privacy, Terms, Imprint, Support and Account Deletion: authentic CitywalkLogo, existing brand color constants, canvas, wrapping navigation, consistent content width, footer, keyboard skip link and visible focus.
- Preserve legal body text, support topics, deletion disclosures, panel implementation, API endpoints, subscription links and all SEO/publication rules.

## Actual local verification

| Check | Result |
| --- | --- |
| Focused Vitest | 53 PASS across six suites; 5 DB integration tests SKIPPED, not counted as passing |
| Negative publication tests | Each legal route tested with complete synthetic identity and approval empty, `0` and `true`; no identity/body in rendered HTML, noindex/nofollow, excluded from sitemap |
| Incomplete identity with explicit test approval | All three routes remain hidden and noindex, excluded from sitemap |
| Positive publication test fixtures | Existing approved synthetic body/metadata/navigation cases still PASS |
| Focused ESLint | PASS, zero warnings |
| Full TypeScript | PASS |
| Full Next.js 16.3.8 Webpack build | PASS, 785/785 pages |
| Responsive browser checks | 40 PASS: five routes at 320/390/768/1024/1440/1920px plus 200% root text sizing at 320/390px; no horizontal overflow or offscreen content |
| Automated accessibility | Zero axe WCAG 2 A/AA and 2.1 AA violations on five pages; single main/H1, banner/footer, working keyboard skip links |
| Navigation | All five internal header links exercised through the Next.js router |
| Rendered robots/sitemap | Unapproved legal pages noindex and omitted; Support/Account Deletion included; robots rules unchanged |
| Unchanged deletion UI | Browser-intercepted request/expired-token responses: explicit confirmation, correct request bodies, fragment removal, success notice and expired-token feedback PASS |
| Browser errors / external requests | Zero / zero |
| Integrity | Homepage, landing components, legal page sources, publication logic, robots/sitemap, deletion panel and production config unchanged; see source-manifest.json |
| Whitespace | git diff --check PASS |

Build and browser server ran from an isolated tracked-source snapshot without environment files. Root fonts used installed local font fixtures. Synthetic identity was complete but publication was OFF in the running server. Outbound fetch/TLS/socket and database connections were blocked; browser API calls for deletion were intercepted without reaching the server. No real operator data, provider calls, database access, production configuration changes or publication enablement.

Screenshots cover each page at 320px and 1440px, captured before synthetic deletion submission. Reviewed mobile Privacy/Account Deletion and desktop Support captures. This is local automated browser evidence, not manual assistive-technology acceptance, a deployed Preview, Cloudflare runtime acceptance or actual account deletion.

## Remaining gates

Owner visual review and required integration/Preview CI before merge. Legally approved operator information, content approval and explicit publication authorization remain separate private gates. No legal publication enabled; no merge or deployment. Production remains NO-GO.
