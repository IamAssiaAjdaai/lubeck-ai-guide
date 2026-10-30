from pathlib import Path
import json, subprocess, hashlib, re, shutil, html, csv
from PIL import Image, ImageOps, ImageDraw

R=Path('/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome')
O=R/'docs/qa/screen-flow-consolidation-2026-10-27'
BASE='98a1dbbda17f945a0d982eb6dbc36713bad61617'
BRANCH='codex/onboarding-global-welcome'
def git(*a):
    p=subprocess.run(['git','-C',str(R),*a],capture_output=True,text=True)
    return p.stdout.strip() if p.returncode==0 else ''
def save(n,x): (O/n).write_text(x+'\n')
def js(n,x): save(n,json.dumps(x,indent=2,ensure_ascii=False))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def esc(s):return html.escape(str(s),quote=True)
def link(p):return f'[{p}]({R/p})'
def line(p,needle):
    for n,l in enumerate((R/p).read_text().splitlines(),1):
        if needle in l:return f'{p}:{n}'
    return p
app='mobile/src/app/'
city=app+'city/[citySlug]/'
flow='mobile/src/components/NativeWalkFlow.tsx'
rows=[]
def add(i,name,source,component,route,oldsource,oldcomponent,oldroute,oldfun,newfun,gaps,ux,recommendation='KEEP NEW',none=False):
    rows.append(dict(id=f'{i:02}',name=name,source=source,component=component,route=route,oldSource=oldsource,oldComponent=oldcomponent,oldRoute=oldroute,oldFunctionality=oldfun,newFunctionality=newfun,functionalGaps=gaps,uxDifferences=ux,recommendation=recommendation,decision='PENDING',noLegacy=none,status='Visually Approved / Functional Verification Pending',branch=BRANCH,worktree=str(R),base=BASE))
add(1,'Global Welcome',app+'welcome.tsx','WelcomeScreen','/welcome','','','',
    'No legacy equivalent identified. The pre-redesign launch was the existing Home/city discovery, not a photographic welcome.',
    'Four-photo global carousel; attribution modal; Get Started → introduction; Explore Cities → existing city discovery; localization.',
    'Review/deep-link entry only. Normal launch still resolves Home; no first-run completion or returning-traveler policy is wired.',
    'New immersive global entry; discovery remains optional. The earlier first-draft welcome is a redesign iteration, not an original legacy screen.',none=True)
add(2,'Product Value Story',app+'introduction.tsx','IntroductionScreen','/introduction','','','',
    'No legacy equivalent identified. Product capabilities previously appeared within Home/planner/city content.',
    'Wide licensed-photo composition, four descriptive noninteractive value rows, availability disclaimer, Next → optional account, Explore Cities guest exit.',
    'Only entered through Screen 01 or explicit deep link. City-wide Guide remains unavailable; audio is exact-locale and content dependent. Disclaimer is material.',
    'Editorial introduction instead of adding planner steps; no false chevrons. Compact earlier collage is an iteration, not legacy.',none=True)
add(3,'Account / Sign-in',app+'account/index.tsx','AccountScreen + AccountOnboardingFrame','/account?onboarding=1',app+'account/index.tsx','AccountScreen','/account; ?entry=sign-in|sign-up',
    'Guest account chooser, email sign-in/sign-up, recovery, configured OAuth, authenticated account management, preferences/password/deletion and entitlement status.',
    'Same Better Auth and forms inside a premium onboarding frame; email action; sign-in; reassuring guest exit. General account variant remains available.',
    'Visual approval is not live OAuth/email/provider acceptance. General guest exit returns Home/back, onboarding guest exit replaces with city discovery. Authenticated account still contains a Lübeck-specific pass link; not a dynamic selected-city profile.',
    'Two intentional entry presentations currently coexist; management actions must not be removed with the old chooser.', 'MERGE BEST OF BOTH')
add(4,'Choose a City',app+'index.tsx','HomeScreen + HomeCityCard(size=selection)','/?section=cities',app+'index.tsx','HomeScreen + HomeCityCard','/',
    'Original Home editorial city discovery, featured cities, search, optional location, availability, language and bottom navigation.',
    'Premium full selection variant on the same source/route, city search/location, disabled Coming Soon and licensed city photos; selection → Hub.',
    'No direct continuation to Screen 05; this is intentional guest discovery but differs from storyboard numbering. Back without stack falls to Welcome; normal Home and selection mode remain separate variants.',
    'Focused selection versus original Home discovery. Same city registry/data, not two city systems.', 'MERGE BEST OF BOTH')
add(5,'Select Interests','mobile/src/components/SelectInterests.tsx','SelectInterests; NativeWalkFlow internal state','/city/:citySlug/walk [plan, step=1, !interestEntryComplete]',flow,'NativeWalkFlow planning fields','/city/:citySlug/walk [legacy plan step 2]',
    'Existing city-scoped planner interests, duration and walking preferences used shared builder settings; retained later planner controls remain.',
    'Optional multiple-select supported taxonomy including expandable family; Continue requires selection; Skip clears interest selection; city retained.',
    'Per-mounted-flow completion flag, not global onboarding completion. Rebuild resets defaults; process termination does not preserve unbuilt draft selections. Guest selections do not feed Hub recommendations (account interests only).',
    'Dedicated premium cards replace the interest entry presentation; not a standalone navigation route.', 'MERGE BEST OF BOTH')
add(6,'Available Time / Return-by','mobile/src/components/AvailableTime.tsx','AvailableTime + ReturnByTimePicker; NativeWalkFlow','/city/:citySlug/walk [plan, step=1, interestEntryComplete]',flow,'NativeWalkFlow + ReturnByTimePicker','/city/:citySlug/walk [legacy plan step 1]',
    'Planner time budget/deadline, walking pace, start/end/return constraints; saved/current journey restoration.',
    '60/120/180/240-minute cards; hydrated values such as 90 preserved; optional return-by; existing shared planner deadline/return-leg estimates. Saved picker HH:MM restoration fix.',
    'Skip advances with the current/default duration; it does not remove the budget. Return-by is walking-based estimated planning, no car/transit or verified street-routing ETA. Unbuilt draft deadline remains in mounted state only.',
    'Large accessible duration cards and inline optional return-by replace combined form presentation.', 'MERGE BEST OF BOTH')
add(7,'Location Permission','mobile/src/components/LocationPermission.tsx','LocationPermission; NativeWalkFlow','/city/:citySlug/walk [plan, step=2, !locationEntryComplete]',flow,'NativeWalkFlow locate/manual start controls','/city/:citySlug/walk [legacy start/end step 3]',
    'Optional explicit locate action and manual place start/end in the existing builder; no separate explanation screen.',
    'Global map illustration; explicit permission request; Not now; errors; existing location handler; manual controls continue below the introductory states.',
    'This is a planner-context explanation, not an OS permission screen or global first-launch gate. Later planner/map locate controls can repeat the location request affordance.',
    'New standalone-looking state, backed by the old permission system and retained manual controls.', 'MERGE BEST OF BOTH')
add(8,'First Experience','mobile/src/components/FirstExperience.tsx','FirstExperience; NativeWalkFlow','/city/:citySlug/walk [plan, step=2, location complete, firstExperience incomplete]','','','',
    'No legacy equivalent identified. The planner previously advanced directly into start/end planning.',
    'Selected available city photo and confirmation; honest no-generated-route text; Explore city → Hub(returnToPlanner=1); retained mounted planner resumes from Hub.',
    'Detour to a second Hub instance can feel circular. A cold launch/direct Hub link cannot recover an unbuilt draft; stack intent is not durable persistence.',
    'New confirmation state; does not build or start a route. Number 08 is design review identity, not launch step eight.', 'REBUILD FLOW',True)
add(9,'City Hub',city+'index.tsx','CityScreen + CityHubHero','/city/:citySlug',city+'index.tsx','CityScreen / existing hub content','/city/:citySlug',
    'City-scoped published tours, places, search/category/map discovery, trip builder and honest Guide fallback.',
    'Premium hero, retained builder action, Explore/Near me/Ask actions, real tour recommendation and places list/map, city switcher and attribution.',
    'Hub route card still advertises 45 min while Screen 13 shows 120 min at stops. Guest onboarding interests are not consumed by cityHubRecommendations. Walking Routes 12 has no direct Hub entry; Ask opens supported unavailable fallback rather than a city-wide answer.',
    'Compact editorial route card and photography improve hierarchy. City Hub and Places are both in Explore tab; Home remains global discovery.', 'MERGE BEST OF BOTH')
add(10,'Explore Places',city+'explore.tsx','ExploreScreen / ExploreContent','/city/:citySlug/explore',city+'explore.tsx','ExploreScreen','/city/:citySlug/explore',
    'Existing city POI list/map, category browsing, save and walk integration; legacy header/search entry.',
    'Compact navy header, richer POI cards, distinct Save/Add, genuine photo where verified, polished placeholders; search opens separate SearchScreen.',
    '20 missing photos and four unverified legacy assets remain excluded, not solved by placeholders. Separate Search route has recent history/result caps, so merging inline search blindly would lose functionality. Current runtime still exposes adjacent Holstentor attribution text in Explore; centralized Place Detail credits do not imply every credit UI was removed.',
    'Premium discovery layout replaces generic rows; crash fix and existing five tabs retained.', 'MERGE BEST OF BOTH')
add(11,'Place Detail',city+'place/[placeSlug].tsx','PlaceScreen → PlaceContent (ordinary place context)','/city/:citySlug/place/:placeSlug [without published-trip context]',city+'place/[placeSlug].tsx','PlaceScreen / PlaceContent','/city/:citySlug/place/:placeSlug',
    'Verified content, exact-locale audio, sources, guide eligibility, directions, saved place and walk actions; trip-context next/previous.',
    'Large place-specific hero/fallback, title/category/visit time, Save/Add/Directions, real Overview/Story/Audio, accessible central Photo Credits link.',
    'Published-trip URL now dispatches to unapproved PublishedActiveWalk rather than PlaceContent; this is a distinct mode sharing one route. Missing photos and exact-locale unavailable audio remain real limits. Live external directions and provider-gated Guide not accepted by a screenshot.',
    'Large inline Holstentor credit removed in ordinary detail in favor of centralized credits; required licensing metadata preserved.', 'KEEP NEW')
