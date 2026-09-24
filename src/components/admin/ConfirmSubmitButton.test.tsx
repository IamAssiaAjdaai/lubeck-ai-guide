import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SubmitEventHandler } from "react";

import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";

describe("ConfirmSubmitButton", () => {
  it("blocks destructive form submission when confirmation is declined", async () => {
    const user = userEvent.setup();
    const submit = vi.fn<SubmitEventHandler<HTMLFormElement>>(
      (event) => event.preventDefault(),
    );
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <form onSubmit={submit}>
        <ConfirmSubmitButton confirmation="Delete this draft?">
          Delete draft
        </ConfirmSubmitButton>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Delete draft" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete this draft?");
    expect(submit).not.toHaveBeenCalled();
  });
});
