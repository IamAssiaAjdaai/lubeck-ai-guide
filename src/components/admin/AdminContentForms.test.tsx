import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlaceSourcesPanel, PublicationActions } from "@/components/admin/AdminContentForms";
import type { StaffAccess } from "@/lib/admin/permissions";

function staff(role: string): StaffAccess {
  return {
    membershipId: 1,
    userId: "staff-1",
    role,
    active: true,
    globalAccess: false,
    cityIds: [7],
  };
}

const action = vi.fn(async () => undefined);
const approveAndPublishAction = vi.fn(async () => undefined);

describe("editorial workflow actions", () => {
  it("shows submit, but not approval or publication, to an editor", () => {
    render(<PublicationActions action={action} cityId={7} entity="place" id={1} staff={staff("content_editor")} status="draft" />);
    expect(screen.getByRole("button", { name: "Send for review place" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Approve|Publish/ })).toBeNull();
  });

  it("shows a convenient combined action to the existing reviewer/publisher role", () => {
    render(<PublicationActions action={action} approveAndPublishAction={approveAndPublishAction} cityId={7} entity="place" id={1} staff={staff("reviewer_publisher")} status="in_review" />);
    expect(screen.getByRole("button", { name: "Approve & Publish place" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Request changes place" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve place" })).toBeNull();
  });

  it("shows a plain non-blocking reference warning and simple URL field", () => {
    render(<PlaceSourcesPanel action={action} canManage sourceLinks={[]} />);
    expect(screen.getByText("Add a reliable source before this content can be published.")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Reference link" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Add another reference" })).toBeTruthy();
    expect(screen.queryByText(/provenance|canonical normalization/i)).toBeNull();
  });

  it("shows publish only after approval and confirms archival", () => {
    const { rerender } = render(<PublicationActions action={action} cityId={7} entity="place" id={1} staff={staff("reviewer_publisher")} status="approved" />);
    expect(screen.getByRole("button", { name: "Publish place" })).toBeTruthy();
    rerender(<PublicationActions action={action} cityId={7} entity="place" id={1} staff={staff("reviewer_publisher")} status="published" />);
    expect(screen.getByRole("button", { name: "Archive place" })).toBeTruthy();
  });
});