add(12,'Walking Routes',city+'routes.tsx','WalkingRoutesScreen / RoutesContent / PublishedRouteCard','/city/:citySlug/routes',city+'index.tsx','existing TourCard in City Hub','/city/:citySlug [tour collection section]',
    'No legacy equivalent identified for a standalone route-list page. Equivalent published-tour collection was embedded in City Hub.',
    'Dedicated real published route collection; supported duration filters; real metadata/themes; preview; build/saved/hub exits; legal credits.',
    'Duration filters use ambiguous estimatedDurationMinutes=45 despite 120 min summed visits shown in preview. Single real route matches all current budget filters. No curated-route favorite contract. Discoverability is reverse: preview links to list, not Hub → list.',
    'New dedicated list; no fictional storyboard routes or ratings. Host collection overlap is legitimate reuse, but entry needs a decision.', 'MERGE BEST OF BOTH')
add(13,'Route Preview',city+'tour/[tourSlug].tsx','TourScreen → RoutePreview','/city/:citySlug/tour/:tourSlug',city+'tour/[tourSlug].tsx','TourScreen (original published-tour preview)','/city/:citySlug/tour/:tourSlug',
    'Published title/description/duration/stops; place links and explicit first-stop start, without separate verified pedestrian routing.',
    'Real coordinate map with numbered stop sequence, ordered places, truthful visit-only total, original-duration disclosure; explicit Start Walk; builder return-by link.',
    '45 min has no verified walking/full-experience semantics. Real pedestrian geometry unavailable; dashed sequence explicitly not directions. Curated favorite unavailable. Start goes to new unapproved Active Walk mode; current preview contains no direct durable-progress resume decision itself.',
    'Map/list and duration integrity replace simple metadata list; explicit action is still required before active context.', 'KEEP NEW')

# Preserve current and baseline source artifacts for every numbered implementation.
for row in rows:
    d=O/'sources'/row['id'];d.mkdir(parents=True,exist_ok=True)
    paths=list(dict.fromkeys([p for p in [row['source'],row['oldSource'],flow if row['id'] in ['05','06','07','08'] else ''] if p]))
    row['sources']=[]
    for p in paths:
        new=d/(Path(p).name+'.current.txt');shutil.copyfile(R/p,new)
        old=git('show',BASE+':'+p)
        oldpath=None
        if old:
            oldpath=d/(Path(p).name+'.base.txt');oldpath.write_bytes(subprocess.check_output(['git','-C',str(R),'show',BASE+':'+p]))
        row['sources'].append({'path':p,'currentSnapshot':str(new.relative_to(O)),'sha256':sha(R/p),'baseSnapshot':str(oldpath.relative_to(O)) if oldpath else None,'baseGitBlob':git('rev-parse',BASE+':'+p) if old else None})

# Actual native historical images: do not mislabel earlier redesigns as original legacy.
oldpics={'03':O/'captures/screen-03-retained-legacy-en.png','04':O/'captures/screen-04-retained-legacy-en.png','11':R/'docs/qa/screen-11/screenshots/standard-before-en.png','13':R/'docs/qa/screen-13/screenshots/before-standard-de.png'}
supplement={'05':'planner-interests-390.png','06':'planner-time-390.png','07':'planner-start-end-390.png','09':'city-hub-390.png','10':'explore-map-390.png','12':'city-hub-390.png'}
(O/'images').mkdir(exist_ok=True)
images=[]
def asset(path,dest,kind,screen,notes):
    if not path.is_file():return None
    p=O/'images'/dest;shutil.copyfile(path,p)
    im=Image.open(p); w,h=im.size
    entry={'screen':screen,'kind':kind,'path':str(p.relative_to(O)),'original':str(path),'sha256':sha(p),'width':w,'height':h,'notes':notes}
    images.append(entry);return entry
for row in rows:
    i=row['id']; fresh=next(iter((O/'captures').glob(f'screen-{i}-current-*.png')),None)
    row['newImage']=asset(fresh,f'{i}-new.png','fresh-current-native',i,f'Fresh 28 October 2026 local native capture; 402×874 point standard iPhone. Language: {"German" if i in ["05","06","07","08"] else "English"}. Source hashes in registry.') if fresh else None
    row['oldImage']=asset(oldpics[i],f'{i}-old.png','retained-legacy-native' if i in ['03','04'] else 'archived-before-native',i,'Fresh retained legacy presentation on current source, not an exact checkout of baseline.' if i in ['03','04'] else f'Archived pre-redesign simulator capture. Language: {"German" if i=="13" else "English"}. Retained report identifies context; source-to-binary exact match not independently established.') if i in oldpics else None
    row['supplement']=asset(R/'docs/qa/citywalk-native-visual-parity/screenshots/web'/supplement[i],f'{i}-legacy-web.png','supplementary-web',i,'Archived web screenshot, not a native OLD screenshot; no native parity or exact revision claim.') if i in supplement else None
    if row['oldImage']:
        a,b=row['oldImage'],row['newImage'];row['viewportComparison']='Matched pixel dimensions.' if (a['width'],a['height'])==(b['width'],b['height']) else 'Different recorded pixel dimensions/locale. Images preserve aspect ratio; no pixel-perfect comparison claimed.'
    else:row['viewportComparison']='Native legacy screenshot unavailable; no fabricated OLD capture. Supplementary Web evidence, where shown, is not a matched native comparison.'
extras=[]
for name,p in [('Active Walk candidate (not approved)',R/'docs/qa/screen-14/screenshots/standard-en.png'),('Custom planner preview (retained)',None),('Photo Credits / guest',R/'docs/qa/photo-credits/screenshots/credits-en.png'),('Small Explore DE',R/'docs/qa/screen-10-refinement/screenshots/small-de.png'),('Small Walking Routes DE',R/'docs/qa/screen-12/screenshots/small-de.png'),('Small Route Preview DE',R/'docs/qa/screen-13-refinement/screenshots/small-de.png'),('Small Route Preview scroll',R/'docs/qa/screen-13-refinement/screenshots/small-scroll-de.png')]:
    if p and p.is_file():extras.append({'title':name,'image':asset(p,'extra-'+str(len(extras))+'.png','archived-extra',None,'Archived evidence; not recaptured or a new approval.')})
js('screen-registry.json',rows);js('screenshot-provenance.json',images)

routes=json.loads((O/'current-route-files.json').read_text())
presence=json.loads((O/'branch-route-presence.json').read_text())
worktrees=json.loads((O/'worktrees.json').read_text())
history=json.loads((O/'history-route-paths.json').read_text())
def route(path):
    s=path.removeprefix('mobile/src/app/').removeprefix('src/app/')
    s=re.sub(r'(^|/)\([^/]+\)/',r'\1',s)
    s=re.sub(r'/(page|index)\.(tsx|ts|jsx|js)$','',s)
    s=re.sub(r'^(page|index)\.(tsx|ts|jsx|js)$','',s)
    s=re.sub(r'\.(tsx|ts|jsx|js)$','',s)
    return '/'+re.sub(r'\[([^]]+)\]',r':\1',s)
native_names={'/':'Home / city selection variant','/welcome':'01 Global Welcome','/introduction':'02 Product Value Story','/account':'03 Account + management/forms','/city/:citySlug':'09 City Hub','/city/:citySlug/explore':'10 Explore Places','/city/:citySlug/place/:placeSlug':'11 Place Detail / candidate Active Walk context','/city/:citySlug/tour/:tourSlug':'13 Route Preview','/city/:citySlug/routes':'12 Walking Routes','/city/:citySlug/walk':'05–08 + custom planner/preview/active/finish','/city/:citySlug/search':'City Search + recent searches','/city/:citySlug/assistant':'City-wide Guide unavailable / supported fallback','/city/:citySlug/guide/:placeSlug':'Place-scoped Guide','/saved':'Saved Places + Trips variant','/profile':'Profile / settings entry','/premium':'Premium / native offering and basic exit','/legal':'Legal menu','/photo-credits':'Guest Photo Credits','/open/:citySlug/:marketingSlug':'Shared marketing/native app entry resolver'}
inventory=[]
for p in routes:
    s=(R/p).read_text(); fn=re.search(r'export default (?:async )?function\s+(\w+)',s)
    rt=route(p);platform='iOS + Android' if p.startswith('mobile/') else 'Admin Web' if '/admin/' in p else 'Public Web'
    title=native_names.get(rt,rt) if platform=='iOS + Android' else rt
    status='Existing legacy implementation / preserved'
    if platform=='iOS + Android' and any(x['source']==p for x in rows):status='Approved redesign; functional verification pending; retained modes noted separately'
    if 'landing-preview/' in p: status='Experimental older landing preview; not canonical homepage'
    if '/admin/(protected)/[section]/' in p:status='Functionally incomplete / protected placeholder for configured fallback sections'
    if rt.endswith('/assistant'):status='Functionally incomplete city-wide answers; honest supported fallback'
    if '/open/' in p or '/city/[citySlug]/[marketingSlug]' in p:status='Existing deep-link/share resolver; availability/configuration dependent'
    reach='File route exists; protected by staff auth/capability; runtime acceptance not performed' if platform=='Admin Web' else 'File route exists; incoming link/runtime status must be interpreted with route modes'
    if rt=='/welcome' and platform=='iOS + Android':reach='Explicit deep link; not normal launch. Incoming fallback from selection/story; launch bypass confirmed.'
    if rt=='/introduction' and platform=='iOS + Android':reach='Verified from Welcome; normal launch bypasses Welcome.'
    if rt=='/city/:citySlug/routes' and platform=='iOS + Android':reach='Preview → All walking routes; direct deep link verified; no direct Hub collection entry.'
    wt=[]
    for w in worktrees:
        root=Path(w.get('worktree','/nonexistent'))
        if w['exists'] and (root/p).is_file():wt.append({'path':str(root),'branch':w.get('branch','DETACHED'),'head':w.get('HEAD'),'sha256':sha(root/p)})
    inventory.append({'id':('N' if platform=='iOS + Android' else 'A' if platform=='Admin Web' else 'W')+f'-{len(inventory)+1:02}', 'name':title,'route':rt,'source':p,'component':fn[1] if fn else 'default export; inspect source snapshot','platform':platform,'version':BRANCH+' @ dirty source snapshot','status':status,'reachable':reach,'sourceSha256':sha(R/p),'refs':presence.get(p,[]),'worktrees':wt})
