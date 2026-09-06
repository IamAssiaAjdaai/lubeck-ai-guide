import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import {
  CityFields,
  LocaleNavigator,
} from "@/components/admin/AdminContentForms";

const city = {
  id: 1,
  slug: "lubeck",
  name: "Lubeck",
  publicationStatus: "draft" as const,
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  localizations: [{
    id: 1,
    cityId: 1,
    locale: "en",
    name: "Lubeck",
    shortDescription: "English authored content",
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }],
};

describe("admin authored-localization UI", () => {
  it("does not copy fallback text into an unauthored locale form", () => {
    render(<CityFields city={city} editingLocale="ar" />);

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(document.querySelector('input[name="locale"]')).toHaveValue("ar");
  });

  it("identifies the locale currently selected for editing", () => {
    render(
      <LocaleNavigator authoredLocales={["en"]} currentLocale="ar" />,
    );

    expect(screen.getByRole("link", { name: "ar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "en" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
