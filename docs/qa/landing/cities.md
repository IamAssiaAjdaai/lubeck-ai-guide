# Landing Cities — design review checkpoint

Part of #187. Base: `98ad5007bedb13f2b94e24a8a317a6f171a3b7af`
(the merge of #208).

## Scope

Public Web only, still behind **`/landing-preview`**.

This checkpoint adds the approved Cities section and a working `#cities` navigation
anchor. It does not replace the root homepage or change store availability.

Mobile Core, API/auth, Admin, database, Cloudflare routing, DNS and deployment settings
remain unchanged.

## Source of truth

The cards render directly from `cityLaunches` in
`packages/traveler-core/src/cityAvailability.ts`, excluding unpublished entries.

Current configuration at this checkpoint:
- Lübeck — `available` in CITYWALK's launch-content configuration;
- Hamburg — `coming_soon`;
- Düsseldorf — `coming_soon`.

The landing intentionally labels Lübeck **First CITYWALK city**, not “Available now,”
because content availability and app-store availability are separate states. The section
also states that store availability is announced separately.

If the roadmap changes, update `cityLaunches` first; the landing should not maintain
an independent list.

## Media boundary

Cards reuse each launch-config hero image. Hamburg and Düsseldorf retain the image-credit
text already stored in the launch configuration. This is still a design-review route:
final homepage media/provenance and any required linked attribution remain launch gates.

No new external image request, analytics call, map request or other runtime integration
is introduced.

## Responsive intent

Desktop uses three compact city cards. Mobile stacks them at a readable width. Existing
320/390px overflow, keyboard and 200% text checks remain mandatory.

## Validation

Normal CI remains mandatory. Landing browser validation also checks:
- the Cities heading exists;
- the store-availability separation copy exists;
- no horizontal overflow at 320/390/768/1440px;
- keyboard skip navigation and minimum link-target size;
- 200% text reflow;
- vinext build, SSR-module guard and Cloudflare deploy **dry-run only**.

No merge, production deploy, DNS change, traffic switch, store submission or #187
checkbox completion is part of this checkpoint.
