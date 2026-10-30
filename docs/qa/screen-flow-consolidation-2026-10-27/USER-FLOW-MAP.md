# CITYWALK screen and flow audit

Completed **28 October 2026, Europe/Berlin**; discovery began 27 October (directory name retained). Read-only product audit. Only this dedicated report directory is generated. No source edits, checkout switching, consolidation, commit, push, merge or deployment.

Current redesign: `codex/onboarding-global-welcome`, worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted/untracked implementation. Base SHA alone does **not** identify the approved designs; current source hashes and snapshots are preserved here. Screens **01–13 are visually approved by the owner**, with functional verification pending where documented. Candidate Active Walk (14) exists from preceding work and remains **unapproved**; this audit does not extend it.

Native is Mobile Core; Public Web is acquisition/SEO/sharing/legal/intentional existing preview, not an automatic native mirror; Admin Web is staff operations. Independent Marketing SaaS branches are excluded from CITYWALK route counts, while CITYWALK internal Admin marketing is included.

Live remote refs read: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main `88191e77e55a489804c49bccccf6307b5876b41d`. No fetch/merge was performed. Locally available refs/history may not equal every remote branch ever created. See `github-evidence.json`, `refs.json`, `worktrees.json`, branch-route indexes and source snapshots. Exact-head CI/device/deployment status is not inferred from source presence.

## Actual code-derived flow

```mermaid
flowchart TD
 Launch[App launch] --> Home[Home / legacy discovery]
 Review[Explicit Welcome deep link / fallback] --> S01[01 Global Welcome]
 S01 -->|Get Started| S02[02 Value Story]
 S01 -->|Explore Cities| S04[04 Choose a City]
 S02 -->|Next| S03[03 Optional Account]
 S02 -->|Explore Cities| S04
 S03 -->|Guest discovery| S04
 Home -->|Explore tab| S04
 S04 -->|Available city| S09[09 City Hub]
 S09 -->|Build, no current walk| S05[05 Interests]
 S05 --> S06[06 Time / Return-by]
 S06 --> S07[07 Optional Location]
 S07 -->|Allow OR Not now| S08[08 First Experience]
 S08 -->|Retain planner in stack| HubReturn[09 Hub returnToPlanner]
 HubReturn -->|Build = back to planner| Plan2[Interests again / walking then start-end]
 Plan2 -->|Explicit Build| CustomPreview[Custom planner preview]
 S09 -->|Restore existing walk| CustomPreview
 CustomPreview -->|Explicit Start| CustomActive[Custom Active Walk]
 CustomActive --> Finish[Finish / feedback / save]
 S09 --> S10[10 Explore Places]
 S09 -->|Suggested route| S13[13 Route Preview]
 S13 -->|All walking routes| S12[12 Walking Routes]
 S12 -->|Preview| S13
 S13 -->|Place links| S11[11 Place Detail]
 S13 -->|Explicit Start Walk| A14[Unapproved published Active Walk mode]
 S10 --> Search[Separate city Search]
 Search --> S11
 S10 --> S11
 S11 --> Guide[Place-scoped Guide / eligibility]
 S09 --> Assistant[City Guide unavailable / fallback]
 S11 -->|Add to walk| Plan2
 Tabs[Five app tabs] --> Home
 Tabs -->|Explore with city| S10
 Tabs -->|Trips| Trips[/saved?view=trips]
 Tabs -->|Saved| Saved[/saved]
 Tabs --> Profile[/profile]
 Profile --> Account[/account management]
 Profile --> Legal[/legal to Photo Credits]
```

The diagram is a discovery map, not a mandatory linear journey. 05–08 share the walk route; 09 can be reached before them. Auth and location remain optional. No walk starts by viewing 13. Standard native observations confirmed 01→02→03 guest exit→04→09 and 05→06→07 Not now→08 on a separate existing clean-draft simulator. Another simulator restored its current custom preview from Build My Walk. No current walk was discarded; no new route was generated or started.

## Onboarding versus main app tabs

Onboarding is the Welcome/Story/account-selection routes and planner-internal introductory states, **not a separate eight-route stack**. Current app uses a Stack plus shared `NativeBottomNavigation`; these are five navigation actions, not a filesystem tab navigator. Exact targets: Home `/`; Explore city-aware `/city/:citySlug/explore` else `/?section=cities`; Trips `/saved?view=trips`; Saved `/saved`; Profile `/profile`. `activeNativeTab` treats Hub/Places/list as Explore and walk/tour as Trips. Numbered design IDs never determine tab ownership.

## Edges and triggers