js('route-inventory.json',inventory)
other=[]
for p in sorted(set(history)-set(routes)):
    commit=git('log','--all','-1','--format=%H','--',p)
    refs=presence.get(p,[])
    other.append({'path':p,'route':route(p),'status':'Other branch/worktree route' if refs else 'Git history only; no current ref-head route identified','refs':refs,'latestPathChangeCommit':commit,'worktrees':[w for w in worktrees if w['exists'] and (Path(w['worktree'])/p).is_file()]})
js('other-branch-history-screens.json',other)

# Exact code edges, including route-mode distinctions; never infer chronological design order.
edges=[
('App launch','Home /','Default Expo index; Welcome does not replace root',app+'_layout.tsx'),
('01 /welcome','02 /introduction','Get Started',app+'welcome.tsx'),
('01 /welcome','04 /?section=cities','Explore Cities',app+'welcome.tsx'),
('02 /introduction','03 /account?onboarding=1','Next',app+'introduction.tsx'),
('02 /introduction','04 /?section=cities','Explore Cities',app+'introduction.tsx'),
('03 onboarding account','04 /?section=cities','Guest leave; authentication optional',app+'account/index.tsx'),
('04 selection','09 /city/:citySlug','Available city only',app+'index.tsx'),
('Home /','04 /?section=cities','Explore tab; focused selection variant','mobile/src/components/NativeChrome.tsx'),
('09 City Hub','05 /walk interests','Build My Walk when no retained journey',city+'index.tsx'),
('09 City Hub','Custom preview / active','Build My Walk restores current city journey instead of new draft',flow),
('05 Interests','06 Available Time','Continue / Skip; same mounted controller',flow),
('06 Available Time','07 Location','Continue / Skip current budget',flow),
('07 Location','08 First Experience','Explicit permission success OR Not now',flow),
('08 First Experience','09 City Hub','Explore city; returnToPlanner=1, planner kept underneath',flow),
('09 returnToPlanner=1','Planner interests/walking (step 2)','Build My Walk goes back when stack exists',city+'index.tsx'),
('Planner interests/walking (step 2)','Planner start/end (step 3)','Continue; next manual/GPS start, end/loop constraints',flow),
('Planner start/end (step 3)','Custom preview','Explicit Build → shared planner → persistCurrentWalk preview',flow),
('Custom preview','Custom Active Walk','Explicit Start Walk; separate from curated route',flow),
('Custom Active Walk','Custom finished','Manual progression/end and feedback/save/share',flow),
('09 City Hub','10 Explore Places','Explore places; Near me sorts after optional location',city+'index.tsx'),
('09 City Hub','City Assistant fallback','Ask CITYWALK; no city-wide answer contract',city+'assistant.tsx'),
('09 City Hub','13 Route Preview','Suggested route',city+'index.tsx'),
('13 Route Preview','12 Walking Routes','All walking routes; reverse collection discovery',city+'tour/[tourSlug].tsx'),
('12 Walking Routes','13 Route Preview','Select published route',city+'routes.tsx'),
('13 Route Preview','11 Place Detail','Stop/detail links without trip context',city+'tour/[tourSlug].tsx'),
('13 Route Preview','Candidate Active Walk (unapproved)','Start Walk → place URL with published trip context',city+'tour/[tourSlug].tsx'),
('10 Explore Places','City Search','Search entry opens separate route',city+'explore.tsx'),
('10 Explore Places','11 Place Detail','Place link; saves/adds are distinct actions',city+'explore.tsx'),
('City Search','11 Place Detail','Place selection with city recent search history',city+'search.tsx'),
('11 Place Detail','Place-scoped Guide','Eligibility-gated Ask CITYWALK',city+'place/[placeSlug].tsx'),
('11 Place Detail','Custom planner','Add to my walk integrates current draft/journey',city+'place/[placeSlug].tsx'),
('Trips tab','/saved?view=trips','Custom active/saved/legacy walks; not a route catalog',app+'saved.tsx'),
('Saved tab','/saved','Place favorites and saved walks view',app+'saved.tsx'),
('Profile tab','/profile → /account','Profile summary / account management',app+'profile.tsx'),
('Profile','Legal → Photo Credits','Guest accessible; external legal publication policy separate',app+'legal.tsx'),
('Premium','Account / native purchase','Only purchase entitlement flow needs sign-in; basic discovery exit retained',app+'premium.tsx')]
js('navigation-edges.json',[{'from':a,'to':b,'trigger':c,'source':d} for a,b,c,d in edges])

gaps=[
('F01','P1','Launch bypass / missing onboarding policy','Normal launch is / Home. Welcome is explicitly a visual-review route; no persisted first-run/revisit gate. This is a confirmed bypass, not proof Welcome is unreachable.',line(app+'welcome.tsx','Visual-review'),'Decide optional first-entry policy; preserve deep links and returning walks.'),
('F02','P1','Numbered flow differs from actual flow','04 → 09 → Build → 05–08 → 09 → retained planner. Design IDs must remain unchanged. This is not an eight-screen mandatory wizard.',line(flow,'return <FirstExperience'),'Decide whether confirmation detour should remain; no automatic flow rewrite.'),
('F03','P1','Duration semantics inconsistent across discovery and preview','Live Hub and Walking Routes advertise 45 min; Preview correctly shows 120 min at stops and unverified walking/total. List filters consume the ambiguous 45-minute field.',line('mobile/src/lib/publishedRoutes.ts','estimatedDurationMinutes'),'Editorial/source owner must establish scoped duration; then shared display/filter contract regression.'),
('F04','P1','Guest personalization not used in Hub recommendations','Hub reads accountInterests only when userId matches. NativeWalkFlow holds guest selections in its own mounted state; no durable guest preference handoff to recommendations.',line(city+'index.tsx','cityHubRecommendations(tours'),'Choose ownership of guest defaults and recommendation inputs without duplicating planner state.'),
('F05','P1','Unbuilt drafts are not durable','Screen 08 retains draft via native stack. Build/resume journeys persist; unbuilt interests/return-by/location and completion flags do not have a durable draft contract.',line(flow,'firstExperienceComplete, setFirstExperienceComplete'),'Accept session-only draft or authorize a tested shared draft contract; never describe as process-safe.'),
('F06','P2','Collection entry inversion','Only /tour preview contains a navigation reference to /routes in current native code. Hub can open a specific preview; collection discovery comes afterward.',line(city+'tour/[tourSlug].tsx','/city/[citySlug]/routes'),'Decide explicit route-collection entry while preserving approved visuals.'),
('F07','P1','Active-walk modes share Place route and differ in persistence','Published trip context dispatches to unapproved PublishedActiveWalk. Ordinary places remain Screen 11; custom journeys use NativeWalkFlow. Saved/Trips loads custom/legacy saved walks, not curatedProgressStorage.',line(city+'place/[placeSlug].tsx','publishedTrip?.source'),'Review unapproved candidate and resume/Trips discovery before consolidation; do not merge models blindly.'),
('F08','P2','Repeated preferences and Skip semantics','Confirmed repeated question: Screen 05 selects interests, but after 08 returns through Hub, the retained planner step 2 renders the legacy interests grid again (same state), plus categories/walking pace. Step 3 then asks manual/GPS start/end. Available Time Skip advances with current/default budget; rebuild resets interests/time.',line(flow,'label={t.interests}'),'Decide whether the second interests entry should be editing-only; preserve categories/walking controls and choose Skip/default semantics.'),
('F09','P2','Home / Explore tab semantics are conditional','/ has Home; /?section=cities and /city/:citySlug have Explore. /walk and /tour have Trips. /routes currently falls through to Explore. This differs from catalog/preview tab expectations but is not a proven crash.',line('mobile/src/lib/tabNavigation.tsx','return path.endsWith'),'Approve tab ownership before any route/active-tab changes.'),
('F10','P2','Multiple search/filter presentations','Hub places filters, Explore list/map and dedicated Search/recent history overlap. Search limits visible matches to 12; Explore is full catalog. Removal would lose capabilities.',line(city+'search.tsx','matches.slice(0, 12)'),'Merge best capabilities only after search/history/category/map regression matrix.'),
('F11','P1','Guide/audio claims remain availability bounded','City Assistant is explicitly unavailable with a place-discovery fallback. Real Guide is place-scoped. English Holstentor capture has no English audio; no substituted-locale playback.',line(city+'assistant.tsx','cityAssistantUnavailable'),'Keep honest capability-specific paths; verify deployed provider/locale integration separately.'),
('F12','P1','Photography and attribution coverage incomplete','Recorded audit: 20 missing POI images + four unverified legacy assets, all excluded/fallbacks. Current Explore still contains adjacent licensed text; Detail uses central Photo Credits. No new license compliance opinion established by this audit.',line(city+'explore.tsx','explorePhotography'),'Preserve source/license metadata and per-license handling; approved asset acquisition is a separate task.'),
('F13','P1','Snapshot is behind current integration branches','Redesign base 98a1… differs from live develop 9f847…; #449/#450/#452 merged separately. Some #450 progress was locally reused, but branch ancestry and partial copies do not prove all backend/shared/native contracts are integrated. #454 remains a separate open selected-place UI PR.', 'github-evidence.json; refs.json; branch-route-versions.json','No-loss source→successor comparison and exact revision regression required before any merge; preserve independent worktrees.'),
('F14','P2','Legacy selected-city assumptions remain outside redesigned flow','Authenticated /account has a city pass card/link explicitly for lubeck. Dynamic city context in 04/09/10 does not make that legacy account area globally city-aware.',line(app+'account/index.tsx','citySlug: "lubeck"'),'Choose account/pass scoping independently; do not modify commerce in this audit.'),
('F15','P1','Product-wide device/back/provider acceptance is incomplete','Historical reports document tests/simulator evidence with unverified Android devices, physical VoiceOver/TalkBack, live OAuth/email/purchases, process-death draft behavior and full back-stack traversal. Audit captures do not close these gates.','docs/qa/screen-14/REPORT.md; docs/qa/onboarding-screen-03-polish/README.md','Require explicit per-platform, guest/account, locale, restart and provider acceptance before removal or release.')]
js('functional-findings.json',[dict(zip(['id','priority','title','evidence','source','recommendation'],x)) for x in gaps])

