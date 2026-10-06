import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const privacySource = readFileSync(
  new URL("../app/privacy/page.tsx", import.meta.url),
  "utf8",
);
const instrumentationSource = readFileSync(
  new URL("../../../instrumentation-client.ts", import.meta.url),
  "utf8",
);
const visitorSessionSource = readFileSync(
  new URL("../lib/visitorSession.ts", import.meta.url),
  "utf8",
);

describe("privacy analytics disclosure", () => {
  it("stays aligned with the optional PostHog runtime", () => {
    expect(instrumentationSource).toContain("posthog.init");
    expect(instrumentationSource).toContain("capture_exceptions: true");
    expect(privacySource).toContain("When the public PostHog project token and host are configured");
    expect(privacySource).toContain("client exception capture");
    expect(privacySource).not.toContain("does not activate PostHog analytics");
  });

  it("discloses the browser pseudonymous identifier lifetimes encoded in code", () => {
    expect(visitorSessionSource).toContain("ANONYMOUS_VISITOR_RETENTION_MS = 180 * DAY_MS");
    expect(visitorSessionSource).toContain("VISITOR_SESSION_RETENTION_MS = DAY_MS");
    expect(privacySource).toContain("up to 180 days");
    expect(privacySource).toContain("up to 24 hours");
  });

  it("keeps sensitive location and account identifiers outside the analytics claim", () => {
    expect(privacySource).toContain("do not intentionally attach raw latitude/longitude");
    expect(privacySource).toContain("account email addresses or authentication tokens");
  });
});
