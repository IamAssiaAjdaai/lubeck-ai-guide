// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ city: "another-city", returnedCity: "another-city", locale: "en" as "en" | "de", empty: false }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" }, StyleSheet: { create: (s: unknown) => s }, View: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({ citySlug: state.city }), Link: ({ children, href, asChild }: React.PropsWithChildren<{ href: unknown; asChild?: boolean }>) => { if (asChild && Array.isArray((React.Children.only(children) as React.ReactElement<{style?: unknown}>).props.style)) throw new Error("Slot style array"); return <a data-route={JSON.stringify(href)}>{children}</a>; } }));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{accessibilityRole?: string}>) => accessibilityRole === "header" ? <h2>{children}</h2> : <span>{children}</span>,
  PressableSurface: ({ children, onPress, accessibilityRole, accessibilityLabel, accessibilityState }: React.PropsWithChildren<{onPress?():void;accessibilityRole:string;accessibilityLabel:string;accessibilityState?:{checked?:boolean}}>) => <button role={accessibilityRole === "radio" ? "radio" : "button"} aria-checked={accessibilityState?.checked} aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  PrimaryButton: ({ label, onPress }: {label:string;onPress?():void}) => <button onClick={onPress}>{label}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
  EmptyState: ({ title, description, action }: {title:string;description:string;action:React.ReactNode}) => <div><h3>{title}</h3><p>{description}</p>{action}</div>,
}));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: () => <div /> }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => null }));
vi.mock("../src/components/ContentRecovery", () => ({ ContentRecovery: () => null }));
vi.mock("../src/design/responsiveText", () => ({ useResponsiveTextLayout: () => ({ expanded: false }) }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: "ltr", messages: { minutes: "min", stops: "stops", unavailable: "Unavailable", fallbackContent: "Content fallback" } }) }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (x:string) => x } }));
vi.mock("../src/hooks/usePublicContent", () => ({ usePublicCity: () => ({ status: "available", data: { city: {slug:state.returnedCity,content:{name:"Selected City"}}, places:[],tours:state.empty ? [] : [45,120].map(minutes=>({slug:`published-${minutes}`,estimatedDurationMinutes:minutes,stops:[],media:[],resolvedLocale:"en",content:{title:`Published ${minutes}`,shortDescription:"Published description"}})) } }) }));
import WalkingRoutesScreen from "../src/app/city/[citySlug]/routes";
beforeEach(() => vi.stubGlobal("require", () => 1));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); state.city="another-city";state.returnedCity="another-city";state.locale="en";state.empty=false; });
it.each(["en","de"] as const)("keeps guest route filtering and exact preview navigation in %s", locale => {
  state.locale=locale;render(<WalkingRoutesScreen />);
  expect(screen.getByText("Selected City")).toBeTruthy();
  fireEvent.click(screen.getByRole("radio",{name:locale==="de"?"Bis 60 Min.":"Up to 60 min"}));
  expect(screen.queryByText("Published 120")).toBeNull();
  const preview=screen.getByRole("button",{name:locale==="de"?"Route ansehen: Published 45 · 45 min · 0 stops":"Preview route: Published 45 · 45 min · 0 stops"}).closest("a")!;
  expect(JSON.parse(preview.dataset.route!)).toEqual({pathname:"/city/[citySlug]/tour/[tourSlug]",params:{citySlug:"another-city",tourSlug:"published-45"}});
  fireEvent.click(screen.getByRole("radio",{name:locale==="de"?"Alle":"All"}));
  expect(screen.getByText("Published 120")).toBeTruthy();
});
it("rejects a response for another city",()=>{state.returnedCity="wrong-city";render(<WalkingRoutesScreen />);expect(screen.getByRole("status").textContent).toBe("Unavailable");expect(screen.queryByText("Published 45")).toBeNull();});
it("offers the existing builder and Saved Walks when the city has no curated routes",()=>{state.empty=true;render(<WalkingRoutesScreen />);expect(screen.getByText("Routes are on their way")).toBeTruthy();expect(screen.getByRole("button",{name:"Saved walks"}).closest("a")?.dataset.route).toBe(JSON.stringify("/saved?view=trips"));});
