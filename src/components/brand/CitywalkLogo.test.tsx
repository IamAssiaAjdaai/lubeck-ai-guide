import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CitywalkLogo } from "./CitywalkLogo";

describe("CitywalkLogo", () => {
  afterEach(cleanup);

  it("renders the approved pin-and-route mark with the CITYWALK wordmark", () => {
    const { container } = render(<CitywalkLogo />);
    expect(screen.getByText("CITYWALK")).not.toBeNull();
    const mark = container.querySelector("svg");
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute("viewBox")).toBe("334 220 590 822");
    expect(container.querySelector('[id^="citywalk-pin-"]')).not.toBeNull();
    expect(container.querySelector('[id^="citywalk-route-"]')).not.toBeNull();
    expect(container.querySelector("circle")).toBeNull();
  });

  it("keeps gradient ids unique when the logo appears more than once", () => {
    const { container } = render(
      <>
        <CitywalkLogo />
        <CitywalkLogo markOnly />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps mark-only usage accessible", () => {
    render(<CitywalkLogo markOnly />);
    expect(screen.getByLabelText("CITYWALK")).not.toBeNull();
    expect(screen.queryByText("CITYWALK")).toBeNull();
  });
});