duplicates=[
('D01','Home vs focused City Selection','/ and /?section=cities; same HomeScreen','Original featured/global discovery and tabs','Focused approved selection with search/location','Do not drop launch/returning-user discovery','MERGE BEST OF BOTH'),
('D02','General account chooser vs onboarding account','/account vs /account?onboarding=1','Full lifecycle/profile management and context returns','Approved guest reassurance and premium chooser','Preserve Better Auth, recovery, deletion and configured provider gates','MERGE BEST OF BOTH'),
('D03','Interests/defaults across account/planner/onboarding','Account preferences, NativeWalkFlow steps, SelectInterests','Shared supported taxonomy and per-walk configuration','Accessible optional selection','Guest defaults / draft / account scope needs explicit ownership','MERGE BEST OF BOTH'),
('D04','Duration/deadline entry variants','AvailableTime + planner/time picker + account defaults','Existing walking/deadline calculation','Approved accessible cards, fixed restoration','No durable unbuilt draft or scoped published-duration semantics','MERGE BEST OF BOTH'),
('D05','Location affordances','Explanation, manual builder, map controls, Near me','Manual fallback and existing permission system','Clear explicit optional explanation','Avoid repeated prompts; never remove manual start/end','MERGE BEST OF BOTH'),
('D06','Hub places vs Explore vs Search','Hub list/map; Explore list/map; Search recent history','Broad discoverability and recent history','Approved premium city and POI hierarchy','Search result caps/history and map state are not identical','MERGE BEST OF BOTH'),
('D07','Embedded tour collection vs Walking Routes','Hub TourCard vs /routes','Immediate route entry','Filters and dedicated collection','No direct Hub collection link; ambiguous duration filters','MERGE BEST OF BOTH'),
('D08','Published preview vs custom preview','/tour/:tourSlug vs /walk stage preview','Custom time/finish/adaptation constraints','Curated editorial stop order and approved map','Legitimate distinct domains; share presentation primitives only','MERGE BEST OF BOTH'),
('D09','Published Active Walk vs custom Active Walk','PublishedActiveWalk vs NativeWalkFlow active','Custom saved journey/adaptation/finish','Device-local curated manual progress/pause/restore','No shared street routing; curated Trips discovery incomplete','MERGE BEST OF BOTH'),
('D10','City Assistant fallback vs place Guide','/assistant vs /guide/:placeSlug','Grounded place context and eligibility','Honest unavailable city-wide fallback','Never replace fallback with fake city-wide answer','KEEP OLD'),
('D11','Trips vs Saved tabs','/saved?view=trips vs /saved','Existing local/account/legacy saved walk handling','Same existing source; no new approved redesign','Legitimate filtered modes, not duplicate stores','KEEP OLD'),
('D12','Generic vs Lübeck-specific Web city/place routes','/[locale]/[citySlug] vs /[locale]/lubeck; analogous place routes','Existing local editorial and completion behavior','Generic city-scoped server wrappers / CityExperience reuse','Audit analytics, canonical SEO, audio/commerce before any redirect','MERGE BEST OF BOTH'),
('D13','Homepage / landing preview versions','/ vs /landing-next-preview vs /landing-preview; history Coming Soon','Approved landing-next shared composition','Current homepage and intentional noindex preview','Closed unmerged historical PR metadata is not permission to revive rejected Coming Soon','REMOVE CANDIDATE'),
('D14','Place detail vs published execution route mode','Same /place URL; ordinary vs published trip context','Full content, sources, audio, directions','Candidate progress-first interface; no visual approval','Review route intent/resume/deep-link/back guarantees','REBUILD FLOW')]
js('duplicate-candidates.json',[dict(zip(['id','flow','implementations','oldStrengths','newStrengths','missingFeatures','recommendation'],x),decision='PENDING') for x in duplicates])

embedded=[
('N-HOME','Original Home / featured cities',app+'index.tsx','/ without section=cities','Retained legacy; observed native'),
('N-SEARCH','Search / recent / empty results',city+'search.tsx','/city/:citySlug/search','Existing; Explore search opens this route'),
('N-GUIDE','Place-scoped Guide / eligibility / errors',city+'guide/[placeSlug].tsx','/city/:citySlug/guide/:placeSlug','Existing; backend/source/entitlement gated'),
('N-ASSISTANT','City Guide fallback',city+'assistant.tsx','/city/:citySlug/assistant','Unavailable city-wide answers, useful fallback; not working city-wide chat'),
('N-PLAN2','Repeated interests + categories + walking pace',flow,'/city/:citySlug/walk; plan step 2 after 08','Retained legacy form asks interests again after Screen 05; same state'),
('N-PLAN3','Manual/GPS start + finish/loop/destination',flow,'/city/:citySlug/walk; plan step 3','Retained walking return/start/finish constraints'),
('N-BUILD','Build loading / no eligible results / errors',flow,'/city/:citySlug/walk; building / buildError','Real planner states, not new routes'),
('N-PREVIEW','Custom planned walk preview',flow,'/city/:citySlug/walk; preview','Existing estimates/adaptation; not official published-route Screen 13'),
('N-ACTIVE','Custom basic / premium live Active Walk',flow,'/city/:citySlug/walk; active','Existing manual/adaptive/live system; premium claims require integration/device acceptance'),
('N-FINISH','Custom finish / feedback / share / save',flow,'/city/:citySlug/walk; finished','Existing; branch variants contain additional Finish Walk drafts'),
('N-ADAPT','Add / take back / proposal / rebuild confirmation',flow,'/city/:citySlug/walk; panel or modal','Existing shared planner adaptation; no street-routing promise'),
('N-CURATED','Active Walk candidate (unapproved Screen 14)','mobile/src/components/PublishedActiveWalk.tsx','/city/:citySlug/place/:placeSlug + tripSource=published','Local unapproved implementation; not one of approved 01–13'),
('N-SAVED','Saved places and empty/error states',app+'saved.tsx','/saved','Existing guest local saves + account paths'),
('N-TRIPS','Current / saved / completed / legacy trips',app+'saved.tsx','/saved?view=trips','Same component, filtered mode; curated progress not enumerated here'),
('N-PROFILE','Profile summary / account/preferences links',app+'profile.tsx','/profile','Existing; Settings not a separate native file route'),
('N-ACCOUNT','General account / authenticated management',app+'account/index.tsx','/account','Retained legacy presentation and lifecycle'),
('N-SIGNUP','Email sign-up',app+'account/index.tsx','/account?entry=sign-up; optional onboarding=1','Existing Better Auth; real provider acceptance pending'),
('N-SIGNIN','Email sign-in',app+'account/index.tsx','/account?entry=sign-in; optional onboarding=1','Existing; auth is not discovery gate'),
('N-RECOVER','Recovery / verify-email resend / auth notices',app+'account/index.tsx','/account; entry=reset and feedback states','Existing internal modes, not separate routes'),
('N-EDIT','Profile editing',app+'account/index.tsx','/account; authenticated entry=edit','Existing account-only'),
('N-PREF','Saved traveler defaults',app+'account/index.tsx','/account; authenticated entry=preferences','Existing account-only defaults, not unbuilt guest draft'),
('N-PASSWORD','Password management',app+'account/index.tsx','/account; authenticated entry=change-password','Existing protected lifecycle'),
('N-DELETE','Account deletion confirmation',app+'account/index.tsx','/account?entry=delete','Existing consequential action; audit did not invoke'),
('N-PREMIUM','Premium / native billing offering / sign-in/basic exit',app+'premium.tsx','/premium + RevenueCatPremiumCard','Separate native premium offering from one-time City Pass; provider/config gated'),
('N-CITYPASS','City Pass entitlement / purchase status','mobile/src/app/account/index.tsx','/account; passState and relevant place premium eligibility','No new dedicated native City Pass detail/purchase-success route identified; Web has /pass and /account/purchases'),
('N-LEGAL','Legal/help destinations',app+'legal.tsx','/legal','Guest legal menu; external operator-publication approval still distinct'),
('N-CREDITS','Photo Credits / localized license links',app+'photo-credits.tsx','/photo-credits','Guest central record; minimum adjacent credits remain where implemented'),
('N-OPEN','Campaign/native deep-link resolver',app+'open/[citySlug]/[marketingSlug].tsx','/open/:citySlug/:marketingSlug','Existing city-scoped resolver; not onboarding'),
('N-AUDIO','Audio playback / missing locale / failure','mobile/src/components/NativeAudioPlayer.tsx','Place Detail exact-locale section','Reusable capability; not duplicate screen'),
('N-SAVEGATE','Optional account save gate','mobile/src/components/SaveAccountGate.tsx','Planner save modal','Guest basic discovery remains available'),
('N-LANGUAGE','Language menu','mobile/src/components/LocaleSelector.tsx','Shared modal','Shared component; not independent Settings route'),
('W-PLAN','Web planner start/time/interests/start-end','src/components/walk/WalkPlanner.tsx','Inside localized city experience','Preserved Web capability; not required native mirror'),
('W-JOURNEY','Web preview / active / finish / adaptation','src/components/walk/WalkJourney.tsx','Inside localized city experience','Existing browser state; separate native device acceptance'),
('W-OLDPLANNER','Legacy custom tour planner / builder','src/components/travel/CustomTourPlanner.tsx','Component usage must be checked; see component-usage.json','Legacy overlapping component, not independent file route'),
('W-DISCOVERY','Web list/map/place category browsing','src/components/travel/PlaceDiscovery.tsx','Inside CityExperience','Legitimate shared product presentation'),
('W-GUIDE','Web place Guide','src/components/AskGuide.tsx','Inside place page','Place-grounded content; provider acceptance unverified'),
('W-COMMERCE','City Pass paywall / checkout / purchases','src/components/commerce/CityPassPaywall.tsx','/:locale/pass/:citySlug and /:locale/account/purchases','€4.99/72h one-time rules preserved; no transaction tested'),
('W-AUTH','Traveler auth / reset / account lifecycle','src/components/account/TravelerAccountPanel.tsx','/:locale/account + /account/reset-password','Existing; separate staff identity'),
('W-LEGAL','Legal unavailable / support / consent states','src/components/legal/LegalPage.tsx','/imprint, /privacy, /terms, /support','Publication gates retained'),
('A-FORMS','Admin entity editors/media/translation/marketing workflows','src/components/admin/AdminContentForms.tsx','See 28 Admin route rows','Staff capability enforced; no runtime staff login attempted'),
('A-PLACEHOLDER','Admin generic protected section','src/app/admin/(protected)/[section]/page.tsx','/admin/:section (configured sections only)','Confirmed Protected placeholder body; do not call full CMS implementation')]
js('embedded-screen-states.json',[dict(zip(['id','name','source','route','status'],x)) for x in embedded])
usage={}
for target in ['CustomTourPlanner','TourBuilder','WalkPlanner','WalkJourney','CityExperience','PublishedActiveWalk']:
    result=git('grep','-n',target,'--','mobile/src','src')
    usage[target]=[l for l in result.splitlines() if '.test.' not in l and '/tests/' not in l]
