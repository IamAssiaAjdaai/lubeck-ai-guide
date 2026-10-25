import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queue: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/content/publishingQueue.server", () => ({ listAuthorizedPublishingQueue: mocks.queue }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import PublishingPage from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("publishing review page", () => {
  it("links each content type to the established authorized editor without write controls", async () => {
    mocks.queue.mockResolvedValue({ items: ["city", "place", "tour"].map((entity, i) => ({ entity, id: i + 1, cityId: 1, cityName: "Lübeck", slug: `${entity}-draft`, publicationStatus: ["draft", "in_review", "approved"][i], updatedAt: new Date("2026-10-25T12:00:00Z") })), hasMore: false });
    render(await PublishingPage());
    expect(screen.getByRole("link", { name: "Review city-draft" })).toHaveAttribute("href", "/admin/cities/1");
    expect(screen.getByRole("link", { name: "Review place-draft" })).toHaveAttribute("href", "/admin/places/2");
    expect(screen.getByRole("link", { name: "Review tour-draft" })).toHaveAttribute("href", "/admin/tours/3");
    expect(screen.getByText("Waiting for review")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("shows a scoped empty state", async () => {
    mocks.queue.mockResolvedValue({ items: [], hasMore: false });
    render(await PublishingPage());
    expect(screen.getByText("No unpublished content to review in your assigned cities.")).toBeInTheDocument();
  });
  it.each([[401, "/admin/login"], [403, "/admin/unauthorized?reason=capability"]] as const)("redirects denied status %i", async (status, href) => {
    mocks.queue.mockRejectedValue(new AdminAuthorizationError(status, status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN"));
    await expect(PublishingPage()).rejects.toThrow(`redirect:${href}`);
  });
  it("propagates storage failures instead of claiming the queue is empty", async () => {
    mocks.queue.mockRejectedValue(new Error("database unavailable"));
    await expect(PublishingPage()).rejects.toThrow("database unavailable");
  });
});
