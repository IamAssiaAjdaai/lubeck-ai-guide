import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrandContext } from "@marketing/core";
import { citywalkBrief } from "../../../packages/marketing-core/tests/fixtures";
import { BrandBriefForm } from "./BrandBriefForm";
import { BrandReviewPanel } from "./BrandReviewPanel";
import { correctionBrief } from "@/lib/marketing/brandContext/ui";
const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const c = () => createBrandContext(citywalkBrief, { projectId: "82c88f92-f734-4fdb-b2c4-a688580c2ba5", contextId: "8ef54fd0-962b-48a2-bf69-28ace4d30083", briefSourceId: "brief", createdAt: "2026-10-13T12:00:00Z" });
describe("Brand onboarding and explicit review", () => {
  it("submits generic brief input with an explicitly selected existing campaign", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, projectId: c().projectId, contextId: c().contextId, revision: 1 });
    render(<BrandBriefForm action={action} campaigns={[{ id: 9, cityId: 1, name: "Existing" }]} />);
    fireEvent.change(screen.getByLabelText("Unternehmensname"), { target: { value: "Independent SME" } });
    fireEvent.change(screen.getByLabelText(/Business Brief/), { target: { value: "Declared business input" } });
    fireEvent.change(screen.getByLabelText(/Bestehende Kampagne/), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Marke speichern" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 9, brief: expect.objectContaining({ identity: { name: "Independent SME" }, facts: [] }) })));
    expect(action.mock.calls[0][0]).not.toHaveProperty("reviewerId");
    expect(navigation.push).toHaveBeenCalledWith(`/admin/marketing/brands/${c().projectId}/${c().contextId}`);
  });
  it("retains corrections and focuses a stale conflict without retrying or overwriting", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, code: "STALE_REVISION", message: "Neuere Revision. Eingabe nicht gespeichert." });
    render(<BrandBriefForm action={action} initial={correctionBrief(c())} target={{ projectId: c().projectId, contextId: c().contextId, expectedRevision: 1 }} />);
    fireEvent.change(screen.getByLabelText("Unternehmensname"), { target: { value: "Unsaved edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Korrektur als neue Revision speichern" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Eingabe nicht gespeichert"));
    expect(screen.getByLabelText("Unternehmensname")).toHaveProperty("value", "Unsaved edit");
    expect(document.activeElement).toBe(screen.getByRole("alert"));
    expect(navigation.refresh).not.toHaveBeenCalled(); expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][0].expectedRevision).toBe(1);
  });
  it("requires selected facts plus an explicit human acknowledgement", async () => {
    const context = c(), action = vi.fn().mockResolvedValue({ ok: true, revision: 2 });
    render(<BrandReviewPanel context={context} action={action} />);
    const button = screen.getByRole("button", { name: "Ausgewählte Fakten bestätigen" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByLabelText(context.facts[0].statement));
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByLabelText(/Ich habe die ausgewählten/)); fireEvent.click(button);
    await waitFor(() => expect(action).toHaveBeenCalledWith({ projectId: context.projectId, contextId: context.contextId, command: { expectedRevision: 1, factIds: [context.facts[0].id] } }));
    expect(screen.getByRole("status").textContent).toContain("Revision 2");
  });
});
