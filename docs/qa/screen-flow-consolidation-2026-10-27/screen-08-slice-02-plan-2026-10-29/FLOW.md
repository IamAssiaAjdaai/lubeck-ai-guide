# Slice 02 — proposed flow (not implemented)

## Current

```mermaid
flowchart LR
 I["05 Interests"] --> T["06 Time"] --> L["07 Location"] --> F["08 First Experience"]
 F -->|"Explore city"| H["City Hub"] -->|"boolean Back"| Q["Interests again + walking/tags"] --> C["Start / finish constraints"]
 C -->|"Build"| P["Custom preview"] -->|"Start"| A["Active Walk"]
```

## Proposed after separately approved prerequisites and Slice 02

```mermaid
flowchart TD
 Hydrate["Existing /city/:citySlug/walk: hydrate first"] -->|"current preview / active"| Resume["Resume exact current phase; no 05–08"]
 Hydrate -->|"explicit saved route"| Replay["New replay session → preview; source unchanged"]
 Hydrate -->|"safe new draft"| I["05 Interests — once"]
 I --> T["06 Time / walking return-by"] --> L["07 Optional location"] --> F["08 Same approved composition"]
 F -->|"Continue planning"| C["Remaining constraints: interests summary/Edit, walking, tags, manual/GPS, finish/loop"]
 F -->|"Optional Explore city; commit constraints + live lease first"| H["City Hub"]
 H -->|"Validated exact owning-stack pop OR native Back"| C
 H -->|"Invalid/missing lease"| Hydrate
 C -->|"Edit Interests"| Edit["05 controlled interest view; edit-return=constraints"] --> C
 C -->|"Back"| F
 F -->|"Back"| L
 L -->|"Back"| T
 T -->|"Back"| I
 C -->|"Explicit guarded Build"| P["Custom preview — not published Screen 13"] -->|"Explicit Start"| A["Existing Active Walk; no Screen 14 changes"]
```

## Lease integration sequence

```mermaid
sequenceDiagram
 participant User
 participant Walk as Mounted NativeWalkFlow
 participant Lease as Existing plannerReturnIntents
 participant Hub as Focused City Hub
 participant Stack as Owning native stack
 User->>Walk: Explore city (reserve one browse ticket)
 Walk->>Walk: Commit cursor=constraints with same values
 Walk->>Lease: publish ready identity after healthy committed render
 Lease-->>Walk: Complete v1 envelope or rejection
 Walk->>Stack: Push one Hub only after valid publish
 User->>Hub: Build My Walk
 Hub->>Hub: Acquire one-press lock
 Hub->>Stack: Read current focused owning state
 Hub->>Lease: resolve envelope + live lease + state
 Hub->>Stack: Immediately re-read final state
 Hub->>Lease: resolve again; no async gap
 Hub->>Stack: owningNavigation.pop(finalCount)
 Hub->>Lease: revoke matching ready lease after dispatch
 Stack-->>Walk: Native focus returns
 Walk->>Walk: Consume browse ticket; revalidate content/slot before Build
 Note over Walk,Lease: Resolve is pure; metadata is never draft values or storage freshness
```

No actual transition changes have been made. These diagrams describe the proposal, not current screenshots or passing native behavior.
