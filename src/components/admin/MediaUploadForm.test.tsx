import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

describe("MediaUploadForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it("uploads directly and does not report completion before finalize succeeds", async () => {
    let finishFinalize: (() => void) | undefined;
    const finalize = new Promise<Response>((resolve) => {
      finishFinalize = () => resolve(Response.json({ assetId: 8, status: "pending_review" }));
    });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ assetId: 8, uploadUrl: "https://upload.example/object" }, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockImplementationOnce(() => finalize);
    render(<MediaUploadForm cities={[{ id: 3, name: "Lübeck" }]} />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff])], "gate.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("File"), file);
    fireEvent.submit(screen.getByRole("button", { name: "Upload media" }).closest("form")!);
    expect(await screen.findByRole("button", { name: "Verifying…" })).toHaveAttribute("aria-busy", "true");
    expect(push).not.toHaveBeenCalled();
    finishFinalize?.();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/media/8?saved=1"));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://upload.example/object");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/admin/media/8/finalize");
  });

  it("requires an exact locale field for audio", async () => {
    render(<MediaUploadForm cities={[{ id: 3, name: "Lübeck" }]} />);
    await userEvent.selectOptions(screen.getByLabelText("Media kind"), "audio");
    expect(screen.getByLabelText("Audio locale")).toBeRequired();
    expect(screen.getByRole("option", { name: "ar" })).toBeInTheDocument();
  });

  it("prefills an exact-locale replacement and asks finalize to attach it as a candidate", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ assetId: 8, uploadUrl: "https://upload.example/object" }, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ assetId: 8, status: "pending_review" }));
    render(<MediaUploadForm candidatePlaceId={21} cities={[{ id: 3, name: "Lübeck" }]} initialCityId={3} initialKind="audio" initialLocale="fr" />);
    expect(screen.getByLabelText("Media kind")).toHaveValue("audio");
    expect(screen.getByLabelText("Audio locale")).toHaveValue("fr");
    await userEvent.upload(screen.getByLabelText("File"), new File([Uint8Array.from([0x49, 0x44, 0x33])], "story.mp3", { type: "audio/mpeg" }));
    fireEvent.submit(screen.getByRole("button", { name: "Upload media" }).closest("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/media/8?saved=1"));
    expect(JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body))).toEqual({ candidatePlaceId: 21, locale: "fr" });
  });

  it("shows a safe failed state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ error: "File type is not allowed." }, { status: 400 }));
    render(<MediaUploadForm cities={[{ id: 3, name: "Lübeck" }]} />);
    await userEvent.upload(screen.getByLabelText("File"), new File(["svg"], "bad.svg", { type: "image/svg+xml" }));
    fireEvent.submit(screen.getByRole("button", { name: "Upload media" }).closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("File type is not allowed.");
    expect(push).not.toHaveBeenCalled();
  });
});