js('component-usage.json',usage)

counts={'currentRouteEntries':len(routes),'nativeRouteEntries':sum(x['platform']=='iOS + Android' for x in inventory),'publicWebRouteEntries':sum(x['platform']=='Public Web' for x in inventory),'adminWebRouteEntries':sum(x['platform']=='Admin Web' for x in inventory),'additionalHistoricalOrOtherBranchPaths':len(other),'allDiscoveredRouteFilePaths':len(set(routes)|set(history)),'embeddedStateGroups':len(embedded),'officialDesignScreens':13,'duplicateCandidateGroups':len(duplicates),'flowInconsistenciesAndGaps':len(gaps),'confirmedUnreachableRoutes':0,'confirmedLaunchBypassedDesignScreens':2,'screenDecisionsPending':13,'additionalFlowDecisionsPending':len(duplicates),'allReviewDecisionsPending':13+len(duplicates),'freshCurrentNativeCaptures':sum(x['kind']=='fresh-current-native' for x in images),'nativeOldComparisonCaptures':sum(x['kind'] in ['retained-legacy-native','archived-before-native'] for x in images),'refsRead':len(json.loads((O/'refs.json').read_text())),'worktreesPreserved':len(worktrees)}
js('counts.json',counts)

header=f'''# CITYWALK screen and flow audit

Completed **28 October 2026, Europe/Berlin**; discovery began 27 October (directory name retained). Read-only product audit. Only this dedicated report directory is generated. No source edits, checkout switching, consolidation, commit, push, merge or deployment.

Current redesign: `{BRANCH}`, worktree `{R}`, base `{BASE}` plus existing uncommitted/untracked implementation. Base SHA alone does **not** identify the approved designs; current source hashes and snapshots are preserved here. Screens **01–13 are visually approved by the owner**, with functional verification pending where documented. Candidate Active Walk (14) exists from preceding work and remains **unapproved**; this audit does not extend it.

Native is Mobile Core; Public Web is acquisition/SEO/sharing/legal/intentional existing preview, not an automatic native mirror; Admin Web is staff operations. Independent Marketing SaaS branches are excluded from CITYWALK route counts, while CITYWALK internal Admin marketing is included.

Live remote refs read: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main `88191e77e55a489804c49bccccf6307b5876b41d`. No fetch/merge was performed. Locally available refs/history may not equal every remote branch ever created. See `github-evidence.json`, `refs.json`, `worktrees.json`, branch-route indexes and source snapshots. Exact-head CI/device/deployment status is not inferred from source presence.
'''
summary=f'''## Counts and definitions

- **{len(routes)} current route-file entries**: 19 native, 21 Public Web, 28 Admin Web. Dynamic parameters and query/state variants are not multiplied into imaginary routes.
- **{len(other)} additional historical/other-branch route paths**; **{counts['allDiscoveredRouteFilePaths']} distinct discovered CITYWALK route-file paths** in the audited local history/ref scope. Not all are active simultaneously; static/dynamic route overlaps need precedence analysis.
- **{len(embedded)} embedded state/capability groups** separately inventoried, not added to route totals; in addition to the official 05–08 states mapped in the registry; these groups include auth forms, preview/active/finish and settings-related modes.
- **{len(duplicates)} duplicate/overlap candidate groups**; these are advisory comparisons, including legitimate reuse—not 14 deletions.
- **0 confirmed completely unreachable current file routes**. This is not a claim of complete reachability. 01 and 02 are confirmed bypassed by normal launch; 12 has reverse collection discovery. Deep links, feature/permission/auth gates and Admin acceptance remain conditional/unverified.
- **{len(gaps)} findings** (flow inconsistencies and functional/evidence gaps), individually identified F01–F15.
- **13 screen choices + {len(duplicates)} flow choices = {13+len(duplicates)} review decisions**, all PENDING. The 13 design IDs remain unchanged.

## Evidence limits

13 fresh current native captures at 402×874 points; language/scale and original pixel dimensions recorded in `screenshot-provenance.json`. Four OLD native comparisons are available: two retained current legacy variants (03/04), two archived before captures (11/13). Other native OLD captures are unavailable or no original equivalent exists. Supplemental Web screenshots are explicitly marked Web and never substituted as native. Earlier report links to absent screenshots are not evidence of a present image. No fabricated legacy renders or screenshot-based performance claims. Archived capture provenance does not establish an exact binary hash. Current source snapshots are hash-identified; visual approval remains the owner's historical decision.

Audit-only verification: file/source/hash/link/gallery checks and observational simulator navigation. Historical tests in prior reports are retained evidence, not rerun or new end-to-end acceptance. No DB, provider, payment, server-write or full product test gate was run for this documentation-only task.
'''

registry='| ID | Official screen | Exact source / component | Native route or internal state | Branch/worktree | Status |\n|---|---|---|---|---|---|\n'
for r in rows:registry+=f"| {r['id']} | {r['name']} | {link(r['source'])}<br>{r['component']} | `{r['route']}` | `{BRANCH}`<br>same isolated worktree above | {r['status']} |\n"
save('SCREEN-REGISTRY.md',header+'\n## Official 13-row registry\n\n'+registry+'\nDesign IDs are immutable. Sources/old versions/screenshots/function comparisons are in [OLD-VS-NEW.md](OLD-VS-NEW.md) and [review.html](review.html).')

inv=header+'\n'+summary+'\n## Current route inventory\n\n| ID | Screen/route | Source / component | Platform | Version/status | Reachable |\n|---|---|---|---|---|---|\n'
for r in inventory:inv+=f"| {r['id']} | `{r['route']}` · {r['name']} | {link(r['source'])}<br>{r['component']} | {r['platform']} | {r['status']} | {r['reachable']} |\n"
inv+='\n## Embedded screens, states and missing standalone destinations\n\nThese are actual states/capabilities rather than additional route files. There is **no standalone native Settings, City Pass Details, purchase-success or curated-completion history route identified** in this checkout; related capabilities are embedded/conditional. This is not permission to implement them. All other current route rows above are outside the official numbered set unless explicitly mapped.\n\n| ID | Screen/state | Exact source | Route / state | Classification |\n|---|---|---|---|---|\n'
for a,b,c,d,e in embedded:inv+=f'| {a} | {b} | {link(c)} | `{d}` | {e} |\n'
inv+='\n## Other branches and Git-history-only paths\n\nEach path is preserved; branch lists/SHAs and active worktree locations are machine-readable in `other-branch-history-screens.json`. Ref-head source versions are in `branch-route-versions.json`. No history-only implementation was checked out or declared obsolete.\n\n| Source | Route | Availability / example ref | Latest path-change commit |\n|---|---|---|---|\n'
for r in other:inv+=f"| `{r['path']}` | `{r['route']}` | {r['status']}; `{next(iter(r['refs']), 'no current head identified')}` | `{r['latestPathChangeCommit']}` |\n"
inv+='\n## Worktree / branch preservation\n\n47 registered worktrees (37 existing paths, 10 missing/prunable entries at observation); no pruning. Full exact paths, heads and branches in `worktrees.json`. 405 local/ref entries, 351 distinct head commits were read. For every current route, `route-inventory.json` maps existing worktree source hashes and branches; `branch-route-versions.json` maps distinct committed blobs across refs. Different hashes are versions—not automatic duplicates to delete. Git-history path scan includes additions/deletions across all locally available refs; private/unfetched history may exist.\n'
save('SCREEN-INVENTORY.md',inv)

