// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import { NativeCityMap } from "../src/components/NativeCityMap";
const bridge=vi.hoisted(()=>({request:vi.fn(),fit:vi.fn(),ease:vi.fn(),watch:vi.fn(),stop:vi.fn()}));
vi.mock("react-native",()=>({AppState:{currentState:"active",addEventListener:()=>({remove:()=>{}})},StyleSheet:{create:(s:unknown)=>s,absoluteFill:{}},ActivityIndicator:()=>null,
  View:({children}:React.PropsWithChildren)=><div>{children}</div>,Text:({children}:React.PropsWithChildren)=><span>{children}</span>,Pressable:({children,onPress,accessibilityLabel}:React.PropsWithChildren<{onPress?():void;accessibilityLabel?:string}>)=><button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>}));
vi.mock("@maplibre/maplibre-react-native",()=>({
  Map:({children,onDidFailLoadingMap,onDidFinishRenderingMapFully}:React.PropsWithChildren<{onDidFailLoadingMap():void;onDidFinishRenderingMapFully():void}>)=><div><button onClick={onDidFailLoadingMap}>Fail map</button><button onClick={onDidFinishRenderingMapFully}>Load map</button>{children}</div>,
  Camera:({ref}: {ref:React.Ref<{fitBounds:typeof bridge.fit;easeTo:typeof bridge.ease}>})=>{React.useImperativeHandle(ref,()=>({fitBounds:bridge.fit,easeTo:bridge.ease}));return null;},
  Marker:({children,id,onAccessibilityTap}:React.PropsWithChildren<{id:string;onAccessibilityTap?():void}>)=><div>{children}{onAccessibilityTap ? <button onClick={onAccessibilityTap}>Activate {id}</button> : null}</div>,
  GeoJSONSource:({children,data,id}:React.PropsWithChildren<{data:unknown;id:string}>)=><div data-testid={id} data-geo={JSON.stringify(data)}>{children}</div>,Layer:()=>null,
}));
vi.mock("../src/components/ui",()=>({AppText:({children}:React.PropsWithChildren)=><span>{children}</span>,PrimaryButton:({label,onPress}:{label:string;onPress?():void})=><button onClick={onPress}>{label}</button>}));
vi.mock("../src/components/NativeIcon",()=>({NativeIcon:()=>null}));
vi.mock("../src/lib/location",()=>({requestForegroundLocation:bridge.request,recheckForegroundLocationProvider:vi.fn()}));
vi.mock("../src/lib/location.expo",()=>({expoForegroundLocationAdapter:{watchPosition:bridge.watch}}));
vi.mock("../src/lib/haptics",()=>({triggerCitywalkHaptic:vi.fn()}));
vi.mock("../src/localization/LocaleProvider",()=>({useNativeLocale:()=>({locale:"en",messages:{useLocation:"Use location",locationRequesting:"Requesting location",locationDenied:"Location denied. Continue without location."}})}));
const places=[{slug:"one",coordinates:{lat:53,lng:10},content:{name:"One"}},{slug:"two",coordinates:{lat:54,lng:11},content:{name:"Two"}}] as PublicPlaceCard[];
afterEach(()=>{cleanup();vi.clearAllMocks();bridge.request.mockReset();bridge.watch.mockReset();});
it("uses actual ordered coordinates and selection without requesting location",()=>{
  const select=vi.fn();render(<NativeCityMap citySlug="test-city" places={places} routeOverview={{fitLabel:"Fit stops",stopLabel:"Stop"}} onSelectPlace={select}/>);
  expect(JSON.parse(screen.getByTestId("published-stop-order").dataset.geo!).geometry.coordinates).toEqual([[10,53],[11,54]]);
  expect(bridge.request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Stop 2. Two"}));expect(select).toHaveBeenCalledWith("two");
  fireEvent.click(screen.getByRole("button",{name:"Activate place-one"}));expect(select).toHaveBeenLastCalledWith("one");
  fireEvent.click(screen.getByRole("button",{name:"Fit stops"}));expect(bridge.fit).toHaveBeenCalledWith([10,53,11,54],expect.any(Object));
});
it("retains the default map without the published overview opt-in",()=>{render(<NativeCityMap places={places}/>);expect(screen.queryByTestId("published-stop-order")).toBeNull();expect(screen.queryByRole("button",{name:"Fit stops"})).toBeNull();expect(bridge.request).not.toHaveBeenCalled();});
it("retains map failure and retry while keeping content outside the map usable",()=>{
  render(<NativeCityMap places={places} routeOverview={{fitLabel:"Fit stops",stopLabel:"Stop"}}/>);
  fireEvent.click(screen.getByRole("button",{name:"Fail map"}));expect(screen.queryByRole("button",{name:"Fit stops"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:/retry|try again/i}));expect(screen.getByRole("button",{name:"Load map"})).toBeTruthy();expect(bridge.request).not.toHaveBeenCalled();
});

it("requests foreground location only after a press and keeps stop selection available after denial", async()=>{
  bridge.request.mockResolvedValue({status:"denied"});
  const select=vi.fn();
  render(<NativeCityMap citySlug="test-city" places={places} followUserLocation routeOverview={{fitLabel:"Fit stops",stopLabel:"Stop"}} onSelectPlace={select}/>);
  expect(bridge.request).not.toHaveBeenCalled();
  expect(bridge.watch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Use location"}));
  expect(await screen.findByText("Location denied. Continue without location.")).toBeTruthy();
  expect(bridge.request).toHaveBeenCalledOnce();
  expect(bridge.watch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Stop 2. Two"}));
  expect(select).toHaveBeenCalledWith("two");
  expect(screen.getByRole("button",{name:"Fit stops"})).toBeTruthy();
});
it("follows granted foreground location only after an explicit request and releases the watcher when following stops", async()=>{
  bridge.request.mockResolvedValue({status:"available",location:{latitude:53.2,longitude:10.2}});
  let emit: ((location:{latitude:number;longitude:number})=>void)|undefined;
  bridge.watch.mockImplementation(async(onLocation:(location:{latitude:number;longitude:number})=>void)=>{emit=onLocation;return bridge.stop;});
  const onLocation=vi.fn(),select=vi.fn();
  const view=render(<NativeCityMap places={places} followUserLocation onLocation={onLocation} onSelectPlace={select}/>);
  expect(bridge.request).not.toHaveBeenCalled();
  expect(bridge.watch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Use location"}));
  await waitFor(()=>expect(bridge.watch).toHaveBeenCalledOnce());
  expect(bridge.request).toHaveBeenCalledOnce();
  expect(onLocation).toHaveBeenCalledWith({lat:53.2,lng:10.2});
  act(()=>emit?.({latitude:53.3,longitude:10.3}));
  expect(onLocation).toHaveBeenLastCalledWith({lat:53.3,lng:10.3});
  expect(select).not.toHaveBeenCalled();
  view.rerender(<NativeCityMap places={places} followUserLocation={false} onLocation={onLocation} onSelectPlace={select}/>);
  await waitFor(()=>expect(bridge.stop).toHaveBeenCalledOnce());
  view.unmount();
  expect(bridge.stop).toHaveBeenCalledOnce();
});
