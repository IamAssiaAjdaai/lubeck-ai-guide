// @vitest-environment-options {"url":"https://citywalk.example"}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FinishWalkScreen from "./FinishWalkScreen";

const getSession = vi.fn();
vi.mock("@/lib/auth/client", () => ({ authClient: { getSession: (...args: unknown[]) => getSession(...args) } }));
const origin = { lat: 53.8, lng: 10.6 };
const shareRoute = {
  citySlug: "lubeck",
  stopSlugs: ["second", "first"],
  settings: { minutes: 60, start: origin, interests: ["history" as const], walking: "balanced" as const },
};
const id = "11111111-1111-4111-8111-111111111111";
const post = vi.fn();
const publicGet = vi.fn();
function mount() {
  render(
    <FinishWalkScreen locale="en" citySlug="lubeck" cityName="Lübeck"
      visited={[]} shareRoute={shareRoute} historyDistance={0} elapsedMinutes={10}
      save={vi.fn()} setMessage={vi.fn()} feedback={vi.fn()} customize={vi.fn()} />,
  );
}
beforeEach(() => {
  expect(window.location.protocol).toBe("https:");
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { user: { id: "sender-id" } } });
  post.mockReset(); publicGet.mockReset();
  post.mockResolvedValue(Response.json({ id }, { status: 201 }));
  publicGet.mockResolvedValue(Response.json({ version: 1, route: shareRoute }));
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) =>
    url === "/api/shared-walks" ? post(url, init) : publicGet(url, init),
  ));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Finish Walk public sharing", () => {
  it("renders English fallback for supported locales without custom share copy", () => {
    render(
      <FinishWalkScreen locale="da" citySlug="lubeck" cityName="Lübeck"
        visited={[]} shareRoute={shareRoute} historyDistance={0} elapsedMinutes={10}
        save={vi.fn()} setMessage={vi.fn()} feedback={vi.fn()} customize={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Create share link" })).toBeTruthy();
  });
  it("creates and checks an authenticated HTTPS public link, without progress or private identity in the body", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Create share link" }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(post).toHaveBeenCalledOnce();
    expect(JSON.parse(post.mock.calls[0][1].body).stopSlugs).toEqual(["second", "first"]);
    expect(post.mock.calls[0][1].headers["X-Citywalk-Account"]).toBe("sender-id");
    expect(post.mock.calls[0][1].body).not.toContain("sender-id");
    expect(publicGet.mock.calls[0][1].credentials).toBe("omit");
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
      "https://citywalk.example/en/shared-walk/" + id,
    );
  });
  it("rejects unauthenticated sender, without POST or fabricated URL", async () => {
    getSession.mockResolvedValueOnce({ data: null });
    mount(); fireEvent.click(screen.getByRole("button", { name: "Create share link" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Sign in/);
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("rejects unavailable GET, never exposes a link when verification fails", async () => {
    publicGet.mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 404 }));
    mount(); fireEvent.click(screen.getByRole("button", { name: "Create share link" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't create/i);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("rejects server response with a changed stop order", async () => {
    publicGet.mockResolvedValueOnce(Response.json({ version: 1, route: { ...shareRoute, stopSlugs: ["first", "second"] } }));
    mount(); fireEvent.click(screen.getByRole("button", { name: "Create share link" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't create/i);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
