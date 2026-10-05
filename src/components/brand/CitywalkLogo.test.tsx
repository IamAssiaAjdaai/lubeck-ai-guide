import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CitywalkLogo } from "./CitywalkLogo";

describe("CitywalkLogo", () => {
  afterEach(cleanup);

  it("renders the shared route mark with the CITYWALK wordmark", () => {
    const { container } = render(<CitywalkLogo />);
    expect(screen.getByText("CITYWALK")).not.toBeNull();
    const mark = container.querySelector("svg");
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute("viewBox")).toBe("0 0 48 28");
  });

  it("keeps mark-only usage accessible", () => {
    render(<CitywalkLogo markOnly />);
    expect(screen.getByLabelText("CITYWALK")).not.toBeNull();
    expect(screen.queryByText("CITYWALK")).toBeNull();
  });
});
