import { describe, expect, it } from "vitest";

import { externalRequestOrigin } from "./requestOrigin";

describe("externalRequestOrigin", () => {
  it("uses the external Host when Next normalizes request.url", () => {
    const request = new Request("http://localhost:3101/api/account/delete-request", {
      headers: {
        host: "127.0.0.1:3101",
        "x-forwarded-proto": "http",
      },
    });

    expect(externalRequestOrigin(request)).toBe("http://127.0.0.1:3101");
  });

  it("preserves the direct request origin", () => {
    const request = new Request("https://getcitywalk.com/api/account/delete-request", {
      headers: { host: "getcitywalk.com" },
    });

    expect(externalRequestOrigin(request)).toBe("https://getcitywalk.com");
  });

  it("uses a valid forwarded protocol with the Host header", () => {
    const request = new Request("http://internal:3000/api/account/delete-request", {
      headers: {
        host: "getcitywalk.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(externalRequestOrigin(request)).toBe("https://getcitywalk.com");
  });

  it("ignores an invalid forwarded protocol", () => {
    const request = new Request("https://internal:3000/api/account/delete-request", {
      headers: {
        host: "getcitywalk.com",
        "x-forwarded-proto": "javascript",
      },
    });

    expect(externalRequestOrigin(request)).toBe("https://getcitywalk.com");
  });

  it("falls back to request.url when Host is missing", () => {
    const request = new Request("https://getcitywalk.com/api/account/delete-request");

    expect(externalRequestOrigin(request)).toBe("https://getcitywalk.com");
  });
});
