import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/components/AnalyticsConsentControl", () => ({ AnalyticsConsentPreferences: () => <div>Analytics preferences</div> }));
import PrivacyPage, { generateMetadata as privacyMetadata } from "@/app/privacy/page";
import TermsPage, { generateMetadata as termsMetadata } from "@/app/terms/page";
import ImprintPage, { generateMetadata as imprintMetadata } from "@/app/imprint/page";
import sitemap from "@/app/sitemap";

const identity = {
  CITYWALK_LEGAL_PUBLICATION_APPROVED: "1",
  CITYWALK_LEGAL_ENTITY_TYPE: "individual",
  CITYWALK_LEGAL_OPERATOR_NAME: "Synthetic Public Operator",
  CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Synthetic Street 1",
  CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Synthetic City",
  CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
};
const pages = [
  { path: "/privacy", page: PrivacyPage, metadata: privacyMetadata, heading: "Privacy notice" },
  { path: "/terms", page: TermsPage, metadata: termsMetadata, heading: "Terms of use" },
  { path: "/imprint", page: ImprintPage, metadata: imprintMetadata, heading: "Imprint" },
];

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe.each(pages)("$path public legal route", ({ path, page, metadata, heading }) => {
  it("renders an explicit noindex launch blocker without identity", async () => {
    for (const key of Object.keys(identity)) vi.stubEnv(key, "");
    render(await page());
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeDefined();
    expect(screen.getByRole("note").textContent).toContain("configuration is incomplete");
    expect((await metadata()).robots).toEqual({ index: false, follow: false });
    expect((await sitemap()).some(item => item.url.endsWith(path))).toBe(false);
  });

  it("uses runtime identity and exposes metadata and accessible navigation", async () => {
    for (const [key, value] of Object.entries(identity)) vi.stubEnv(key, value);
    render(await page());
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByText(identity.CITYWALK_LEGAL_OPERATOR_NAME)).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Legal navigation" })).toBeDefined();
    for (const [name, href] of [["Privacy", "/privacy"], ["Terms", "/terms"], ["Imprint", "/imprint"], ["Account deletion", "/account-deletion"], ["Support", "/support"]]) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
    }
    const result = await metadata();
    expect(result.alternates).toEqual({ canonical: `https://getcitywalk.com${path}` });
    expect(result.robots).toEqual({ index: true, follow: true });
    expect((await sitemap()).some(item => item.url.endsWith(path))).toBe(true);
  });
});

it("keeps the approved native-only purchase policy in public Terms", async () => {
  for (const [key, value] of Object.entries(identity)) vi.stubEnv(key, value);
  render(await TermsPage());
  expect(screen.getByText(/through supported native iOS and Android apps/i)).toBeDefined();
  expect(screen.getByText(/There is no website checkout for City Passes or subscriptions/i)).toBeDefined();
  expect(screen.queryByText(/28-day launch access/i)).toBeNull();
  expect(screen.queryByText(/Stripe/i)).toBeNull();
});
