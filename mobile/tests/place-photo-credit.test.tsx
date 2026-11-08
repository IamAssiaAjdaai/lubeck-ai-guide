// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("expo-router", () => ({ Link: ({ href, children }: React.PropsWithChildren<{ href: { pathname: string; params: { image: string } } }>) => <a href={`${href.pathname}?image=${href.params.image}`}>{children}</a> }));
vi.mock("react-native", () => ({ StyleSheet: { create: (s: unknown) => s } }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: "en" }) }));
vi.mock("../src/components/ui", () => ({ AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>, PressableSurface: ({ children, accessibilityLabel }: React.PropsWithChildren<{ accessibilityLabel: string }>) => <span aria-label={accessibilityLabel}>{children}</span> }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: ({ attribution }: { attribution?: { text: string } }) => attribution ? <p>{attribution.text}</p> : null }));
import { PlacePhotoCredit } from "../src/components/PlacePhotoCredit";
import { welcomePhotos } from "../src/lib/welcomeCopy";
import hubSource from "../src/app/city/[citySlug]/index.tsx?raw";
import exploreSource from "../src/app/city/[citySlug]/explore.tsx?raw";
afterEach(cleanup);
describe("place photo attribution presentation", () => {
  it("links the exact reviewed image to its full credit without a photo overlay", () => {
    render(<PlacePhotoCredit credit={welcomePhotos.find(photo => photo.id === "lubeck")} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/photo-credits?image=lubeck");
    expect(screen.getByLabelText("Image Credits: Holstentor in Lübeck Frontseite.jpg")).toBeTruthy();
    expect(hubSource).toContain("<PlacePhotoCredit credit={bundled.credit} />");
    expect(hubSource).not.toContain("styles.placePhotoCredit");
    expect(hubSource).toContain("<CityPhotoCredits");
    expect(exploreSource).toContain("<PlacePhotoCredit credit={photo?.credit} attribution={photo?.attribution} />");
  });
  it("preserves unreviewed CMS attribution verbatim next to the image", () => {
    const text = "Creator · Direct attribution required · https://example.org/original";
    render(<PlacePhotoCredit attribution={{ text }} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("does not centralize another license merely because the source matches", () => {
    const credit = { ...welcomePhotos[0], license: "https://example.org/terms" } as unknown as (typeof welcomePhotos)[number];
    render(<PlacePhotoCredit credit={credit} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/https:\/\/example.org\/terms/)).toBeTruthy();
  });
  it("adds no invented attribution to a placeholder", () => {
    const { container } = render(<PlacePhotoCredit />);
    expect(container.textContent).toBe("");
  });
});
