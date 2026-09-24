import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MediaAttribution } from "@/components/travel/MediaAttribution";

describe("MediaAttribution", () => {
  afterEach(cleanup);

  it("renders required attribution visibly and linkifies only public web URLs", () => {
    render(
      <MediaAttribution
        attribution={{
          creator: "Example Photographer",
          text: "Photo: Example Photographer · https://example.com · CC BY-SA 4.0 · https://creativecommons.org/licenses/by-sa/4.0/",
        }}
      />,
    );

    expect(screen.getByText(/Photo: Example Photographer/)).not.toBeNull();
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "https://example.com",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    ]);
  });

  it("renders nothing when public attribution is absent", () => {
    const { container } = render(<MediaAttribution />);
    expect(container.childElementCount).toBe(0);
  });
});
