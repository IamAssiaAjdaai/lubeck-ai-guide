# Photo-credit placement audit — 27 October 2026

## License-by-license review

Reviewed the original source pages and the exact license versions. This is the implementation’s documented license interpretation, not a blanket guarantee covering unknown assets or future uploads.

| Photograph / creator | Original record | License / direct terms | Placement decision |
| --- | --- | --- | --- |
| Holstentor in Lübeck Frontseite.jpg — Christian Wolf (www.c-w-design.de) | https://commons.wikimedia.org/wiki/File:Holstentor_in_L%C3%BCbeck_Frontseite.jpg | CC BY-SA 3.0 DE: https://creativecommons.org/licenses/by-sa/3.0/de/ ; legal code https://creativecommons.org/licenses/by-sa/3.0/de/legalcode | §4(c) permits appropriate attribution and requires creator, title, source and modification indication, with equal prominence among contributors. Full record centralized; an accessible image-specific Photo Credits link stays beside Screen 11’s metadata. Retain exact DE license and ShareAlike for photo derivatives. |
| Hamburg - Elbphilharmonie - 2016-2.jpg — Avda | https://commons.wikimedia.org/wiki/File:Hamburg_-_Elbphilharmonie_-_2016-2.jpg | CC BY-SA 3.0 Unported: https://creativecommons.org/licenses/by-sa/3.0/ ; legal code https://creativecommons.org/licenses/by-sa/3.0/legalcode | §4(c) permits reasonable attribution, including equally prominent collective credits. Full central record added; approved onboarding and city-preview controls remain unchanged. Resizing/cropping and retained ShareAlike recorded. |
| Rheinturm, Duesseldorf.jpg — Turmfalke | https://commons.wikimedia.org/wiki/File:Rheinturm,_Duesseldorf.jpg ; original Pixabay publication linked by that record: https://pixabay.com/de/photos/rheinturm-fernsehturm-sendemast-1096400/ | CC0 1.0 dedication: https://creativecommons.org/publicdomain/zero/1.0/ | No attribution condition under the dedication. Creator/source/changes are nevertheless retained centrally. The Commons file record documents the historic CC0 release; do not substitute current generic Pixabay terms. Existing UI preserved. |
| Historic Prague Skyline with Tyn Church — Jean Paul Montanaro | https://www.pexels.com/photo/historic-prague-skyline-with-tyn-church-35286105/ | Pexels License: https://www.pexels.com/license/ | Attribution optional; app use and modification permitted, subject to its restrictions. Full voluntary record centralized. Existing approved Welcome/Introduction credits remain. Photo is not a trademark or destination-availability claim. |

Creative Commons’ own FAQ explicitly allows a link to a place containing attribution: https://creativecommons.org/faq/#how-do-i-properly-attribute-material-offered-under-a-creative-commons-license . This informs the linked Screen 11 implementation alongside the exact 3.0 DE text; it is not applied blindly to other licenses.

The central records identify file variants and actual interface locations, retain titles/creator names and original source/license URLs, distinguish an unchanged original JPEG displayed with cover framing from the portrait WebP derivative, and disclose resizing, cropping and conversion. Original asset license files, images, DB and CMS metadata are untouched.

## Cross-surface UI matrix

| Surface | Existing presentation | Decision in this change |
| --- | --- | --- |
| Screen 01 Welcome | Per-carousel-photo modal with creator/source/license | Audited; frozen, unchanged. All four records now also available centrally. |
| Screen 02 Product Value Story | Collage credits modal | Audited; frozen, unchanged. Variant/usage information added centrally. |
| City selection / First Experience | Accessible CityPhotoCredits controls | Audited; frozen, unchanged. Unavailable-city credits remain accessible. |
| City Hub hero / bundled suggested walks / bundled POI cards | CityPhotoCredits controls for exact bundled photo | Audited; frozen, unchanged. Holstentor usage recorded centrally. |
| City Hub CMS photos | MediaAttribution from public-safe attribution DTO | Retained. Arbitrary publisher-specific terms cannot be inferred from free-text attribution. |
| Screen 10 Explore | Inline MediaAttribution for credited images | Audited; frozen, unchanged as explicitly requested. No global suppression or shared component edit. |
| Screen 11 Place Detail, matching bundled Holstentor | Long inline author/source/license paragraph | Replaced with a compact, 44pt accessible Photo Credits link to the exact centralized entry. Hero, title, data and actions retained. |
| Screen 11 public CMS image | Inline MediaAttribution | Retained unless the exact bundled image policy applies. Recognizable license names alone never trigger removal. |
| Native tour detail / Routes | Approved public image and MediaAttribution | Audited, unchanged. No automatic migration of unreviewed CMS license terms. |
| Maps | Provider attribution controls | Unchanged; these are provider/map-data obligations, not interchangeable photo credits. |
| Public Web CityExperience / PlaceExperience / PlaceDiscovery / legacy localized POI | Existing MediaAttribution / figure captions | Audited, unchanged. No public legal publication or traveler flow change. |
| Native Legal & support | Existing Photo Credits navigation, previously English-only row label | Localized label; links existing guest /photo-credits route. Existing external Imprint destination unchanged. |
| Native /photo-credits | Two city-preview credit records | Extended to four verified source works and their known variants with EN/DE usage/modification information and direct links. Guests need no session. |

`attribution-ui-inventory.txt` records source locations. Approved Screens 01–10 are preserved byte-for-byte in `frozen-sources.sha256` / `logs/frozen-sources.log`.

## Unverified provenance and content boundaries

The existing 20 missing POI photos and four legacy POI assets with unverified provenance remain unresolved content dependencies. Explore/Place Detail continue their existing verified-photo/fallback policy; no new image is introduced or an unverified image given invented attribution. Other pre-existing decorative/generated/reference assets are not relabeled as licensed photographs. Historical generated-waterfront provenance is documented in `docs/qa/citywalk-v2/README.md`; no copyright claim or new license is invented for artwork.

Dynamic CMS attribution continues to appear with its image because its public DTO does not carry a separately reviewed license-placement policy. A future image demanding direct/prominent attribution must keep that presentation until its specific terms are reviewed. This change provides no blanket “credits may always move to Impressum” rule.
