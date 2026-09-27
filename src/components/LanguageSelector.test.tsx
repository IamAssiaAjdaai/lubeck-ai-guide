import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getLocaleLabel, sharedLocales, launchVisibleLocales } from "@citywalk/i18n";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
import LanguageSelector from "./LanguageSelector";
afterEach(cleanup);
it("offers only the six launch languages in the public selector, retaining Arabic metadata", () => {
  render(<LanguageSelector currentLocale="en" label="Language" closeLabel="Close" options={sharedLocales.map(locale => ({ locale, nativeName: getLocaleLabel(locale) }))} />);
  fireEvent.click(screen.getByRole("button", { name: "Language" }));
  expect(screen.queryByRole("option", { name: /العربية/ })).toBeNull();
  for (const locale of launchVisibleLocales) expect(screen.getByRole("option", { name: new RegExp(getLocaleLabel(locale)) })).toBeTruthy();
  expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual(launchVisibleLocales.map(getLocaleLabel));
  expect(sharedLocales).toContain("ar");
});
