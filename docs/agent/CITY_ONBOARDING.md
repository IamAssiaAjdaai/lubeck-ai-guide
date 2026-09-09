# CITYWALK city onboarding and launch gate

The CMS/PostgreSQL database is the authoritative operational content store. A
city manifest is only a validated, repeatable bootstrap input. Importing a
manifest must never become a parallel public content source, overwrite
staff-authored records, or run automatically during deployment.

## Onboarding checklist

1. **City identity** — choose a stable lowercase slug, display name, ISO
   country code, IANA timezone and explicit draft/published state.
2. **Localized city content** — author a name, concise discovery summary and
   fuller traveler introduction for every launch locale independently. Do not
   label fallback content as translated.
3. **Place selection** — select durable, useful places across the existing
   `see`, `eat` and `fun` taxonomy. A target is a quality gate, not permission
   to add filler.
4. **Coordinates** — verify each place identity and entrance/area coordinate;
   run range, city-envelope and duplicate checks.
5. **Categories and tags** — use a domain category; model Hidden Gems as the
   `hidden-gem` tag and add only evidence-based tags.
6. **Traveler metadata** — set a reasonable visit duration, environment,
   pricing certainty and status. Never turn missing opening data into an
   `open` claim.
7. **Canonical sources** — attach at least one current, authoritative source
   to the city and every publishable place whenever factual claims are made.
   Prefer public authorities and first-party institutions over aggregators.
8. **Traveler descriptions** — write original concise summaries in each
   authored locale; never copy source prose.
9. **Stories, facts and visit notes** — include only source-supported stable
   facts. Date changing access notes and omit uncertain claims.
10. **Media and rights** — upload through the private media workflow, record
    provenance, and publish only approved assets with adequate rights. Missing
    imagery is a blocker, not a reason to import arbitrary images.
11. **Walking tour** — create a geographically coherent editorial route whose
    stops are all published in the same city. Do not claim routing-provider
    precision.
12. **Hidden Gems** — verify public access, traveler value and distinctiveness;
    use conservative privacy wording for residential or memorial settings.
13. **Verified AI eligibility** — create active knowledge chunks only from a
    source attached to that place. CMS publication alone never creates RAG
    trust.
14. **Exact-locale audio** — track each required locale independently. Never
    use another locale as an audio fallback or mark test audio approved.
15. **Publication and revisions** — publish through the CMS workflow. Confirm
    the public snapshot uses the current published revision while working
    drafts remain private.
16. **Web QA** — test city index, city/place pages, localization fallback,
    media, map behavior and unknown-city isolation.
17. **Native/mobile QA** — parse the same public DTOs in the Expo client and
    verify fallback, deep links, media delivery and guest-first behavior.
18. **Launch decision** — run the readiness report, record manual QA outcomes,
    review every blocker and approve launch explicitly. Row count alone can
    never make a city launch-ready.

## Readiness matrix

`npm run content:readiness -- --city=<slug>` reads one city profile and the
actual CMS/publication graph. Running `npm run content:readiness` without a
city prints the reusable matrix for every configured city, including the
Lübeck flagship. It reports:

- publication state, complete city-level traveler content and valid city
  provenance per required locale;
- published-place target;
- places with complete, currently valid required sources;
- approved public city/place key imagery;
- published and internally coherent walking tours;
- published places with active source-linked verified knowledge;
- exact authored content coverage per required locale and separately recorded
  editorial review decisions;
- approved position-0 exact-locale audio coverage;
- premium-content state (`not_required` is valid for a free launch);
- Web, native and traveler manual QA states;
- `launchReady` and machine-readable blockers.

Automatic checks use the same publication, revision and public-media rules as
traveler delivery. Editorial review and device/traveler QA are intentionally
manual fields in `city_launch_readiness`; they are not inferred from row
existence. A failed or pending required gate keeps `launchReady` false.

The manual `reviewedContentLocales` field covers both city-level and place-level
editorial review. A complete database row is never silently treated as a human
review decision.

## Source and media rules

Canonical URLs are normalized and de-duplicated. `verifiedAt` records when an
editor checked a source; a `validUntil`, where present, must not be expired.
Historical facts are paraphrased and traceable to an attached source. If
authoritative sources disagree, record the discrepancy and publish only the
defensible overlap.

Media must use the existing private object-storage, approval and attachment
flow. Object keys, credentials and staff metadata stay server-only. External
media retains its provider validation. Do not download images from search,
tourism or encyclopedia pages without an explicit, reviewed usage right.

## Add the next city

1. Create a validated, data-only `CityManifest` JSON document outside the
   application source tree, for example `./content-imports/berlin.json`.
2. Research canonical sources and write independent launch-locale content.
3. Set a broad coordinate QA envelope that catches mistakes without becoming
   a product navigation boundary.
4. Define honest targets and pending manual gates in the readiness profile.
5. Run unit validation before touching the database.
6. Apply committed migrations, then explicitly run
   `npm run city:import -- ./content-imports/berlin.json`.
7. Run the importer twice and confirm counts/revisions/knowledge remain stable.
8. Run `npm run content:readiness -- --city=<slug>` and resolve blockers via
   normal CMS/media/knowledge workflows.
9. Verify `/api/content/cities` and `/api/content/cities/<slug>` in Web and
   Expo. Never add a client-side city switch.
10. Record Web/native/traveler QA and make the launch decision. Import is not
    launch approval.

Future cities can be imported from a validated manifest path without changing
or rebuilding application code. Public discovery, routing, media, localization
and mobile parsing remain city-generic. The TypeScript Lübeck and Hamburg
manifests are bootstrap/reference fixtures for existing canonical content;
they are not the production onboarding contract for future cities.

### Manual CMS workflow

Staff may also onboard a city without a manifest. In **Admin → Cities → New
city**, create a draft with its stable slug, ISO country code, IANA timezone,
name, short description and full traveler introduction. Save English and
German independently through the locale selector, add the city-level source
links on the city detail page, then create places and their references through
the existing CMS forms. Review and publication continue through the existing
server-enforced draft → in review → approved → published workflow.

### Launch portfolio enrollment

Public CMS publication controls traveler visibility; it does not automatically
nominate a city for a Germany launch portfolio. A city appears in the launch
readiness matrix only when an explicit `city_launch_readiness` profile has been
created through a reviewed manifest/import or equivalent operational workflow.
Therefore an unrelated local or test city can be published and discoverable
without silently becoming a launch candidate. The matrix queries configured
profiles and has no hardcoded two-city total.

## Hamburg first-pass state

Hamburg is the first non-Lübeck pipeline proof. Its bundled bootstrap fixture contains
German and English editorial content, canonical source links, a compact
central harbour/heritage walking tour, and a small explicitly source-backed
knowledge set. It intentionally includes no downloaded imagery, production
audio, premium product or Hamburg City Pass. Those omissions remain visible
readiness blockers until completed through their respective workflows.

## Lübeck flagship audit

Lübeck uses the same city localization, provenance, media and readiness model
as Hamburg. Its canonical import provides source-backed German and English
city summaries and fuller traveler introductions without embedding copy in a
React component. Editorial review remains a manual readiness decision.
Approved CMS city imagery is audited separately from the legacy image fallback;
the fallback does not satisfy the approved-key-image gate. Run the readiness
matrix against the actual target database to see the current review, imagery,
audio, AI and QA gaps rather than assuming the flagship is complete.
