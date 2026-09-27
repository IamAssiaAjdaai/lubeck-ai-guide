// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-image", () => ({
  Image: ({
    source,
    onError, onLoad,
    accessibilityLabel,
    placeholder, transition,
  }: {
    source: { uri: string };
    placeholder: unknown; transition: number;
    onError: () => void; onLoad?: () => void;
    accessibilityLabel: string;
  }) => <img data-placeholder={String(placeholder)} data-transition={transition} src={source.uri} alt={accessibilityLabel} onError={onError} onLoad={onLoad} />,
}));
vi.mock("react-native", () => ({
  View: ({
    children,
    accessibilityLabel, style,
  }: React.PropsWithChildren<{ accessibilityLabel: string; style?: unknown }>) => (
    <div role="img" aria-label={accessibilityLabel} data-style={JSON.stringify(style)}>
      {children}
    </div>
  ),
}));
vi.mock("../src/components/NativeIcon", () => ({
  NativeIcon: ({ ios }: { ios?: string }) => <span data-icon={ios}>Image unavailable</span>,
}));

import { NativeContentImage } from "../src/components/NativeContentImage";
afterEach(cleanup);

describe("native image delivery fallback (image bridge mocked)", () => {
  it("supplies an image placeholder and fade while the image bridge loads", () => {
    render(<NativeContentImage source={{ uri: "https://preview.example/photo.jpg" }} accessibilityLabel="Place" />);
    const image = screen.getByAltText("Place");
    expect(image.dataset.placeholder).toMatch(/content-placeholder\.svg$/);
    expect(Number(image.dataset.transition)).toBeGreaterThan(0);
  });
  it("tries published fallback after a delivery error, then exposes a labelled placeholder", () => {
    const onError = vi.fn();
    render(
      <NativeContentImage
        source={{ uri: "https://preview.example/api/media/city" }}
        fallbackSource={{
          uri: "https://preview.example/landmarks/holstentor.jpg",
        }}
        accessibilityLabel="Lübeck"
        onError={onError}
      />,
    );
    fireEvent.error(screen.getByAltText("Lübeck"));
    expect(screen.getByAltText("Lübeck").getAttribute("src")).toContain(
      "holstentor.jpg",
    );
    fireEvent.error(screen.getByAltText("Lübeck"));
    expect(screen.queryByAltText("Lübeck")).toBeNull();
    expect(screen.getByRole("img", { name: "Lübeck" }).textContent).toBe(
      "Image unavailable",
    );
    expect(onError).toHaveBeenCalledTimes(2);
  });
  it("resets a failed attempt when the city image changes", () => {
    const { rerender } = render(
      <NativeContentImage
        source={{ uri: "https://preview.example/failed" }}
        accessibilityLabel="City"
      />,
    );
    fireEvent.error(screen.getByAltText("City"));
    rerender(
      <NativeContentImage
        source={{ uri: "https://preview.example/next" }}
        accessibilityLabel="City"
      />,
    );
    expect(screen.getByAltText("City").getAttribute("src")).toContain("/next");
  });
  it("does not retry an identical fallback URL", () => {
    render(
      <NativeContentImage
        source={{ uri: "https://preview.example/same" }}
        fallbackSource={{ uri: "https://preview.example/same" }}
        accessibilityLabel="City"
      />,
    );
    fireEvent.error(screen.getByAltText("City"));
    expect(screen.queryByAltText("City")).toBeNull();
  });
});


it("keeps the successful detail photo and forwards load completion without switching to a fallback", () => {
  const onLoad = vi.fn(), onError = vi.fn();
  render(<NativeContentImage source={{ uri: "https://preview.example/landmarks/holstentor.jpg" }} fallbackSource={{ uri: "https://preview.example/backup.jpg" }} accessibilityLabel="Holstentor detail" onLoad={onLoad} onError={onError} />);
  const photo = screen.getByAltText("Holstentor detail");
  fireEvent.load(photo);
  expect(onLoad).toHaveBeenCalledOnce();
  expect(onError).not.toHaveBeenCalled();
  expect(photo.getAttribute("src")).toContain("/landmarks/holstentor.jpg");
});

it("keeps a missing place photo's dimensions and intentional category placeholder", () => {
  render(<NativeContentImage accessibilityLabel="Old Town" style={{ width: 96, height: 96 }} placeholderIcon={{ ios: "mappin", android: "place" }} />);
  const placeholder = screen.getByRole("img", { name: "Old Town" });
  expect(JSON.parse(placeholder.dataset.style!)[0]).toMatchObject({ width: 96, height: 96 });
  expect(placeholder.querySelector("[data-icon=mappin]")).toBeTruthy();
  expect(placeholder.querySelector("img")).toBeNull();
});
