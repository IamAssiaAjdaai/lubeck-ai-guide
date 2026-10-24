// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { probePreviewHyperdrive } from "./hyperdriveProbe";

describe("private Hyperdrive probe contract (mock only, no Cloudflare connection)", () => {
  it("runs only SELECT 1, returning pass and closing the client", async () => {
    const connect = vi.fn().mockResolvedValue(undefined);
    const query = vi.fn().mockResolvedValue({ rows: [{ probe: 1 }] });
    const end = vi.fn().mockResolvedValue(undefined);
    const Client = class {
      constructor(public options: Record<string, unknown>) {}
      connect = connect;
      query = query;
      end = end;
    };
    const result = await probePreviewHyperdrive(
      { HYPERDRIVE: { connectionString: "postgresql://preview-role:synthetic@private.invalid/preview-db" } },
      Client as never,
    );
    expect(result).toBe("pass");
    expect(query).toHaveBeenCalledExactlyOnceWith("SELECT 1 AS probe");
    expect(end).toHaveBeenCalledOnce();
  });
  it("fails closed when missing a binding", async () => {
    expect(await probePreviewHyperdrive({ HYPERDRIVE: { connectionString: "" } })).toBe("fail");
  });
  it("fails closed and closes on connection error", async () => {
    const end = vi.fn().mockResolvedValue(undefined);
    const Client = class {
      connect = vi.fn().mockRejectedValue(Error("offline"));
      query = vi.fn();
      end = end;
    };
    expect(await probePreviewHyperdrive(
      { HYPERDRIVE: { connectionString: "synthetic-nonsecret" } },
      Client as never,
    )).toBe("fail");
    expect(end).toHaveBeenCalledOnce();
  });
});
