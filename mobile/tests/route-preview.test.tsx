// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "en", city: "test-city", status: "available", missing: false, estimate: 45, retry: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" }, useWindowDimensions:()=>({fontScale:1}), StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown[]) => Object.assign({}, ...s.filter(Boolean)) }, View: ({children}:React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("expo-router", () => ({ Stack:{Screen:()=>null}, useLocalSearchParams:()=>({citySlug:"test-city",tourSlug:"published-tour"}), Link:({children,href,asChild}:React.PropsWithChildren<{href:unknown;asChild?:boolean}>)=>{
  if(asChild && Array.isArray((React.Children.only(children) as React.ReactElement<{style?:unknown}>).props.style)) throw new Error("Expo Slot cannot accept array styles");
  return <a data-route={JSON.stringify(href)}>{children}</a>;
} }));
vi.mock("../src/components/ui",()=>({
  Screen:({children,footer}:React.PropsWithChildren<{footer?:React.ReactNode}>)=><main>{children}{footer}</main>,
  AppText:({children}:React.PropsWithChildren)=><span>{children}</span>,
  PressableSurface:({children,onPress,accessibilityLabel}:React.PropsWithChildren<{onPress?():void;accessibilityLabel?:string}>)=><button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  PrimaryButton:({label,disabled,onPress}:{label:string;disabled?:boolean;onPress?():void})=><button disabled={disabled} onClick={onPress}>{label}</button>,
  StatusMessage:({children}:React.PropsWithChildren)=><p role="status">{children}</p>,
}));
vi.mock("../src/components/NativeCityMap",()=>({NativeCityMap:({places,onSelectPlace}:{places:{slug:string}[];onSelectPlace(slug:string):void})=><button onClick={()=>onSelectPlace(places[1].slug)}>Map stop 2</button>}));
vi.mock("../src/components/NativeContentImage",()=>({NativeContentImage:()=>null}));
vi.mock("../src/components/NativeIcon",()=>({NativeIcon:()=>null}));
vi.mock("../src/components/MediaAttribution",()=>({MediaAttribution:()=>null}));
vi.mock("../src/components/CitywalkLoading",()=>({CitywalkLoading:()=> <p>Loading</p>}));
vi.mock("../src/components/ContentRecovery",()=>({ContentRecovery:({retry}:{retry():void})=><button onClick={retry}>Retry content</button>}));
vi.mock("../src/lib/explorePhotography",()=>({explorePhotography:()=>undefined}));
vi.mock("../src/lib/api/instance",()=>({citywalkApi:{resolveUrl:(url:string)=>url}}));
vi.mock("../src/localization/LocaleProvider",()=>({useNativeLocale:()=>({locale:state.locale,direction:"ltr",messages:{minutes:"min",stops:"stops",visitMinutes:"min visit",unavailable:"Unavailable",fallbackContent:"Fallback"}})}));
vi.mock("../src/hooks/usePublicContent",()=>({usePublicCity:()=>({status:state.status,retry:state.retry,data:{city:{slug:state.city,content:{name:"Selected city"}},places:(state.missing?["first"]:["first","second"]).map(slug=>({slug,content:{name:slug},resolvedLocale:"en",coordinates:{lat:53.8,lng:10.7},media:[]})),tours:[{slug:"published-tour",content:{title:"Real published title",shortDescription:"Published description"},resolvedLocale:"en",estimatedDurationMinutes:state.estimate,media:[],stops:[{placeSlug:"second",position:2,visitDurationMinutes:10},{placeSlug:"first",position:1,visitDurationMinutes:20}]}]}})}));
import TourScreen from "../src/app/city/[citySlug]/tour/[tourSlug]";
afterEach(()=>{cleanup();state.locale="en";state.city="test-city";state.status="available";state.missing=false;state.estimate=45;vi.clearAllMocks();});
it.each(["en","de"])("keeps %s guest browsing outside trip execution until Start Walk",locale=>{
  state.locale=locale;render(<TourScreen/>);
  expect(screen.getByText("Real published title")).toBeTruthy();expect(screen.getByText(locale==="de"?"30 Min. an den Stopps · 2 stops":"30 min at stops · 2 stops")).toBeTruthy();
  const start=screen.getByRole("button",{name:locale==="de"?"Spaziergang starten":"Start Walk"}).closest("a")!;
  expect(JSON.parse(start.dataset.route!).params).toMatchObject({citySlug:"test-city",placeSlug:"first",tripStops:"first,second",tripIndex:"0",tripSource:"published"});
  const stop=screen.getByRole("button",{name:locale==="de"?"Stopp 2: second · 10 min visit":"Stop 2: second · 10 min visit"}).closest("a")!;
  expect(JSON.parse(stop.dataset.route!).params).toEqual({citySlug:"test-city",placeSlug:"second"});
  expect(document.querySelectorAll('a[data-route*="tripSource"]')).toHaveLength(1);
  fireEvent.click(screen.getByRole("button",{name:"Map stop 2"}));
  const browse=screen.getByRole("button",{name:locale==="de"?"Ort entdecken: second":"Explore place: second"}).closest("a")!;
  expect(JSON.parse(browse.dataset.route!).params).toEqual({citySlug:"test-city",placeSlug:"second"});
  expect(screen.queryByRole("button",{name:/save|speichern/i})).toBeNull();
});
it("rejects a different-city response",()=>{state.city="other-city";render(<TourScreen/>);expect(screen.getByRole("status").textContent).toBe("Unavailable");expect(screen.queryByText("Real published title")).toBeNull();});
it("does not start a route with unresolved stops or display partial geometry",()=>{state.missing=true;render(<TourScreen/>);expect(screen.getByRole("button",{name:"Start Walk"}).hasAttribute("disabled")).toBe(true);expect(screen.queryByText("Map stop 2")).toBeNull();});
it("shows content loading and retryable failure states",()=>{state.status="loading";const view=render(<TourScreen/>);expect(screen.getByText("Loading")).toBeTruthy();state.status="error";view.rerender(<TourScreen/>);fireEvent.click(screen.getByRole("button",{name:"Retry content"}));expect(state.retry).toHaveBeenCalledOnce();expect(screen.queryByText("Start Walk")).toBeNull();});

it.each(["en","de"])("explains the unverified published timing in %s without presenting it as full duration", locale=>{
  state.locale=locale;state.estimate=10;render(<TourScreen/>);
  expect(screen.queryByText(/Published estimate:|Veröffentlichte Schätzung:/)).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:locale==="de"?"Zeitangaben erläutern":"Explain duration estimates"}));
  expect(screen.getByText(locale==="de"?/Veröffentlichte Schätzung: 10 Min/:/Published estimate: 10 min/)).toBeTruthy();
  expect(screen.getByText(locale==="de"?/Sie wird deshalb nicht als Gesamtdauer verwendet/:/not used as the full experience duration/)).toBeTruthy();
  expect(screen.queryByText("10 min · 2 stops")).toBeNull();
});
