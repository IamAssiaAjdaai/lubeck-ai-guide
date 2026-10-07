import { describe, expect, it, vi } from "vitest";

import { emitOperationalFailure } from "./operationalEvent";

describe("operational failure events", () => {
  it("emits only the fixed privacy-safe event contract", () => {
    const sink = vi.fn();
    const event = emitOperationalFailure(
      {
        category: "commerce",
        code: "REVENUECAT_WEBHOOK_PROCESSING_FAILED",
        severity: "critical",
        retryable: true,
        httpStatus: 500,
      },
      {
        environment: {
          CITYWALK_RUNTIME_ENV: "production",
          CITYWALK_RELEASE: "release-abc123",
          DATABASE_URL: "postgresql://private-user:private-password@secret-host/db",
          GROQ_API_KEY: "secret-groq-key",
        },
        now: new Date("2026-10-07T14:30:00.000Z"),
        sink,
      },
    );

    expect(event).toEqual({
      event: "citywalk_operational_failure",
      category: "commerce",
      code: "REVENUECAT_WEBHOOK_PROCESSING_FAILED",
      severity: "critical",
      environment: "production",
      release: "release-abc123",
      occurredAt: "2026-10-07T14:30:00.000Z",
      retryable: true,
      httpStatus: 500,
    });
    expect(sink).toHaveBeenCalledOnce();

    const serialized = sink.mock.calls[0][0] as string;
    expect(JSON.parse(serialized)).toEqual(event);
    expect(serialized).not.toMatch(
      /private-user|private-password|secret-host|secret-groq-key|DATABASE_URL|GROQ_API_KEY/,
    );
  });

  it("fails release metadata closed when it is not a safe identifier", () => {
    const event = emitOperationalFailure(
      {
        category: "ai",
        code: "AI_GUIDE_REQUEST_FAILED",
        severity: "error",
        retryable: true,
      },
      {
        environment: {
          CITYWALK_RUNTIME_ENV: "preview",
          CITYWALK_RELEASE: "unsafe release with spaces and user@example.com",
        },
        sink: vi.fn(),
      },
    );

    expect(event.environment).toBe("preview");
    expect(event.release).toBe("unknown");
    expect(event).not.toHaveProperty("message");
    expect(event).not.toHaveProperty("error");
    expect(event).not.toHaveProperty("context");
  });

  it("drops invalid HTTP status metadata instead of serializing arbitrary values", () => {
    const event = emitOperationalFailure(
      {
        category: "media",
        code: "MEDIA_DELIVERY_FAILED",
        severity: "error",
        retryable: true,
        httpStatus: 999,
      },
      { environment: { NODE_ENV: "test" }, sink: vi.fn() },
    );

    expect(event.environment).toBe("test");
    expect(event).not.toHaveProperty("httpStatus");
  });
});