comp=header+'\n'+summary+'\n## Screen 01–13 — OLD vs NEW\n'
for r in rows:
    comp+=f"\n### Screen {r['id']} — {r['name']} — OLD vs NEW\n\n**{r['status']}** · **USER DECISION: PENDING**\n\nNEW: {link(r['source'])}; `{r['component']}`; `{r['route']}`. `{BRANCH}` / `{R}` / base `{BASE}` + hashed dirty source.\n\n"
    comp+=f"OLD: {link(r['oldSource'])}; `{r['oldComponent']}`; `{r['oldRoute']}`. Baseline source `{BASE}` in the same branch history; retained variant where stated.\n\n" if r['oldSource'] else 'OLD: **No legacy equivalent identified**. Exact old source/route/branch: not applicable. Earlier redesign iterations are not treated as original legacy.\n\n'
    for k,label in [('oldImage','OLD native'),('newImage','NEW native'),('supplement','Supplementary legacy WEB—not native OLD')]:
        im=r[k]
        comp+=f"![{label} Screen {r['id']}]({im['path']})\n\n{label}: {im['width']}×{im['height']} pixels. {im['notes']}\n\n" if im else (f'{label}: unavailable.\n\n' if k=='oldImage' else '')
    comp+=f"Viewport comparison: {r['viewportComparison']}\n\n- **Old functionality:** {r['oldFunctionality']}\n- **New functionality:** {r['newFunctionality']}\n- **Functional gaps:** {r['functionalGaps']}\n- **UX differences:** {r['uxDifferences']}\n- **Recommendation:** {r['recommendation']} (advisory; preserve approved visuals and necessary old capabilities).\n- **Accessibility/performance:** native labels/selected states and historical layout tests exist; full physical assistive-technology acceptance and performance measurements are unverified. Screenshots cannot prove these.\n- **USER DECISION: PENDING**\n"
save('OLD-VS-NEW.md',comp)

du=header+'\n## Duplicate and overlapping flows\n\n'+summary+'\n| ID | Screen / flow | Exact implementations | Classification | Recommendation | USER DECISION |\n|---|---|---|---|---|---|\n'
for a,b,c,d,e,f,g in duplicates:du+=f'| {a} | {b} | {c} | Overlap candidate; preserve distinct contracts | {g} | PENDING |\n'
du+='\n## Legitimate reuse that should not be mistaken for duplication\n\n- 05–08 are views in one `NativeWalkFlow` owner; extracting their visuals did not create new APIs or stores.\n- `/saved` query modes share implementation, not two saved stores. Account/local/legacy data coexist intentionally and need migration tests before simplification.\n- Curated published stop order and personalized builder adaptation are different domain concepts; do not collapse them into one route schema.\n- Public Web versus iOS/Android is a deliberate architecture boundary (#136); no automatic native parity rebuild on Web.\n- CityExperience/PlacePageContent reuse across generic and local Web wrappers is distinct from duplicate backend content.\n- Staff CMS identity is separate from traveler Better Auth, and independent Marketing SaaS is a different product.\n\n## Candidate components with no proven rendered entry\n\n`component-usage.json` records current tracked source references to CustomTourPlanner, TourBuilder, WalkPlanner, WalkJourney, CityExperience and PublishedActiveWalk. A file without a proven incoming rendered reference is a component investigation candidate, not a confirmed unreachable user-facing file route. Do not delete it based on text search alone.\n'
save('DUPLICATE-SCREENS.md',du)

mermaid='''flowchart TD
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
'''
save('flow.mmd',mermaid)
uf=header+'\n## Actual code-derived flow\n\n```mermaid\n'+mermaid+'```\n\nThe diagram is a discovery map, not a mandatory linear journey. 05–08 share the walk route; 09 can be reached before them. Auth and location remain optional. No walk starts by viewing 13. Standard native observations confirmed 01→02→03 guest exit→04→09 and 05→06→07 Not now→08 on a separate existing clean-draft simulator. Another simulator restored its current custom preview from Build My Walk. No current walk was discarded; no new route was generated or started.\n\n## Onboarding versus main app tabs\n\nOnboarding is the Welcome/Story/account-selection routes and planner-internal introductory states, **not a separate eight-route stack**. Current app uses a Stack plus shared `NativeBottomNavigation`; these are five navigation actions, not a filesystem tab navigator. Exact targets: Home `/`; Explore city-aware `/city/:citySlug/explore` else `/?section=cities`; Trips `/saved?view=trips`; Saved `/saved`; Profile `/profile`. `activeNativeTab` treats Hub/Places/list as Explore and walk/tour as Trips. Numbered design IDs never determine tab ownership.\n\n## Edges and triggers\n\n| From | To | Trigger / condition | Source |\n|---|---|---|---|\n'
for a,b,c,d in edges:uf+=f'| {a} | {b} | {c} | {link(d)} |\n'
uf+='\n## Back, skipped, repeated, disconnected\n\n- 01/02: normal launch bypass confirmed; both reachable through explicit Welcome flow. Selection has a fallback to Welcome. Not proven unreachable.\n- 03: guest exit intentionally replaces discovery; no forced sign-in. Email/provider server acceptance remains separate.\n- 05–08: returning walk bypasses these states; Back handlers explicitly step backward. Location denial/Not now does not block continuation. First Experience retains one mounted planner and creates a Hub detour. Returning via unrelated tab/deep-link or process restart is not durable draft restoration.\n- 12: direct deep link works; normal native source entry is from 13. No Hub-to-collection link found.\n- 11 and candidate 14 share one URL with different trip params; back semantics must be preserved before consolidating.\n- Custom finish/saved/share, authenticated account lifecycle and Admin publication flows exist beyond the storyboard; removing them as “extra screens” would remove functionality.\n- No comprehensive dead-end/back-stack proof from this observational audit. Staff, feature-gated and historical routes remain unverified rather than falsely labeled broken/unreachable.\n'
save('USER-FLOW-MAP.md',uf)

fg=header+'\n## Functional gaps and flow inconsistencies\n\nThese distinguish observed defects, designed limitations and evidence gaps. No unsupported numbers or features have been added.\n'
for a,b,c,d,e,f in gaps:fg+=f'\n### {a} · {b} · {c}\n\n{d}\n\nEvidence: `{e}`.\n\nAdvisory next step: {f}\n'
fg+='\n## Old capability retention checklist\n\n- Email/OAuth/recovery/deletion/password/account defaults remain in the old account source and must survive chooser consolidation.\n- Manual start/end/loop, walking preference, categories, deadline/return-leg estimation and custom route adaptation remain after 05–08. Do not replace the controller with visual-only onboarding.\n- Search recent history/result behavior is absent from simple Hub filtering; preserve it before merging.\n- Custom route save/reopen/completion/feedback/share are not reproduced by curated Active Walk. Preserve both state contracts.\n- Original place sources, exact-locale audio and provider/entitlement eligibility are retained; an empty locale/photo is not evidence of a redesign deleting content.\n- No blanket parity claim: see F13/F15 and baseline/current snapshots. No runtime test of every original action was performed.\n'
save('FUNCTIONAL-GAPS.md',fg)

dec=header+'\n## Owner review matrix — advisory only\n\nAllowed choices: KEEP OLD / KEEP NEW / MERGE BEST OF BOTH / REBUILD FLOW / REMOVE CANDIDATE. All choices remain PENDING until explicit owner approval. Local review controls are a private worksheet only and cannot modify the app or authorize a merge. Preserve all implementations regardless of recommendation.\n\n| Screen / Flow | Old Strengths | New Strengths | Missing Features | Recommendation | My Decision |\n|---|---|---|---|---|---|\n'
for r in rows:dec+=f"| Screen {r['id']} — {r['name']} | {r['oldFunctionality']} | {r['newFunctionality']} | {r['functionalGaps']} | {r['recommendation']} | PENDING |\n"
for a,b,c,d,e,f,g in duplicates:dec+=f'| {a} — {b} | {d} | {e} | {f} | {g} | PENDING |\n'
save('CONSOLIDATION-DECISIONS.md',dec)

