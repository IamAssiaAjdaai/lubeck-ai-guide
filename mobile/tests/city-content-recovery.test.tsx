// @vitest-environment jsdom
import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ContentRecovery } from "../src/components/ContentRecovery";
import { usePublicCity } from "../src/hooks/usePublicContent";
import { publicContentCache } from "../src/lib/publicContentCache";

const { loadCitySummary } = vi.hoisted(() => ({ loadCitySummary: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { loadCitySummary } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));
vi.mock("react-native", () => ({ View: ({ children }: PropsWithChildren) => <div>{children}</div> }));
vi.mock("expo-router", () => ({
  Link: ({ children, href, replace }: PropsWithChildren<{ href: unknown; replace?: boolean }>) =>
    <div data-href={JSON.stringify(href)} data-replace={replace}>{children}</div>,
}));
vi.mock("../src/localization/LocaleProvider", () => ({
  useNativeLocale: () => ({ locale: "en", messages: { retry: "Try again", unavailable: "Unavailable" } }),
}));
vi.mock("../src/components/ui", () => ({
  PrimaryButton: ({ label, onPress }: { label: string; onPress?: () => void }) => <button onClick={onPress}>{label}</button>,
  StatusMessage: ({ children }: PropsWithChildren) => <p role="status">{children}</p>,
}));

function CityRecovery({ citySlug }: { citySlug: string }) {
  const state = usePublicCity(citySlug, "en");
  return state.status === "error"
    ? <ContentRecovery citySlug={citySlug} cityUnavailable={state.removed} retry={state.retry} />
    : <p>{state.status}</p>;
}

afterEach(() => {
  cleanup();
  publicContentCache.clearMemory();
  loadCitySummary.mockReset();
});

it.each([404, 410])("offers a catalog exit for a confirmed missing city (HTTP %s)", async status => {
  loadCitySummary.mockResolvedValue({ status });
  render(<CityRecovery citySlug="missing-city" />);
  const link = (await screen.findByRole("button", { name: "Explore Cities" })).parentElement!;
  expect(JSON.parse(link.dataset.href!)).toEqual({ pathname: "/", params: { section: "cities" } });
  expect(link.dataset.replace).toBe("true");
  expect(screen.queryByRole("button", { name: "Back to city" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
});

it("keeps the existing city and Retry for transient failure, then uses the catalog only after a 404", async () => {
  loadCitySummary.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ status: 404 });
  render(<CityRecovery citySlug="test-city" />);
  const retry = await screen.findByRole("button", { name: "Try again" });
  const link = screen.getByRole("button", { name: "Back to city" }).parentElement!;
  expect(JSON.parse(link.dataset.href!)).toEqual({ pathname: "/city/[citySlug]", params: { citySlug: "test-city" } });
  expect(screen.queryByRole("button", { name: "Explore Cities" })).toBeNull();
  fireEvent.click(retry);
  expect(await screen.findByRole("button", { name: "Explore Cities" })).toBeTruthy();
  expect(loadCitySummary).toHaveBeenCalledTimes(2);
});
