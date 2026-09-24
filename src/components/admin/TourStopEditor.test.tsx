import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TourStopEditor } from "@/components/admin/TourStopEditor";

const places = [
  { id: 1, cityId: 7, name: "First place" },
  { id: 2, cityId: 7, name: "Second place" },
];

describe("TourStopEditor", () => {
  it("adds, reorders, and removes deterministic stop IDs", async () => {
    const user = userEvent.setup();
    render(<TourStopEditor initialStopIds={[1]} places={places} />);
    const hiddenInput = document.querySelector(
      'input[name="stopPlaceIds"]',
    );

    await user.selectOptions(screen.getByRole("combobox"), "2");
    await user.click(screen.getByRole("button", { name: "Add stop" }));
    expect(hiddenInput).toHaveValue("1\n2");

    await user.click(screen.getByRole("button", { name: "Move stop 2 up" }));
    expect(hiddenInput).toHaveValue("2\n1");

    await user.click(screen.getByRole("button", { name: "Remove stop 1" }));
    expect(hiddenInput).toHaveValue("1");
  });
});
