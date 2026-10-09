import { describe, expect, it } from "vitest";

import workflow from "../../../../automation/n8n/citywalk-approved-content-publisher.mock.json";

function nodeJson(name: string): string {
  return JSON.stringify(workflow.nodes.find((node) => node.name === name));
}

describe("mock n8n marketing publisher workflow", () => {
  it("keeps the exported workflow inactive and uses the dedicated mock webhook", () => {
    expect(workflow.active).toBe(false);

    const webhook = nodeJson("Approval Webhook");
    expect(webhook).toContain("citywalk-marketing-approved-mock");
    expect(webhook).toContain('"responseMode":"lastNode"');
  });

  it("preserves the required state-machine node order", () => {
    const nextNode = (name: string) =>
      workflow.connections[name as keyof typeof workflow.connections]
        ?.main?.[0]?.[0]?.node;

    expect(nextNode("Approval Webhook")).toBe("Validate Approval Event");
    expect(nextNode("Validate Approval Event")).toBe("Mark Ready");
    expect(nextNode("Mark Ready")).toBe("Mock Instagram Publisher");
    expect(nextNode("Mock Instagram Publisher")).toBe("Mark Published");
  });

  it("calls only machine-safe ready and published CITYWALK endpoints", () => {
    expect(nodeJson("Mark Ready")).toContain("/ready");
    expect(nodeJson("Mark Published")).toContain("/published");

    const serialized = JSON.stringify(workflow);
    expect(serialized).not.toContain("/approved");
    expect(serialized).not.toContain("in_review");
  });

  it("references runtime secrets instead of committing credential values", () => {
    const serialized = JSON.stringify(workflow);

    expect(serialized).toContain("$env.CITYWALK_AUTOMATION_SECRET");
    expect(nodeJson("Validate Approval Event")).toContain(
      "$env.CITYWALK_MARKETING_APPROVED_WEBHOOK_SECRET",
    );
    expect(nodeJson("Mark Ready")).toContain(
      "={{ $env.CITYWALK_AUTOMATION_SECRET }}",
    );
    expect(nodeJson("Mark Published")).toContain(
      "={{ $env.CITYWALK_AUTOMATION_SECRET }}",
    );
  });

  it("uses a deterministic non-production URL for mock publishing", () => {
    expect(nodeJson("Mock Instagram Publisher")).toContain(
      "https://mock.citywalk.invalid/instagram/",
    );
  });
});
