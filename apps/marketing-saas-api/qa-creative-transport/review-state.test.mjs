// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
const mock = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../../marketing-saas/src/api", () => ({ api: mock.api }));
import CreativeStudio from "../../marketing-saas/src/CreativeStudio";
import { initialState, limits } from "../src/creative/contract";
afterEach(() => {
  cleanup();
  mock.api.mockReset();
});
describe("real-provider review error disclosure using authored API state only", () => {
  it.each([
    "IMAGE_COMPOSITION_FAILED",
    "IMAGE_REQUEST_REJECTED",
    "CREATIVE_KILL_SWITCH",
    "IMAGE_TIMEOUT",
  ])(
    "%s never claims zero costs or suggests generating a replacement",
    async (error) => {
      const kit = initialState().kit;
      mock.api.mockImplementation(async (path) =>
        path === "/api/creative-capabilities"
          ? { enabled: true }
          : {
              provider: "openai",
              revision: 1,
              kit,
              assets: [],
              facts: [],
              contextRevision: 2,
              usage: { limits, entries: [] },
              jobs: [
                {
                  id: "synthetic-job",
                  kind: "image",
                  provider: "openai",
                  state: "failed",
                  providerPending: true,
                  error,
                  expiresAt: new Date(Date.now() + 600000).toISOString(),
                  brief: {
                    schemaVersion: 1,
                    synthetic: true,
                    objective: "leistung_erklaeren",
                    ratio: "1:1",
                    facts: [],
                    editorialText: "Fiktiver Review-Test",
                    constraints: [],
                    kit,
                    binding: {
                      generationId: "synthetic-generation",
                      version: 1,
                      postIndex: 0,
                    },
                  },
                },
              ],
            },
      );
      render(
        createElement(CreativeStudio, {
          projectId: "synthetic-project",
          generationId: "synthetic-generation",
          version: 1,
          locked: false,
        }),
      );
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Die Kostenlage ist unklar");
      expect(alert.textContent).toContain("keinen Ersatzauftrag starten");
      expect(screen.queryByText(/0 € echte Anbieter-Kosten/)).toBeNull();
      expect(
        screen.getByRole("option", { name: /Mit freigegebenen Referenzen/ })
          .disabled,
      ).toBe(true);
    },
  );
});
