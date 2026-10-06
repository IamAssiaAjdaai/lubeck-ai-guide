import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const privacySource = source("src/app/privacy/page.tsx");
const instrumentationSource = source("instrumentation-client.ts");
const visitorSessionSource = source("src/lib/visitorSession.ts");

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
