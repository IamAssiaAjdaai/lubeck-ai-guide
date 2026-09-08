import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getAuthorizedContentOperations = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/operations/service.server", () => ({ getAuthorizedContentOperations }));
vi.mock("@/app/admin/(protected)/operations/actions", () => ({
  generateAudioDraftAction: vi.fn(),
  makeAudioLiveAction: vi.fn(),
}));

import AudioOperationsPage from "@/app/admin/(protected)/operations/audio/page";
import TranslationOperationsPage from "@/app/admin/(protected)/operations/translations/page";

const publishedLocalization = {
  locale: "de" as const,
  name: "Holstentor",
  shortDescription: "Stadttor",
  description: undefined,
  story: "Geschichte",
  visitNotes: undefined,
  facts: [],
};

function data() {
  return {
    cities: [{ id: 1, name: "Lübeck", localizations: [{ name: "Lübeck" }] }],
    places: [{
      id: 2,
      cityId: 1,
      slug: "holstentor",
      publicationStatus: "draft",
      localizations: [{ ...publishedLocalization, description: null, visitNotes: null }],
      publishedRevision: { snapshot: { localizations: [publishedLocalization] } },
      audio: [],
    }],
    generationConfigured: false,
    capabilities: { canManageTranslations: true, canManageMedia: true, canReview: false, canPublish: false },
  };
}

describe("content operations pages", () => {
  beforeEach(() => getAuthorizedContentOperations.mockResolvedValue(data()));
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("renders translation matrix cells as links to the existing locale editor", async () => {
    render(await TranslationOperationsPage({ searchParams: Promise.resolve({ cityId: "1", view: "matrix" }) }));
    expect(screen.getByRole("heading", { name: /Translation coverage/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Published" })).toHaveAttribute("href", "/admin/places/2?locale=de");
  });

  it("offers exact-locale upload orchestration without pretending TTS is configured", async () => {
    render(await AudioOperationsPage({ searchParams: Promise.resolve({ cityId: "1", view: "matrix" }) }));
    expect(screen.getByText("Audio generation is not configured. Uploads remain available.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Upload audio" })[0]).toHaveAttribute(
      "href",
      "/admin/media/new?cityId=1&placeId=2&kind=audio&locale=de",
    );
    expect(screen.queryByRole("button", { name: "Generate draft" })).not.toBeInTheDocument();
  });

  it("shows an approved candidate as Ready with publisher-only make-live action", async () => {
    const value = data();
    value.capabilities.canPublish = true;
    value.places[0]!.audio = [{
      attachment: { placeId: 2, purpose: "audio", locale: "de", position: 1 },
      asset: { id: 9, locale: "de", approvalStatus: "approved" },
      generation: null,
    }] as never;
    getAuthorizedContentOperations.mockResolvedValue(value);
    render(await AudioOperationsPage({ searchParams: Promise.resolve({ cityId: "1", view: "matrix" }) }));
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make live" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Listen" })).toHaveAttribute("href", "/admin/media/9");
  });
});
