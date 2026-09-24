import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  archiveMediaFromLibraryAction,
  cancelUploadAction,
  deleteMediaObjectFromLibraryAction,
  retryFinalizeMediaAction,
} = vi.hoisted(() => ({
  archiveMediaFromLibraryAction: vi.fn(),
  cancelUploadAction: vi.fn(),
  deleteMediaObjectFromLibraryAction: vi.fn(),
  retryFinalizeMediaAction: vi.fn(),
}));

vi.mock("@/app/admin/(protected)/media-actions", () => ({
  archiveMediaFromLibraryAction,
  cancelUploadAction,
  deleteMediaObjectFromLibraryAction,
  retryFinalizeMediaAction,
}));

import {
  getMediaRowActionIds,
  MediaRowActions,
} from "@/components/admin/MediaRowActions";

const manageable = {
  sourceType: "upload" as const,
  hasStoredObject: true,
  usageCount: 0,
  canManage: true,
};

describe("MediaRowActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    ["uploading", ["retry-finalize", "cancel-upload", "open-details"]],
    ["pending_review", ["open-details", "archive"]],
    ["approved", ["open-details", "archive"]],
    ["rejected", ["open-details", "archive"]],
    ["archived", ["open-details", "delete-object"]],
  ] as const)("exposes the correct actions for %s", (status, expected) => {
    expect(getMediaRowActionIds({ ...manageable, status })).toEqual(expected);
  });

  it("hides mutations that permissions or usage protections do not allow", () => {
    expect(
      getMediaRowActionIds({
        ...manageable,
        status: "approved",
        canManage: false,
      }),
    ).toEqual(["open-details"]);
    expect(
      getMediaRowActionIds({
        ...manageable,
        status: "approved",
        usageCount: 1,
      }),
    ).toEqual(["open-details"]);
    expect(
      getMediaRowActionIds({
        ...manageable,
        status: "archived",
        sourceType: "external",
        hasStoredObject: false,
      }),
    ).toEqual(["open-details"]);
  });

  it("opens from the keyboard, moves focus, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<MediaRowActions {...manageable} assetId={17} canReview status="uploading" />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();

    await user.keyboard("{ArrowDown}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Media actions" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Retry finalize" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Cancel upload" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("labels pending review details and confirms destructive actions", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MediaRowActions {...manageable} assetId={17} canReview status="pending_review" />);

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(
      screen.getByRole("menuitem", { name: "Review / open details" }),
    ).toHaveAttribute("href", "/admin/media/17");
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(window.confirm).toHaveBeenCalledWith(
      "Archive this unreferenced media asset?",
    );
    expect(archiveMediaFromLibraryAction).not.toHaveBeenCalled();
  });

  it("requires confirmation before cancelling an incomplete upload", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MediaRowActions {...manageable} assetId={17} canReview status="uploading" />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Cancel upload" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Cancel this incomplete upload and delete its stored object if present?",
    );
    expect(cancelUploadAction).not.toHaveBeenCalled();
  });

  it("requires confirmation before deleting an archived stored object", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MediaRowActions {...manageable} assetId={17} canReview status="archived" />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Delete stored object" }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Permanently delete this unreferenced stored object? The archived asset metadata will remain.",
    );
    expect(deleteMediaObjectFromLibraryAction).not.toHaveBeenCalled();
  });
});
