# Screen 06 return-by verification — functional limits

2026-10-25. Visual design remains frozen; no Screen 06 or picker source was changed.

Verified connection: `ReturnByTimePicker` calls the existing `setReturnBy` in `NativeWalkFlow`. Build parses the value through `deadlineForToday` and passes the timestamp into `WalkSettings.deadline`. `buildWalkSteps` computes remaining minutes from the deadline and forwards that budget, origin and optional finish to `buildPersonalizedTour`. Candidate fitting reserves estimated walking time to the finish before admitting a stop. A loop uses the start as finish; the existing destination mode uses the selected place. Anywhere has no return leg. The explicit deadline takes precedence over the duration selection. The contract supports a future time today, not a next-day deadline.

New controller integration test uses the real builder: at noon, entering 12:45 produces a journey with the matching deadline and loop finish, limits measured visit + walking + return time to 45 minutes for the fixture, and produces fewer stops. Existing shared parity tests also exercise duration fitting with finish legs and remaining deadline budget. The native picker itself was not mocked into that end-to-end input test; its reopen defect is documented below.

Functional gaps / limits:

1. The iOS picker’s existing `timeDate` regular expression is double escaped. A saved `14:30` fails to parse, so reopening initializes the draft from the current clock rather than the previously chosen time. It may overwrite the saved value if Done is pressed unchanged. Reproduction is in `logs/return-by-picker-gap.log`. This is an observed existing implementation defect, not a claim that restoration works.
2. `WalkSettings` contains start/finish coordinates and a deadline, but no car, bicycle, transit, timetable, transfer, departure or station-check-in constraints. Only the existing estimated walking return to a selected finish is supported in this native path. No unsupported transport promise is made.
3. Walking time is an estimate from the existing distance/pace logic; it is not live traffic, transit or a guaranteed arrival time. If the direct return already exceeds the budget, the builder can produce an empty/late recovery state; a deadline cannot make an impossible return feasible.

Screen 06 is visually approved, but is not being declared fully functionally accepted. Fixing the picker restoration defect and adding other transport constraints are separate scoped work; neither was silently implemented under Screen 07.
