import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import SupportPage, { metadata } from "@/app/support/page";

describe("public support page", () => {
  afterEach(cleanup);

  it("publishes a canonical searchable support route", () => {
    expect(metadata.alternates).toEqual({ canonical: "https://getcitywalk.com/support" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("offers direct support without collecting secrets in a web form", () => {
    const { container } = render(<SupportPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Need help with CITYWALK?" })).toBeDefined();
    expect(screen.getByRole("link", { name: "support@getcitywalk.com" }).getAttribute("href")).toBe("mailto:support@getcitywalk.com");
    expect(screen.getByText(/does not require your password, payment-card number or store password/i)).toBeDefined();
    expect(container.querySelector("form, input, textarea")).toBeNull();
  });

  it("links privacy, terms, imprint and account deletion from support", () => {
    render(<SupportPage />);
    for (const [name, href] of [
      ["Privacy notice", "/privacy"],
      ["Terms of use", "/terms"],
      ["Imprint", "/imprint"],
      ["Account deletion", "/account-deletion"],
    ] as const) {
      expect(screen.getAllByRole("link", { name }).some(link => link.getAttribute("href") === href)).toBe(true);
    }
  });
});
