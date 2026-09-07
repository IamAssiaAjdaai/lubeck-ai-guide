import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirect,
  revalidatePath,
  reviewAuthorizedMediaAsset,
  listAuthorizedMediaAssets,
} = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  reviewAuthorizedMediaAsset: vi.fn(),
  listAuthorizedMediaAssets: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/authorization.server", () => ({
  AdminAuthorizationError: class AdminAuthorizationError extends Error {},
}));
vi.mock("@/lib/media/service.server", () => ({
  archiveAuthorizedMediaAsset: vi.fn(),
  attachAuthorizedMedia: vi.fn(),
  createAuthorizedExternalVideo: vi.fn(),
  deleteAuthorizedArchivedMediaObject: vi.fn(),
  detachAuthorizedMedia: vi.fn(),
  listAuthorizedMediaAssets,
  reviewAuthorizedMediaAsset,
}));

import { reviewMediaAction } from "@/app/admin/(protected)/media-actions";
import MediaLibraryPage from "@/app/admin/(protected)/media/page";

describe("admin media review workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["approved", "rejected"] as const)(
    "redirects a successfully %s asset to its filtered library view",
    async (status) => {
      await reviewMediaAction(17, status);

      expect(reviewAuthorizedMediaAsset).toHaveBeenCalledWith(17, status);
      expect(revalidatePath).toHaveBeenCalledWith("/admin/media");
      expect(redirect).toHaveBeenCalledWith(
        `/admin/media?status=${status}&saved=1`,
      );
    },
  );

  it("shows the saved notice and only approved assets after approval", async () => {
    listAuthorizedMediaAssets.mockResolvedValue([
      mediaAsset(1, "approved", "approved.jpg"),
      mediaAsset(2, "rejected", "rejected.jpg"),
    ]);

    render(
      await MediaLibraryPage({
        searchParams: Promise.resolve({ status: "approved", saved: "1" }),
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Changes saved.");
    expect(screen.getByLabelText("Status filter")).toHaveValue("approved");
    expect(screen.getByText("approved.jpg")).toBeInTheDocument();
    expect(screen.queryByText("rejected.jpg")).not.toBeInTheDocument();
  });
});

function mediaAsset(
  id: number,
  approvalStatus: "approved" | "rejected",
  originalFilename: string,
) {
  return {
    id,
    assetKey: `00000000-0000-4000-8000-00000000000${id}`,
    cityId: 1,
    kind: "image" as const,
    sourceType: "upload" as const,
    storageProvider: "s3-test",
    objectKey: `media/${id}/image.jpg`,
    originalFilename,
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    expectedSizeBytes: 1024,
    checksumSha256: null,
    width: null,
    height: null,
    durationSeconds: null,
    locale: null,
    approvalStatus,
    externalVideoProvider: null,
    externalVideoId: null,
    canonicalUrl: null,
    archivedAt: null,
    uploadExpiresAt: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    usageCount: 0,
  };
}
