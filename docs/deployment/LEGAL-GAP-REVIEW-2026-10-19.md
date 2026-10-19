# CITYWALK — prioritized legal launch gap review

Review date: **19 October 2026**. Branch: `codex/public-beta-readiness`; audited baseline: `459e4c7313bf41e4a5511de162940115034b8b5a`. [PR #393](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/393) was verified open and **Draft** at that head. No remote state was changed.

**Overall: BLOCKED for legal launch acceptance.** This is an implementation and source-based gap assessment, not an approval of the operator's legal position. The owner reports a successful private structural `legal:check`. That file and all private operator/environment values were excluded from this review; its contents, assignment notices and account-specific provider settings remain unverified.

**READY** means the stated implementation/content fact was verified. **OWNER DECISION** needs private factual or operational evidence. **LEGAL REVIEW** needs qualified application of law to those facts. **BLOCKED** identifies a release/activation gate still lacking adequate evidence or implementation. “Unverified” does not mean a contract or registration is absent.

Surface classification: Public Web required; Mobile Core shares privacy/lifecycle boundaries, with iOS and Android device acceptance each unverified. Admin Web has no UI change. Only public copy/date and documentation were changed; no auth, schema, retention job, consent logic, provider configuration or infrastructure behavior was modified.

## Priority and closure evidence

| Priority | Status | Gap and required closure |
| --- | --- | --- |
| P0 | **OWNER DECISION** | Privately confirm the individual operator's full legal name, legally usable geographic/service address, contact operation and which registrations/identifiers actually apply. The structural pass verifies none of those facts. Do not send values to this PR/chat. |
| P0 | **BLOCKED** | Rapid contact: the audited Impressum has email only. Select and implement a genuinely usable additional communication route after legal review; assess any applicable consumer telephone disclosure separately. A second mailto link is not evidence of another route. |
| P0 | **OWNER DECISION** | Wirtschafts-ID/USt-IdNr.: determine the publication position from actual assignment/applicability. `legal.ts` and the Impressum support optional VAT ID but no dedicated Wirtschafts-ID. If a required identifier cannot be rendered/bound, publication remains blocked until a separate safe implementation and synthetic acceptance. |
| P0 | **BLOCKED** | Privacy notice still lacks accepted, specific provider/transfer and category-level retention decisions; replace generic language only after evidence exists. AVV availability is not evidence of the applicable customer agreement/settings. |
| P0 | **BLOCKED** | Configured browser analytics: withdrawal persistence failure can retain a prior grant after reload. Resolve in a separately scoped runtime change with injected-failure tests, or retain evidence that analytics remains unconfigured. This review does not activate or change analytics. |
| P0 | **LEGAL REVIEW** | German comprehensibility and Free Beta consumer-contract classification, including current electronic withdrawal rules where applicable. English-only foundation copy and disabled payments do not close these questions. |
| P0 | **BLOCKED** | External provider erasure is queued, not operationally complete. Approved scheduling, historical backlog handling, alert/recovery evidence and provider completion remain separate gates. No cron was activated. |
| P1 | **OWNER DECISION** | Approve a purpose/category retention matrix, support/rights-request handling, log/backup controls and restore-erasure handling. Assign a responsible owner and retain private evidence. |
| P1 | **LEGAL REVIEW** | Decide applicable business/tax registration, VSBG information, regulated-profession/supervision and any editorial responsibility requirements from real facts. Do not label the operator Freiberufler, Gewerbe, Kleinunternehmer or registered business from the repository. |
| P1 | **READY** | Corrected Free Beta copy, conditional provider descriptions, map-recipient category and validity-versus-deletion language. This is local content readiness only; full German legal copy and deployed acceptance remain open. |

## 1. Individual operator and Impressum

Verified in `src/lib/legal.ts`: required type/name/street/postal-city/country presence, company representative check, paired optional register fields, optional VAT ID, fixed support address. `isConfigured` does not test address suitability, identity truth, mailbox response, identifier applicability or professional status. `src/app/imprint/page.tsx` renders those fields; it has no Wirtschafts-ID, telephone or alternative rapid-contact field. Core data remains runtime-supplied; no real identity was inspected.

[DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html) covers provider name/address, rapid communication including email, and applicable register, supervisory/professional and tax-identification disclosures. No. 6 expressly refers to possession of a USt-IdNr. or Wirtschafts-ID. Do not assume an individual or a free Beta is exempt. Obtain a private decision on the assigned identifier(s), including which disclosure suffices when both exist; this audit does not assert that both must always be published. A personal Steuer-ID or ordinary tax number is not a substitute field to publish.

The [BMF explanation](https://www.bundesfinanzministerium.de/Content/DE/FAQ/wirtschafts-identifikationsnummer.html) distinguishes Wirtschafts-ID from other identifiers. The owner/professional must examine the actual assignment, applicable designation and format privately. No new identifier variable, binding or value was added in this content-only task.

For contact, the [CJEU judgment C-298/07](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:62007CJ0298) addresses an additional rapid, direct and effective communication route alongside email; it does not make a telephone number universally mandatory under that rule. Separately, where consumer distance-contract information applies, [Art. 246a §1 EGBGB](https://www.gesetze-im-internet.juris.de/bgbeg/art_246a__1.html) includes telephone disclosure. Do not certify email-only sufficiency or invent a phone number/response promise. Choose an operated channel and review it against the applicable contract model.

## 2. Controller and GDPR Articles 12–14

Verified: privacy renders the configured operator as controller with the same address/contact as the Impressum; it describes purposes, several proposed legal bases, data categories, rights, withdrawal and complaint rights. Runtime completeness and local page tests are not legal validation.

[GDPR Articles 12–14](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679) require understandable information, controller/contact details, purposes/bases, relevant interests, recipients/transfers, retention duration or criteria, rights and applicable additional particulars. Article 14 also addresses categories/sources and timing for indirectly obtained data. Article 12 rights requests generally require action/information within one month; an eligible extension needs notice within that month. Processor arrangements and international transfers require their own assessment under Article 28 and Chapter V.

Concrete unresolved notice work:

- Map active versus conditional flows for the exact release; review proposed Article 6(1)(b)/(f) bases rather than treating their presence in JSX as acceptance. Explain optional analytics consent independently.
- Explain which account data is needed to provide an account and consequences of not supplying it, while preserving guest access; assess any automated decision/profiling disclosures. Recommendations are not automatically Article 22 decisions.
- For social login and any provider-supplied records, document actual source/categories and whether Article 14 information, an already-informed exception or collection-time information applies. Do not infer current provider activation.
- Assess whether a DPO/representative is required before adding contacts. The current generic complaint-right statement exists; a useful authority link must follow verified jurisdiction, not the city featured by the app.
- Approve a secure Support procedure covering ownership verification, deadlines/extensions, full access beyond the self-service JSON, retained/provider records and reasoned decisions. Do not equate an export excluding internal records with the complete legal access response.

The [EDPB transparency guidance](https://www.edpb.europa.eu/documents/guideline/transparency_en) is a review reference for intelligibility, specificity and layered information. No blanket compliance conclusion follows from these foundations.

## 3. Retention, AVVs and transfers

Verified corrections: visitor/session UUIDs have logical validity, with lazy replacement on later use; they are not guaranteed physically erased at expiry. Rate-limit cleanup removes records older than the 48-hour cutoff during a later transaction, so idle systems may retain older rows. Token validity is also distinct from database cleanup. No TTL, migration or background purge was introduced.

Still **OWNER DECISION / LEGAL REVIEW**: category-specific duration or meaningful criteria, deletion trigger, actual purge mechanism, exceptions/access restrictions, operational log and support-mail retention, provider logs, backups and reapplication of erasures after recovery. Detached order/subscription records can retain external identifiers; removal of `user_id` is not proof of anonymization or justification for indefinite retention. Completed erasure jobs have no approved cleanup policy. Relevant existing obligations/holds must be determined rather than guessed.

| Code/documented service | Private evidence needed before acceptance |
| --- | --- |
| Cloudflare / Neon | Effective customer entity/agreement, applicable DPA/AVV, selected region, support/subprocessor access, transfer mechanism, log/backup controls and recovery deletion handling |
| Resend / IONOS support mailbox | Applicable product/contract and role, delivery/mailbox retention and deletion, subprocessors/access locations, rights-request delivery and access controls |
| Optional PostHog | Activation state, project host/region, SDK/error payloads, retention, recipients/transfers, consent evidence and withdrawal behavior |
| Default OpenFreeMap or configured map hosts | Actual style/tile/glyph/sprite hosts, network data/map-area exposure, role/terms, storage/caching and recipient/transfer review |
| Disabled Groq / commerce providers | Separate review before activation; preserve handling of any historical provider records and pending erasure work despite disabled new sales |

Public reference documents were located: [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), [Neon platform terms](https://neon.com/platform-terms), [Resend DPA](https://resend.com/legal/dpa), [PostHog DPA](https://posthog.com/dpa), [IONOS AVV guidance](https://www.ionos.de/hilfe/datenschutz/allgemeine-informationen-zur-datenschutz-grundverordnung-dsgvo/vereinbarung-zur-auftragsverarbeitung-avv-mit-ionos-abschliessen/) and [OpenFreeMap privacy policy](https://openfreemap.org/privacy/). Their availability proves neither customer acceptance nor the deployed configuration. Do not demand a separate manual signature if the applicable agreement is already validly incorporated; verify the actual contract/version. Do not classify every recipient, especially stores/social providers, as a processor automatically.

The previous public assertion that safeguards are relied on was changed to a statement that applicable safeguards are required. Generic wording still does not identify the accepted countries/mechanism or where safeguards can be obtained. A provider list, EU-looking hostname or public DPA is insufficient evidence of the exact transfer position.

## 4. Analytics consent and device storage

[TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html) applies to terminal storage/access beyond cookies and beyond personal-data classification; consent exceptions are narrow. A requested-service exception must be justified per purpose/key. The [DSK guidance hosted by BfDI](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/DSK/Orientierungshilfen/OH_Digitale-Dienste.pdf?__blob=publicationFile&v=1) supports a strict necessity assessment. First-party storage, an OS permission or a free service is not a blanket exemption.

Verified normal paths: browser SDK initialization and analytics UUID creation require an explicit stored grant and configured PostHog values; Allow/Decline and later preferences exist. Native attribution/funnel uses its own consent, checks before sending and clears attribution on decline. These findings support the gate design, not certification of consent validity.

Verified code-level failure risk: `src/lib/analyticsConsent.ts` catches write failure without recording an in-memory denial; `AnalyticsConsentControl.tsx` reloads after decline; `instrumentation-client.ts` can read the old grant and explicitly call `opt_in_capturing`. The privacy copy now states that a failed preference write can preserve an earlier choice after reload/restart. This disclosure does not fix the defect or make analytics activation acceptable. No failing browser-storage runtime test was run here. Treat this as an unresolved activation blocker, not a successfully reproduced production incident. Native has a separate runtime block, but failed persistent write plus failed cleanup can still affect restart behavior.

Also unresolved: consent records have no decision timestamp; assess evidence/version/reconsent needs rather than collecting extra identifiers blindly. Consent-choice storage itself and long-lived preferences/live-walk state require purpose/necessity and lifetime review. Native attribution lacks an expiry while granted. Server entitlement analytics is separately configuration-gated and uses an aggregate payload without checking browser consent; assess actual anonymity/legal basis separately. No entitlement event or provider request was generated during this review.

## 5. Truthful Free Beta and consumer rules

**READY — copy correction:** terms no longer advertise the recommended €4.99/72-hour pass or a current daily AI allowance. They state that Public Beta is free, live purchases/subscriptions and public AI are disabled, account use does not authorize charges, and future paid availability/prices are not promised. Conditional historical purchase/deletion information preserves mandatory rights. Privacy separates unavailable AI/payment flows from current visit processing.

**LEGAL REVIEW:** free does not automatically mean outside consumer law. [BGB §327(3)](https://www.gesetze-im-internet.de/bgb/__327.html) and [§312(1a)](https://www.gesetze-im-internet.de/bgb/__312.html) address certain data-providing contracts and the service/legal-obligation-only exception. Assess the actual guest/account contract and optional analytics purposes; do not declare all free use covered or exempt.

Where applicable, review distance-contract information, withdrawal instructions/form, contract confirmation, digital-service rights and changes/termination. Current [BGB §356a](https://www.gesetze-im-internet.de/bgb/__356a.html) contains an electronic withdrawal function for covered online distance contracts; account deletion is not that function. Applicability must be settled for the actual Free Beta before concluding that disabled checkout removes the issue. Paid subscriptions would additionally need a separately reviewed purchase/cancellation flow; this task adds none.

Review [VSBG §36](https://www.gesetze-im-internet.de/vsbg/__36.html) applicability/exceptions and any participation obligation/commitment before adding a participation or non-participation statement. Do not infer employee counts or a blanket exemption. Do not add a legacy EU ODR link: the [Commission confirms discontinuation on 20 July 2025](https://consumer-redress.ec.europa.eu/site-relocation_en). Generic liability/change clauses and a mandatory-rights reservation are not an accepted German AGB review.

## 6. German-language clarity

**LEGAL REVIEW — still open.** All three foundation pages/navigation and browser consent labels remain English. For the German-targeted release, obtain a complete, plain German review of Impressum, Datenschutzhinweise, Nutzungsbedingungen, consent/withdrawal and deletion explanations; identify the intended audiences and ensure information is accessible when needed. A bilingual slogan alone would not establish comprehension.

Suggested factual wording for the German draft, not a substitute for reviewed terms: “Die Public Beta ist kostenlos. Käufe, kostenpflichtige Abonnements und der öffentliche KI-Guide sind derzeit deaktiviert. Die Nutzung oder Registrierung löst keine Zahlung und kein kostenpflichtiges Abonnement aus.” Explain “Einwilligung widerrufen”, “Konto löschen” and “Vertrag widerrufen” separately where applicable. Translate only verified controller/provider facts and approved retention criteria; do not silently fill placeholders with assumptions.

## 7. Gewerbeanmeldung / Freiberufler

**OWNER DECISION with tax/legal or authority determination.** `individual` describes the rendering contract, not the nature of the activity. [GewO §14](https://www.gesetze-im-internet.de/gewo/__14.html) addresses notification on starting an applicable independent trade; [EStG §18](https://www.gesetze-im-internet.de/estg/__18.html) describes freelance/self-employed income categories. Coding an app, running a free Beta, or planning later payments does not by itself determine which position applies to this operator.

Privately document actual activities/qualifications, commercial intent and start, any mixed development/content/platform activities, relevant establishment and authority/professional advice. Resolve registration/tax notifications, identifiers and any permit/professional obligations accordingly. Do not publish a claimed registration, legal form, tax exemption or Freiberufler status until established. No legal fact or registration number was created by this review.

## Validation and handoff

- Focused existing tests: **8 files / 35 passed**, covering synthetic operator/page rendering, privacy disclosure, consent normal/source paths, identifier validity and disabled AI/live-checkout safeguards.
- Changed TypeScript/TSX files: focused ESLint **PASS**, zero findings. React review: semantic sections/links retained, no new client boundary, effects, requests or hooks; runtime identity gating unchanged.
- Secret-free temporary snapshot with the edited source: all 35 focused tests passed again; focused ESLint, Next route type generation and full app TypeScript (`--noEmit --incremental false`) passed. `git diff --check` passed. No production build or database gate was repeated for these copy-only changes.
- No new test mirroring static copy was added. No database, integration, live-provider, real-identity, device or production acceptance was performed in this follow-up. Earlier runtime/regression evidence remains attached to its earlier SHA and does not prove this edited copy was deployed.
- No schema/API/RBAC/migration/import/dependency/configuration changes. Existing Sharp override, lockfile, migrations and `citywalk-preview-review/` preserved. No private configuration or operator identity opened/printed. No commit/push/merge/deploy, billing, cron or production operation. PR #393 remains Draft.
