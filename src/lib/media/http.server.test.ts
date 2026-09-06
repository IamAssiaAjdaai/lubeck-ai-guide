import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertTrustedMutationOrigin } from "@/lib/media/http.server";

describe("media mutation origin", () => {
  it("accepts only the request host", () => {
    expect(() => assertTrustedMutationOrigin(new Request("https://preview.example/api", { headers: { origin: "https://preview.example", host: "preview.example" } }))).not.toThrow();
    expect(() => assertTrustedMutationOrigin(new Request("https://preview.example/api", { headers: { origin: "https://evil.example", host: "preview.example" } }))).toThrow(/origin/);
  });
});