architecture=header+'''
## Proposed canonical architecture — NOT implemented

1. Keep immutable design-review IDs 01–13 as review metadata. Use route identities and typed intent separately; internal view state does not need a standalone route simply to match the storyboard.
2. One city availability registry and published city/POI/tour API; one traveler auth provider; independent staff authorization. Preserve CITYWALK guest-first behavior.
3. One shared personalization/settings contract with explicit scopes: account defaults, guest device defaults, unbuilt city draft, generated custom journey. Do not silently promote one into another. Define consent/location lifetime separately from interests.
4. Separate **curated published** and **personalized custom** walking domain state. Reuse accessible map, stop card and control primitives, but preserve editorial order versus adaptation rules. No verified pedestrian provider means stop overview, not directions/ETA.
5. Native five-tab ownership should be decided as a distinct architecture change. Candidate policy: Home global discovery; Explore city Hub/places; Trips route collection/custom/published resume; Saved favorites; Profile settings/account/legal. This policy is advisory and differs from current `/routes` active state; do not alter approved screens by implication.
6. Public Web retains acquisition/SEO/share/legal and intentional existing traveler previews; Admin owns content/media/operations/publication. Neither is automatically replaced by native UI.

## Canonical onboarding proposal

Decide a short optional first-entry Welcome/Story journey, with guest discovery available from each step. Account remains optional. City selection opens the Hub. Keep interests/time/return-by/location contextual to Build My Walk, but decide whether First Experience's second Hub visit is useful. Preserve Back and returning active-walk entry, deep links and unavailable-city handling. A one-time completion policy requires explicit state ownership and approval; do not gate all users behind eight screens.

## Canonical discovery proposal

One selected-city context feeding Hub, Explore and Search. Reuse existing POI catalog, category/search rules, list/map and distinct Save/Add actions. Preserve Search's recent history before combining presentations. Add a route-collection entry only after owner chooses tab/Hub ownership. Preserve verified photography, fallbacks and license-specific credits; no invented POIs/photos.

## Canonical walking proposal

Published collection → published preview → explicit Start/Resume → manual curated stop execution. Personalized settings → explicit generation → custom preview → explicit start → custom execution/adaptation → finish/save/share. Return-by remains walking-estimate based; do not apply a published route's unscoped 45 minutes as full experience or derive street directions from straight lines. Provide a deliberate resume entry for curated progress before removing the older trip-context presentation.

## Retain / combine / eventual removal candidates

- Retain approved visuals 01–13; full Better Auth lifecycle; guest discovery; city availability/localization; Search history; manual planner constraints; source/exact-locale content; custom saving/adaptation/finish; both real domain models; legal/credits and commerce rules.
- Combine only after owner decisions: chooser framing, preference entry hierarchy, Hub/Explore/Search navigation ownership, route collection entry and shared map/stop presentation. Recommendations do not authorize changes.
- Eventual REMOVE CANDIDATE: obsolete experimental landing preview or dead component only after incoming links, historical behavior, owner decision and regression coverage prove safe. Keep noindex preview if it remains useful. Rejected Coming Soon is historical comparison, not a canonical replacement.
- Do not remove other-branch shared-walk, publishing, security/2FA or independent Marketing work merely because it is absent from this checkout.

## Dependency-aware implementation order after owner decisions

1. Freeze source/screenshot manifests and decision export; no-loss comparison against exact develop and open #454. Preserve worktrees/unfinished work.
2. Resolve duration semantics with editorial/source evidence, then central display/filter DTO semantics and regression tests. No invented revised durations.
3. Approve route/tab/entry ownership and onboarding/draft/return policy; define expected typed navigation intents.
4. Implement one narrow approved navigation/preference slice at a time; retain compatibility routes and state migration readers until parity is proven.
5. Integrate curated resume with its own state contract only after candidate Active Walk review; do not collapse custom/public progress automatically.
6. Run native EN/DE guest/account, standard/small/large-text, denied permission, restart and deep-link matrix, plus iOS/Android device acceptance. Recheck legal/media/provider/commerce boundaries independently.
7. Consider removal only after explicit owner keep/remove decisions, source→successor parity, tests and exact-revision acceptance; then seek separate commit/PR permission. No release authority is implied.

## Regression prerequisites before any removal

- Launch/returning user/deep links; all guest exits; city switch/availability; Back/tab retap/scroll restoration; auth callback/recovery and account lifecycle.
- Interests/time/return-by retained on Back, Skip semantics, deadline picker restoration, process-death draft policy and city/account isolation.
- Search recent history/query/categories, List/Map, save versus Add semantics, premium eligibility and missing media/locale fallbacks.
- Curated metadata/stop graph/order, incomplete route rejection, explicit Start only, progress persistence/races/failures/pause/resume/end, current stop versus browsing, no GPS completion.
- Custom generated preview/start/adaptation/shorten/add/take-back/save/reopen/finish/share with supported walking constraints; never invent street ETA/offline capability.
- EN/DE, safe areas, maximum text, screen-reader traversal, minimum touch targets and measured performance. Screenshots/tests are not physical device acceptance.
- Source/author/license/modification links, guest Legal/Photo Credits and legal publication gate; City Pass €4.99/72h one-time/no auto-renewal unchanged. Native Premium/store offerings stay a separate verified product contract.
'''
save('RECOMMENDED-ARCHITECTURE.md',architecture)

# A completely local, portable HTML worksheet. No remote code, no app API, no telemetry.
css='''*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#09234d;font:16px/1.55 system-ui,sans-serif}a{color:#155caf}header{padding:38px max(24px,calc((100vw - 1400px)/2));background:#09234d;color:white}h1,h2,h3{font-family:Georgia,serif;line-height:1.15}h1{font-size:clamp(30px,4vw,49px);margin:.3em 0}h2{font-size:30px}h3{font-size:22px}main{max-width:1440px;margin:auto;padding:24px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:28px}nav{position:sticky;top:12px;align-self:start;background:white;padding:18px;border-radius:16px;max-height:95vh;overflow:auto}nav a{display:block;padding:5px;text-decoration:none}section{background:#fbfdff;border:1px solid #dee7f0;border-radius:20px;padding:28px;margin-bottom:28px;scroll-margin:20px}.tag{display:inline-block;border-radius:100px;background:#e6f0fd;padding:5px 12px;font-size:13px;font-weight:650;margin:3px}.warning{background:#fff1d5;padding:14px;border-radius:10px;color:#594218}.compare{display:grid;grid-template-columns:1fr 1fr;gap:18px}.phone{background:#edf2f8;border-radius:14px;padding:14px}.phone img{display:block;width:100%;height:610px;object-fit:contain;background:#e3e9f2}.phone h3{margin:0 0 10px}.phone p{font-size:13px;overflow-wrap:anywhere}.empty{min-height:360px;display:grid;place-content:center;text-align:center;padding:35px}.facts{display:grid;grid-template-columns:140px minmax(0,1fr);gap:8px;margin:20px 0}.facts dt{font-weight:700}.facts dd{margin:0;overflow-wrap:anywhere}code{font-size:12px;overflow-wrap:anywhere}details{margin:16px 0;padding:12px;background:#f0f5fb;border-radius:10px}summary{cursor:pointer;font-weight:650}select,button,textarea{font:inherit;border:1px solid #9eb4cf;border-radius:9px;padding:12px;min-height:44px}select{max-width:100%;background:white;color:#09234d}textarea{width:100%;min-height:75px;margin:10px 0}button{background:#155caf;color:white;cursor:pointer;margin:4px}button.secondary{background:white;color:#155caf}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #dbe5ee;padding:10px;overflow-wrap:anywhere}.tablewrap{overflow:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.stats{display:flex;flex-wrap:wrap;gap:12px}.stat{padding:13px 18px;border-radius:12px;background:#edf4fd}.stat strong{display:block;font-size:26px}.evidence{font-size:14px;color:#506984}.decision{border-top:2px solid #dbe8f6;margin-top:20px;padding-top:15px}img{max-width:100%}:focus-visible{outline:3px solid #d88616;outline-offset:3px}@media(max-width:1000px){main{display:block}nav{position:static;max-height:250px;margin-bottom:20px}.phone img{height:500px}}@media(max-width:650px){main{padding:12px}section{padding:18px}.compare{grid-template-columns:1fr}.facts{grid-template-columns:1fr}.phone img{height:600px}}@media print{nav,button,select,textarea{display:none}main{display:block}section{break-inside:avoid}.phone img{height:450px}}'''
options=['PENDING','KEEP OLD','KEEP NEW','MERGE BEST OF BOTH','REBUILD FLOW','REMOVE CANDIDATE']
def decision(k):return f'''<div class="decision"><label for="decision-{k}"><strong>USER DECISION: <span class="chosen" data-status="{k}">PENDING</span></strong></label><br><select id="decision-{k}" data-decision="{k}">{''.join(f'<option>{x}</option>' for x in options)}</select><label for="note-{k}"> Review notes</label><textarea id="note-{k}" data-note="{k}" placeholder="Local-only review notes. No change to CITYWALK."></textarea></div>'''
def pic(im,label,empty='Native legacy screenshot unavailable'):
    if not im:return f'<div class="phone"><h3>{label}</h3><div class="empty"><strong>{esc(empty)}</strong><p>No fabricated render. See source and supplementary evidence below.</p></div></div>'
    return f'<div class="phone"><h3>{label}</h3><a href="{im["path"]}" target="_blank"><img loading="lazy" src="{im["path"]}" alt="{esc(label)}"></a><p>{im["width"]} × {im["height"]} pixels. {esc(im["notes"])}</p><a href="{im["path"]}">Open original screenshot</a></div>'
