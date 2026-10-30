# Audit verification — 28 October 2026

This is a read-only product/source audit. Generated files are confined to this QA package. No consolidation or product implementation was performed.

| Check | Actual result |
|---|---|
| Official design registry | Exactly 13 rows, IDs 01–13 unchanged |
| Fresh current native screenshots | 13 / 13 at standard 402×874 pt; EN 01–04/09–13, DE 05–08 |
| OLD native evidence | 03/04 retained variants freshly captured; 11/13 archived before captures; other missing native captures explicitly labeled |
| HTML links/images/anchors | 155 local references checked; zero broken links; no duplicate HTML IDs |
| Structured evidence | 20 JSON files parsed before validation.json was added |
| Current/baseline source snapshots | Hashes match current files and exact baseline Git bytes |
| Product preservation | 1,791 source/asset files across primary and redesign worktrees checked: zero changes, additions or deletions in the audited source directories |
| Review worksheet | 27 controls initially PENDING; selection works; persists across reload; reset restores all 27 PENDING |
| Responsive review page | 319px single-column screenshot observed; 1400px two-column comparison, no horizontal overflow observed |
| JavaScript syntax | node --check review-script.js passed |
| Existing diff whitespace | git diff --check passed |
| Branch/base preserved | codex/onboarding-global-welcome; 98a1dbbda17f945a0d982eb6dbc36713bad61617 |

## Native observational coverage

Existing standard simulators were used without discarding a walk or resetting app data. Verified Welcome → Story → optional account guest exit → city selection → City Hub. One existing device's Build My Walk restored its previously stored custom preview. A separate existing onboarding QA session showed 05 → 06 → 07 → Not now → 08, without requesting location, generating a route or starting a walk. Explore, ordinary Place Detail, Walking Routes and Route Preview were also directly inspected and captured. Actual local API content showed 25 POIs and one published route. Route list selection opened preview, not active navigation.

Fresh capture devices: CITYWALK Screen07 Standard QA (0C16995E-B9C1-4C80-9C1A-0FF544EBB498) for 01–04/09–13; CITYWALK Screen05 Standard QA (D74667D3-B0DF-47B1-A4DD-7CCE97D29EE4) for 05–08. iOS 26.5, 402×874 pt, 1206×2622 image pixels. Dates in old reports precede their subsequent owner visual approval; user approval establishes visual status, not those historical pending labels.

## Not claimed

No new full mobile/root tests, lint, TypeScript, app builds or database gates were run: this task changes reports only. Historical implementation test reports remain preserved and are not relabeled as new integration results. No live email/OAuth/provider acceptance, purchase, server write, Android device or physical VoiceOver/TalkBack testing. No performance measurements. No exact source-to-binary proof for archived legacy images. Download-export implementation is present and syntax checked, but the actual browser download was not exercised. Local review choices are worksheet data only; all delivered source decisions remain PENDING.

Supporting evidence: validation.json, screenshot-provenance.json, preservation-before.json, source snapshots, route/ref/worktree indexes and existing historical QA reports. No production database, object storage, infrastructure, billing or release action was used.
