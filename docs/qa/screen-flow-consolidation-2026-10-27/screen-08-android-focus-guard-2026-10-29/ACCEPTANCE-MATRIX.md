# Acceptance matrix

| Case | Result | Evidence / limit |
|---|---|---|
| 08 → Hub → hardware Back | PASS | AB01 guest/auth variants; native17–20 |
| Unfocused cursor/lease/receipt unchanged | PASS | AB02 synchronous focus before blur; native six declined callbacks; existing G03 retains write-receipt protection |
| Focused/repeated Back | PASS | AB03 settled+rapid; native single presses and two KEYCODE_BACK events in one command |
| Guide → Hub → hardware Back | PASS | AB04 stack reducer; native39–46; Explore places POP_TO fallback109–116 |
| Hub → Build retains draft | PASS | AB05 real POP reduction + existing adapter assertions; native57–58 and retained UI values |
| Edit Interests / direct Continue | PASS | Existing T04/R01/C01 assertions plus AB01; native retained Edit food, direct constraints |
| Background/foreground without process death | PASS | Native HOME + existing activity brought forward; same Hub key then Back95–98 |
| Guest discovery | PASS | Native fresh isolated install without login; automated guest variants |
| Existing preview resume | PASS | AB06; native explicit Build → preview, exit to Hub, Build returns to stored preview without onboarding |
| Existing active resume / saved replay separation | PASS (automated) | AB06 active and unchanged full-suite current/saved contracts; no new native Active Walk run |
| Listener cleanup | PASS (automated) | AB07 two listeners remain root+planner across effects, only root after unmount |
| Live authenticated native / physical devices | NOT TESTED | Automated identity doubles are separate; no real credentials or device session used |
| Small Android / German native layout / TalkBack | NOT TESTED | This fix run used standard Pixel9 English; localization tests passed; prior AT acceptance still pending |
| iOS gestures / full max-text scrolling / physical VoiceOver | BLOCKED / pending prior acceptance | No new iOS interaction performed; unsigned bundle success does not establish device acceptance |
| Midnight / time-zone dependency | UNRESOLVED | D03 expected failure unchanged; D04/day-zone metadata remains separately gated |
