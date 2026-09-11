import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaRightsPanel } from "@/components/admin/MediaRightsPanel";

afterEach(cleanup);

const rights = {
  mediaAssetId: 232,
  rightsBasis: "licensed" as const,
  creator: "Photographer",
  rightsHolder: "Archive",
  attributionRequired: true,
  attributionText: "Photo: Photographer / Archive",
  evidenceReference: "License contract 42",
  rightsNotes: "Internal only",
  verifiedAt: null,
  verifiedByUserId: null,
  createdByUserId: "editor-1",
  updatedByUserId: "editor-1",
  createdAt: new Date("2026-09-11T10:00:00.000Z"),
  updatedAt: new Date("2026-09-11T10:00:00.000Z"),
};

describe("media rights admin panel", () => {
  it("lets editors prepare metadata without showing a verification action", () => {
    render(
      <MediaRightsPanel
        canManage
        canVerify={false}
        deleteAction={vi.fn()}
        rights={rights}
        rightsStatus="unverified"
        saveAction={vi.fn()}
        verifyAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Save rights metadata" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify rights" })).not.toBeInTheDocument();
    expect(screen.getByText("Rights unverified")).toBeInTheDocument();
  });

  it("lets a publisher verify prepared rights without granting edit controls", () => {
    render(
      <MediaRightsPanel
        canManage={false}
        canVerify
        deleteAction={vi.fn()}
        rights={rights}
        rightsStatus="unverified"
        saveAction={vi.fn()}
        verifyAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Verify rights" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save rights metadata" })).not.toBeInTheDocument();
    expect(screen.getByText("License contract 42")).toBeInTheDocument();
  });

  it("classifies an existing asset with no rights record as unverified", () => {
    render(
      <MediaRightsPanel
        canManage={false}
        canVerify
        deleteAction={vi.fn()}
        rightsStatus="unverified"
        saveAction={vi.fn()}
        verifyAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Rights unverified")).toBeInTheDocument();
    expect(screen.getByText("No rights provenance has been recorded.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify rights" })).not.toBeInTheDocument();
  });
});
