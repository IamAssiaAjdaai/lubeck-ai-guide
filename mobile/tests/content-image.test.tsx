// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-image", () => ({
  Image: ({
    source,
    onError,
    accessibilityLabel,
  }: {
    source: { uri: string };
    onError: () => void;
    accessibilityLabel: string;
  }) => <img src={source.uri} alt={accessibilityLabel} onError={onError} />,
}));
vi.mock("react-native", () => ({
  View: ({
    children,
    accessibilityLabel,
  }: React.PropsWithChildren<{ accessibilityLabel: string }>) => (
    <div role="img" aria-label={accessibilityLabel}>
      {children}
    </div>
  ),
}));
vi.mock("../src/components/NativeIcon", () => ({
  NativeIcon: () => <span>Image unavailable</span>,
}));

import { NativeContentImage } from "../src/components/NativeContentImage";
afterEach(cleanup);

describe("native image delivery fallback (image bridge mocked)", () => {
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