parts=['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src \'self\' data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>CITYWALK — Screen & Flow Review</title><style>'+css+'</style></head><body><header><span>LOCAL REVIEW · 28 OCTOBER 2026 · READ-ONLY PRODUCT AUDIT</span><h1>13 approved designs.<br>One whole-product review.</h1><p>OLD vs NEW, exact source identities, actual flows and preserved alternatives. No consolidation has been executed.</p></header><main><nav aria-label="Review sections"><a href="#overview">Overview / evidence</a><a href="#flow">Actual user flow</a>']
for r in rows:parts.append(f'<a href="#screen-{r["id"]}">{r["id"]} · {esc(r["name"])}</a>')
parts.append('<a href="#other">All other screens</a><a href="#duplicates">Overlap decisions</a><a href="#gaps">Functional findings</a><a href="#files">Reports / source indexes</a></nav><div>')
parts.append(f'''<section id="overview"><h2>Your decisions come first.</h2><p>All Screens 01–13 are visually approved; functional verification remains pending where documented. Screen 14 is an existing, unapproved candidate outside this numbered registry. The app, its branches and worktrees are preserved.</p><div class="stats">{''.join(f'<div class="stat"><strong>{n}</strong>{label}</div>' for n,label in [(68,'current route entries'),(15,'other branch/history paths'),(14,'overlap groups'),(15,'findings'),(27,'PENDING choices')])}</div><p><strong>0 confirmed unreachable routes</strong> does not mean all routes were tested. Welcome and Value Story are bypassed by normal launch; Walking Routes is reached from Preview. Dynamic states and file-route counts differ.</p><p class="warning">OLD native images exist for 03/04 (retained variants) and 11/13 (archived). Other OLD native images are unavailable or there is no original equivalent. Supplemental Web images are clearly labeled and are not native comparisons. All 13 NEW native images are fresh captures.</p><p class="evidence">19 native + 21 Public Web + 28 Admin Web file entries; 15 additional history/branch paths; {len(embedded)} embedded state groups listed separately. 405 local refs / 47 registered worktrees read. No release readiness or measured performance claim.</p><button id="export">Export local decisions JSON</button><button id="reset" class="secondary">Reset local worksheet to PENDING</button><p id="storage-status" role="status">Decisions default to PENDING. Optional worksheet changes stay in this browser, never in CITYWALK.</p></section>''')
parts.append('<section id="flow"><h2>Actual flow—not design-number order</h2><p><strong>Launch → existing Home.</strong> Explicit Welcome entry → 01 → 02 → optional 03 → 04 → 09. Build with no retained journey → 05 → 06 → optional 07 → 08 → Hub → retained planner (interests asked again, then start/end). Existing journeys resume instead.</p><p><strong>Published:</strong> Hub suggested route → 13 → explicit Start → unapproved Active Walk mode. “All walking routes” currently sends 13 → 12 → 13.</p><p><strong>Tabs:</strong> Home / Explore / Trips / Saved / Profile. These are shared navigation actions on a Stack; onboarding states are not extra tabs.</p><details><summary>Full Mermaid flow and navigation edges</summary><pre>'+esc(mermaid)+'</pre><a href="USER-FLOW-MAP.md">Open complete flow report</a></details></section>')
for r in rows:
    parts.append(f'<section id="screen-{r["id"]}"><span class="tag">SCREEN {r["id"]} · OFFICIAL DESIGN REVIEW ID</span><span class="tag">Visually Approved / Functional Verification Pending</span><h2>Screen {r["id"]} — {esc(r["name"])}<br><small>OLD vs NEW</small></h2><div class="compare">'+pic(r['oldImage'],'OLD · native', 'No legacy equivalent identified' if r['noLegacy'] else 'Native legacy screenshot unavailable')+pic(r['newImage'],'NEW · approved current native')+'</div>')
    parts.append('<p class="evidence">'+esc(r['viewportComparison'])+'</p><dl class="facts">')
    for label,value in [('NEW source',r['source']),('NEW component',r['component']),('NEW route/state',r['route']),('OLD source',r['oldSource'] or 'No legacy equivalent identified'),('OLD component / route',(r['oldComponent']+' / '+r['oldRoute']) if r['oldSource'] else 'Not applicable'),('Branch / worktree',BRANCH+' / '+str(R)),('Baseline',BASE+' + uncommitted approved implementation (hash snapshots linked below)')]:parts.append(f'<dt>{label}</dt><dd><code>{esc(value)}</code></dd>')
    parts.append('</dl>')
    for label,key in [('Old functionality','oldFunctionality'),('New functionality','newFunctionality'),('Functional gaps','functionalGaps'),('UX differences','uxDifferences'),('Recommended version','recommendation')]:parts.append(f'<p><strong>{label}:</strong> {esc(r[key])}</p>')
    parts.append('<details><summary>Source snapshots / versions / provenance</summary><ul>')
    for s in r['sources']:
        parts.append(f'<li><code>{esc(s["path"])}</code>: <a href="{s["currentSnapshot"]}">current snapshot</a> · SHA-256 <code>{s["sha256"]}</code>')
        if s['baseSnapshot']:parts.append(f' · <a href="{s["baseSnapshot"]}">baseline source @ 98a1…</a>')
        parts.append('</li>')
    parts.append('</ul><p>See route-inventory.json for branch/worktree presence and branch-route-versions.json for every committed blob variant across audited refs. Source snapshots are comparison artifacts, not edited application files.</p></details>')
    if r['supplement']:parts.append('<details><summary>Supplementary archived legacy WEB evidence—not native OLD</summary>'+pic(r['supplement'],'Legacy WEB reference only')+'</details>')
    parts.append('<p class="evidence">Accessibility: code labels/state and historical checks do not establish physical VoiceOver/TalkBack acceptance. Performance: not measured. No current full regression or provider/payment acceptance claimed.</p>'+decision('S'+r['id'])+'</section>')
parts.append('<section id="other"><h2>Every other screen and state</h2><p>Existing Active Walk, Saved, Guide, City Pass, Profile, settings/account states and all Public/Admin Web routes are preserved. These are not renumbered into the approved set.</p><div class="tablewrap"><table><thead><tr><th>Platform / route</th><th>Source / component</th><th>Status / reachability</th></tr></thead><tbody>')
for r in inventory:parts.append(f'<tr><td>{esc(r["platform"])}<br><code>{esc(r["route"])}</code></td><td><code>{esc(r["source"])}</code><br>{esc(r["component"])}</td><td>{esc(r["status"])}<br>{esc(r["reachable"])}</td></tr>')
parts.append('</tbody></table></div><details><summary>Embedded flow, auth and settings states</summary><div class="tablewrap"><table><tr><th>State</th><th>Source / route</th><th>Status</th></tr>')
for a,b,c,d,e in embedded:parts.append(f'<tr><td>{a} · {esc(b)}</td><td><code>{esc(c)}</code><br>{esc(d)}</td><td>{esc(e)}</td></tr>')
parts.append('</table></div></details><details><summary>15 other-branch / history-only route paths</summary><ul>')
for r in other:parts.append(f'<li><code>{esc(r["path"])}</code> — {esc(r["status"])}<br><code>{esc(next(iter(r["refs"]),r["latestPathChangeCommit"]))}</code></li>')
parts.append('</ul><a href="other-branch-history-screens.json">Exact refs/worktrees/history metadata</a></details><details><summary>Other available native evidence (archived)</summary><div class="compare">')
for e in extras:parts.append(pic(e['image'],e['title']))
parts.append('</div></details></section><section id="duplicates"><h2>14 overlap decisions</h2><p>Advisory candidates include legitimate reuse. Selecting a worksheet option does not remove or merge any source.</p>')
for a,b,c,d,e,f,g in duplicates:parts.append(f'<details><summary>{a} · {esc(b)} · Recommendation: {g}</summary><p><code>{esc(c)}</code></p><p><strong>Old strengths:</strong> {esc(d)}</p><p><strong>New strengths:</strong> {esc(e)}</p><p><strong>Missing / risk:</strong> {esc(f)}</p>{decision(a)}</details>')
parts.append('</section><section id="gaps"><h2>15 functional / flow findings</h2>')
for a,b,c,d,e,f in gaps:parts.append(f'<article><h3>{a} · {b} · {esc(c)}</h3><p>{esc(d)}</p><p><code>{esc(e)}</code></p><p><strong>Proposed next step:</strong> {esc(f)}</p></article>')
parts.append('</section><section id="files"><h2>Complete report package</h2><ul>')
for f in ['SCREEN-REGISTRY.md','SCREEN-INVENTORY.md','DUPLICATE-SCREENS.md','USER-FLOW-MAP.md','OLD-VS-NEW.md','FUNCTIONAL-GAPS.md','CONSOLIDATION-DECISIONS.md','RECOMMENDED-ARCHITECTURE.md','screen-registry.json','route-inventory.json','screenshot-provenance.json','github-evidence.json','worktrees.json','refs.json','branch-route-versions.json','navigation-edges.json','counts.json','VERIFICATION.md']:parts.append(f'<li><a href="{f}">{f}</a></li>')
parts.append('</ul><p>No consolidation executed. Review and export choices; implementation remains paused until explicit owner instructions.</p></section></div></main>')
script='''const key='citywalk-audit-review-2026-10-28';let data={};const status=document.getElementById('storage-status');try{data=JSON.parse(localStorage.getItem(key)||'{}')}catch{status.textContent='Browser storage unavailable; worksheet works for this page session. Export JSON to preserve choices.'}function persist(){try{localStorage.setItem(key,JSON.stringify(data))}catch{status.textContent='Local persistence unavailable. Export JSON to preserve choices.'}}document.querySelectorAll('[data-decision]').forEach(el=>{const id=el.dataset.decision;const value=data[id]?.decision||'PENDING';el.value=Array.from(el.options).some(o=>o.value===value)?value:'PENDING';document.querySelector('[data-status="'+id+'"]').textContent=el.value;el.addEventListener('change',()=>{data[id]={...data[id],decision:el.value};document.querySelector('[data-status="'+id+'"]').textContent=el.value;persist()})});document.querySelectorAll('[data-note]').forEach(el=>{const id=el.dataset.note;el.value=data[id]?.note||'';el.addEventListener('input',()=>{data[id]={decision:data[id]?.decision||'PENDING',note:el.value};persist()})});document.getElementById('export').addEventListener('click',()=>{const choices={};document.querySelectorAll('[data-decision]').forEach(el=>{const id=el.dataset.decision;choices[id]={decision:el.value,note:document.querySelector('[data-note="'+id+'"]').value}});const blob=new Blob([JSON.stringify({audit:'CITYWALK screen-flow-consolidation',exportedAt:new Date().toISOString(),authority:'Local worksheet only; no app changes or release authorization',choices},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='CITYWALK-review-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});document.getElementById('reset').addEventListener('click',()=>{data={};persist();document.querySelectorAll('[data-decision]').forEach(el=>el.value='PENDING');document.querySelectorAll('[data-status]').forEach(el=>el.textContent='PENDING');document.querySelectorAll('[data-note]').forEach(el=>el.value='');status.textContent='Local worksheet reset to PENDING. CITYWALK source is unchanged.'});'''
parts.append('<script>'+script+'</script></body></html>');save('review.html',''.join(parts))
save('review-script.js',script)

# Compact contact sheet: real capture pixels, no generated interface.
thumbw=220; thumbh=480; cols=5; n=len(rows); sheet=Image.new('RGB',(cols*(thumbw+20)+20,((n+cols-1)//cols)*(thumbh+70)+30),'#f4f7fb');draw=ImageDraw.Draw(sheet)
for idx,r in enumerate(rows):
    x=20+(idx%cols)*(thumbw+20);y=20+(idx//cols)*(thumbh+70)
    im=Image.open(O/r['newImage']['path']).convert('RGB');im.thumbnail((thumbw,thumbh))
    sheet.paste(im,(x+(thumbw-im.width)//2,y+38));draw.text((x,y),f"{r['id']}  {r['name']}",fill='#09234d')
sheet.save(O/'approved-01-13-contact-sheet.jpg',quality=88)
save('README.md',header+'\n'+summary+'\nStart with [the local review page](review.html), [official registry](SCREEN-REGISTRY.md), [comparison gallery](OLD-VS-NEW.md) or [full inventory](SCREEN-INVENTORY.md). All 27 decisions remain PENDING.\n\n![Current native screen captures](approved-01-13-contact-sheet.jpg)')
print(json.dumps(counts,indent=2))
