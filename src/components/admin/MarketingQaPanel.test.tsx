import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketingQaPanel } from "./MarketingQaPanel";

afterEach(cleanup);

describe("Marketing QA CMS results panel", () => {
  it("offers a button to review saved drafts with no implicit approval", () => {
    render(<MarketingQaPanel action={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Run QA" })).toBeTruthy();
    expect(screen.getByText(/Save your edits first/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /approve|publish/i })).toBeNull();
  });

  it("shows explainable deterministic warnings and the evidence gap", async () => {
    const action = vi.fn(async () => ({
      findings: [{
        severity: "warning" as const,
        checkId: "cta.weak",
        message: "The CTA is generic and should describe an action.",
        affectedField: "cta",
        evidence: [{ kind: "field" as const, id: "cta", label: "CTA" }],
        origin: "deterministic" as const,
      }],
      factualCertification: "not_certified" as const,
      aiStatus: "skipped" as const,
    }));
    render(<MarketingQaPanel action={action} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByText("1 finding to review")).toBeTruthy();
    expect(screen.getByText(/CTA is generic/)).toBeTruthy();
    expect(screen.getByText(/Field: cta/)).toBeTruthy();
    expect(screen.getByText(/Evidence: field: CTA/)).toBeTruthy();
    expect(screen.getByText(/Factual accuracy is not certified/)).toBeTruthy();
    expect(screen.getByText(/The AI provider was not used/)).toBeTruthy();
    expect(action).toHaveBeenCalledOnce();
  });

  it("reruns the action after changes and replaces stale findings", async () => {
    const action = vi.fn()
      .mockResolvedValueOnce({
        findings: [{
          severity: "warning",
          checkId: "field.too_long",
          message: "Caption exceeds the mobile copy limit.",
          origin: "deterministic",
        }],
        factualCertification: "not_certified",
        aiStatus: "skipped",
      })
      .mockResolvedValueOnce({
        findings: [],
        factualCertification: "not_certified",
        aiStatus: "skipped",
      });

    const user = userEvent.setup();
    render(<MarketingQaPanel action={action} />);
    await user.click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByText(/Caption exceeds/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Run QA again" }));
    await waitFor(() => expect(screen.getByText(/No issues detected by the available checks/)).toBeTruthy());
    expect(screen.queryByText(/Caption exceeds/)).toBeNull();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("shows a safe generic error without leaking provider or auth details", async () => {
    render(<MarketingQaPanel action={vi.fn(async () => {
      throw new Error("SECRET_API_KEY sensitive");
    })} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).not.toContain("SECRET_API_KEY");
  });
  it("allows the editor to choose verified place evidence explicitly", async () => {
    const action = vi.fn(async (_placeId?: number) => ({
      findings: [{
        severity: "info" as const,
        checkId: "facts.scope_limited",
        message: "Only English facts for the selected place are available.",
        origin: "deterministic" as const,
      }],
      factualCertification: "not_certified" as const,
      aiStatus: "reviewed" as const,
    }));
    const user = userEvent.setup();
    render(<MarketingQaPanel action={action} verifiedPlaces={[
      { id: 21, slug: "holstentor" },
      { id: 22, slug: "marienkirche" },
    ]} />);
    expect(screen.getByText(/No place selected/)).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: /Verified place context/ }), "21");
    await user.click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByText(/Only English facts/)).toBeTruthy();
    expect(action).toHaveBeenCalledWith(21);
    expect(screen.getByText(/Factual accuracy is not certified/)).toBeTruthy();
  });

  it("clears stale findings when the selected place changes", async () => {
    const action = vi.fn(async () => ({
      findings: [{
        severity: "warning" as const,
        checkId: "ai.evidence_gap",
        message: "No evidence for the claimed opening hours.",
        origin: "ai_assisted" as const,
      }],
      factualCertification: "not_certified" as const,
      aiStatus: "reviewed" as const,
    }));
    const user = userEvent.setup();
    render(<MarketingQaPanel action={action} verifiedPlaces={[
      { id: 21, slug: "holstentor" },
    ]} />);
    await user.click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByText(/claimed opening hours/)).toBeTruthy();
    const selector = screen.getByRole("combobox", { name: /Verified place context/ }) as HTMLSelectElement;
    // Report rendering can precede transition completion; disabled selects ignore user input.
    await waitFor(() => expect(selector.disabled).toBe(false));
    await user.selectOptions(selector, "21");
    expect(selector.value).toBe("21");
    expect(screen.queryByText(/claimed opening hours/)).toBeNull();
    expect(screen.getByRole("button", { name: "Run QA" })).toBeTruthy();
  });

  it("explains missing source evidence when no place was selected", async () => {
    const action = vi.fn(async () => ({
      findings: [{
        severity: "warning" as const,
        checkId: "ai.evidence_unavailable",
        message: "Verified fact sources were not supplied.",
        origin: "deterministic" as const,
      }],
      factualCertification: "not_certified" as const,
      aiStatus: "skipped" as const,
    }));
    render(<MarketingQaPanel action={action} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByText(/Verified fact sources were not supplied/)).toBeTruthy();
    expect(screen.getByText(/No verified place was selected/)).toBeTruthy();
  });

  it("hides the verified-place selector on unverified CMS place drafts", async () => {
    const action = vi.fn(async () => ({
      findings: [{
        severity: "warning" as const,
        checkId: "sources.missing",
        message: "No source is linked to this place.",
        origin: "deterministic" as const,
      }],
      factualCertification: "not_certified" as const,
      aiStatus: "skipped" as const,
    }));
    render(<MarketingQaPanel action={action} showPlaceSelection={false} />);
    expect(screen.queryByRole("combobox", { name: /Verified place context/ })).toBeNull();
    expect(screen.getByText(/Place draft facts and linked references are not verified knowledge/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Run QA" }));
    expect(await screen.findByText(/No source is linked to this place/)).toBeTruthy();
    expect(action).toHaveBeenCalledWith(undefined);
  });

});