| From | To | Trigger / condition | Source |
|---|---|---|---|
| App launch | Home / | Default Expo index; Welcome does not replace root | [mobile/src/app/_layout.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/_layout.tsx) |
| 01 /welcome | 02 /introduction | Get Started | [mobile/src/app/welcome.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/welcome.tsx) |
| 01 /welcome | 04 /?section=cities | Explore Cities | [mobile/src/app/welcome.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/welcome.tsx) |
| 02 /introduction | 03 /account?onboarding=1 | Next | [mobile/src/app/introduction.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/introduction.tsx) |
| 02 /introduction | 04 /?section=cities | Explore Cities | [mobile/src/app/introduction.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/introduction.tsx) |
| 03 onboarding account | 04 /?section=cities | Guest leave; authentication optional | [mobile/src/app/account/index.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/account/index.tsx) |
| 04 selection | 09 /city/:citySlug | Available city only | [mobile/src/app/index.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/index.tsx) |
| Home / | 04 /?section=cities | Explore tab; focused selection variant | [mobile/src/components/NativeChrome.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeChrome.tsx) |
| 09 City Hub | 05 /walk interests | Build My Walk when no retained journey | [mobile/src/app/city/[citySlug]/index.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/index.tsx) |
| 09 City Hub | Custom preview / active | Build My Walk restores current city journey instead of new draft | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| 05 Interests | 06 Available Time | Continue / Skip; same mounted controller | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| 06 Available Time | 07 Location | Continue / Skip current budget | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| 07 Location | 08 First Experience | Explicit permission success OR Not now | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| 08 First Experience | 09 City Hub | Explore city; returnToPlanner=1, planner kept underneath | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| 09 returnToPlanner=1 | Planner interests/walking (step 2) | Build My Walk goes back when stack exists | [mobile/src/app/city/[citySlug]/index.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/index.tsx) |
| Planner interests/walking (step 2) | Planner start/end (step 3) | Continue; next manual/GPS start, end/loop constraints | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| Planner start/end (step 3) | Custom preview | Explicit Build → shared planner → persistCurrentWalk preview | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| Custom preview | Custom Active Walk | Explicit Start Walk; separate from curated route | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| Custom Active Walk | Custom finished | Manual progression/end and feedback/save/share | [mobile/src/components/NativeWalkFlow.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx) |
| 09 City Hub | 10 Explore Places | Explore places; Near me sorts after optional location | [mobile/src/app/city/[citySlug]/index.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/index.tsx) |
| 09 City Hub | City Assistant fallback | Ask CITYWALK; no city-wide answer contract | [mobile/src/app/city/[citySlug]/assistant.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/assistant.tsx) |
| 09 City Hub | 13 Route Preview | Suggested route | [mobile/src/app/city/[citySlug]/index.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/index.tsx) |
| 13 Route Preview | 12 Walking Routes | All walking routes; reverse collection discovery | [mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx) |
| 12 Walking Routes | 13 Route Preview | Select published route | [mobile/src/app/city/[citySlug]/routes.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/routes.tsx) |
| 13 Route Preview | 11 Place Detail | Stop/detail links without trip context | [mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx) |
| 13 Route Preview | Candidate Active Walk (unapproved) | Start Walk → place URL with published trip context | [mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx) |
| 10 Explore Places | City Search | Search entry opens separate route | [mobile/src/app/city/[citySlug]/explore.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/explore.tsx) |
| 10 Explore Places | 11 Place Detail | Place link; saves/adds are distinct actions | [mobile/src/app/city/[citySlug]/explore.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/explore.tsx) |
| City Search | 11 Place Detail | Place selection with city recent search history | [mobile/src/app/city/[citySlug]/search.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/search.tsx) |
| 11 Place Detail | Place-scoped Guide | Eligibility-gated Ask CITYWALK | [mobile/src/app/city/[citySlug]/place/[placeSlug].tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/place/[placeSlug].tsx) |
| 11 Place Detail | Custom planner | Add to my walk integrates current draft/journey | [mobile/src/app/city/[citySlug]/place/[placeSlug].tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/place/[placeSlug].tsx) |
| Trips tab | /saved?view=trips | Custom active/saved/legacy walks; not a route catalog | [mobile/src/app/saved.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/saved.tsx) |
| Saved tab | /saved | Place favorites and saved walks view | [mobile/src/app/saved.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/saved.tsx) |
| Profile tab | /profile → /account | Profile summary / account management | [mobile/src/app/profile.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/profile.tsx) |
| Profile | Legal → Photo Credits | Guest accessible; external legal publication policy separate | [mobile/src/app/legal.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/legal.tsx) |
| Premium | Account / native purchase | Only purchase entitlement flow needs sign-in; basic discovery exit retained | [mobile/src/app/premium.tsx](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/premium.tsx) |

## Back, skipped, repeated, disconnected

- 01/02: normal launch bypass confirmed; both reachable through explicit Welcome flow. Selection has a fallback to Welcome. Not proven unreachable.
- 03: guest exit intentionally replaces discovery; no forced sign-in. Email/provider server acceptance remains separate.
- 05–08: returning walk bypasses these states; Back handlers explicitly step backward. Location denial/Not now does not block continuation. First Experience retains one mounted planner and creates a Hub detour. Returning via unrelated tab/deep-link or process restart is not durable draft restoration.
- 12: direct deep link works; normal native source entry is from 13. No Hub-to-collection link found.
- 11 and candidate 14 share one URL with different trip params; back semantics must be preserved before consolidating.
- Custom finish/saved/share, authenticated account lifecycle and Admin publication flows exist beyond the storyboard; removing them as “extra screens” would remove functionality.
- No comprehensive dead-end/back-stack proof from this observational audit. Staff, feature-gated and historical routes remain unverified rather than falsely labeled broken/unreachable.

