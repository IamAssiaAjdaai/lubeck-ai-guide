// @vitest-environment jsdom
import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launchLocales, t } from "@citywalk/i18n";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";

const state = vi.hoisted(() => ({
  locale: "en",
  completion: vi.fn(),
  url: vi.fn(),
  open: vi.fn(async () => undefined),
  feedback: vi.fn(async () => undefined),
}));

vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
}));
vi.mock("react-native", () => ({
  AppState: { currentState: "active" },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("../src/lib/storeReview", () => ({
  storeReview: {
    afterCompletion: state.completion,
    openFallback: state.open,
    configuredUrl: state.url,
  },
}));
vi.mock("../src/lib/walkStorage", () => ({ saveWalkFeedback: state.feedback }));
vi.mock("../src/localization/LocaleProvider", () => ({
  useNativeLocale: () => ({ locale: state.locale }),
}));
vi.mock("../src/components/WalkControls", () => ({
  WalkChoices: ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelect(value: string): void;
  }) => (
    <fieldset>
      {label ? <legend>{label}</legend> : null}
      {options.map((option) => (
        <button
          key={option.value}
          aria-pressed={selected.includes(option.value)}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  ),
}));
vi.mock("../src/components/ui", () => ({
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  PressableSurface: ({ children, onPress, accessibilityLabel }: React.PropsWithChildren<{ onPress?: () => void; accessibilityLabel?: string }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  AppText: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  PrimaryButton: ({
    label,
    onPress,
    busy,
    wrapLabel,
  }: {
    label: string;
    onPress(): void;
    busy: boolean;
    wrapLabel: boolean;
  }) => (
    <button data-wrap={wrapLabel} disabled={busy} onClick={onPress}>
      {label}
    </button>
  ),
}));

import { PublicStoreReview } from "../src/components/PublicStoreReview";

const journey = {
  id: "finished",
  finishedAt: 20,
  startedAt: 10,
  visited: ["one", "two"],
} as WalkJourney;

beforeEach(() => {
  state.locale = "en";
  state.url.mockReturnValue(undefined);
  state.completion.mockResolvedValue({ status: "unavailable" });
  state.feedback.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("public review Finish presentation", () => {
  it.each(launchLocales)("localizes the configured public-store fallback in %s", async locale => {
    state.locale = locale;
    state.completion.mockResolvedValue({ status: "requested" });
    state.url.mockReturnValue("https://configured.example");
    render(<PublicStoreReview journey={journey} />);

    expect(screen.getByText(t(locale, "complete.ratingQuestion"))).toBeTruthy();
    const action = await screen.findByRole("button", { name: t(locale, "review.action") });
    expect(screen.getByText(t(locale, "review.title"), { selector: "p" })).toBeTruthy();
    expect(screen.getByText(t(locale, "review.description"))).toBeTruthy();
    expect(action.getAttribute("data-wrap")).toBe("true");

    fireEvent.click(action);
    await waitFor(() => expect(state.open).toHaveBeenCalledWith());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: t(locale, "review.action") })).toBeNull(),
    );
    expect(screen.getByText(t(locale, "complete.ratingQuestion"))).toBeTruthy();
  });

  it.each(["requested", "unavailable", "ineligible"])(
    "keeps private completion feedback visible without a dead review button for %s",
    async status => {
      state.completion.mockResolvedValue({ status });
      render(<PublicStoreReview journey={journey} />);

      await waitFor(() => expect(state.completion).toHaveBeenCalled());
      expect(screen.getByText(t("en", "complete.ratingQuestion"))).toBeTruthy();
      expect(screen.queryByRole("button", { name: t("en", "review.action") })).toBeNull();
      expect(state.open).not.toHaveBeenCalled();
    },
  );

  it("persists a star rating and compact completion tags on the finished walk", async () => {
    render(<PublicStoreReview journey={journey} />);

    fireEvent.click(screen.getByRole("button", { name: "5 / 5" }));
    await waitFor(() =>
      expect(state.feedback).toHaveBeenCalledWith("finished", "rating", "5"),
    );

    fireEvent.click(screen.getByRole("button", { name: t("en", "planner.yourRoute") }));
    await waitFor(() =>
      expect(state.feedback).toHaveBeenCalledWith(
        "finished",
        "tags",
        JSON.stringify(["route"]),
      ),
    );
    expect(screen.getByText(t("en", "walk.thanks"))).toBeTruthy();
  });

  it("does not gate private feedback on the public store-review settlement callback", async () => {
    const settled = vi.fn();
    render(<PublicStoreReview journey={journey} onSettled={settled} />);

    await waitFor(() => expect(state.completion).toHaveBeenCalled());
    expect(screen.getByText(t("en", "complete.ratingQuestion"))).toBeTruthy();
    expect(settled).not.toHaveBeenCalled();
  });
});
