// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const tasks = vi.hoisted(() => ({ queue: [] as (() => Promise<void>)[] }));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => tasks.queue.push(task) }));
import { deliverPasswordResetEmail, resetEmailConfiguration, sendPasswordResetEmail } from "./email.server";
const source = { user: { email: "synthetic@example.test" }, token: "TestToken1234567890123456" };
beforeEach(() => {
  tasks.queue = [];
  vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-auth-secret-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "https://preview.example.test");
  vi.stubEnv("RESEND_API_KEY", "synthetic-provider-key");
  vi.stubEnv("CITYWALK_EMAIL_FROM", "account@example.test");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("reset email provider boundary", () => {
  it("fails closed without provider configuration, never inventing delivery", () => {
    vi.stubEnv("RESEND_API_KEY", ""); expect(() => resetEmailConfiguration()).toThrow("UNAVAILABLE"); expect(tasks.queue).toHaveLength(0);
  });
  it("sends localized plaintext via the fixed provider; token is only a fragment", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal("fetch", fetcher);
    await deliverPasswordResetEmail(source, new Request("https://untrusted.example.test", { headers: { "X-Citywalk-Locale": "de" } }));
    const [url, init] = fetcher.mock.calls[0]; expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body); expect(body.to).toEqual([source.user.email]); expect(body.subject).toContain("Passwort");
    const link = new URL(body.text.split("\n\n")[1]); expect(link.origin).toBe("https://preview.example.test"); expect(link.searchParams.get("token")).toBeNull(); expect(new URLSearchParams(link.hash.slice(1)).get("token")).toBe(source.token);
    expect(body.html).toBeUndefined();
  });
  it("defers network delivery until after the generic response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal("fetch", fetcher);
    sendPasswordResetEmail(source); expect(fetcher).not.toHaveBeenCalled(); expect(tasks.queue).toHaveLength(1);
    await tasks.queue[0](); expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(["delivered@resend.dev", "synthetic@example.test"])("supports the documented test sender without overriding recipient %s", async email => {
    vi.stubEnv("CITYWALK_EMAIL_FROM", "onboarding@resend.dev");
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "citywalk-lifecycle-test.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "citywalk-lifecycle-branch.vercel.app");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "synthetic-message-id" }));
    vi.stubGlobal("fetch", fetcher);
    await deliverPasswordResetEmail({ ...source, user: { email } });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer synthetic-provider-key");
    const body = JSON.parse(init.body);
    expect(body.from).toBe("onboarding@resend.dev");
    expect(body.to).toEqual([email]);
    const link = new URL(body.text.split("\n\n")[1]);
    expect(link.origin).toBe("https://citywalk-lifecycle-test.vercel.app");
    expect(link.pathname).toBe("/account/reset-password");
    expect(link.searchParams.get("locale")).toBe("en");
    expect(link.searchParams.has("token")).toBe(false);
    expect(new URLSearchParams(link.hash.slice(1)).get("token")).toBe(source.token);
  });
  it.each([new Response("private provider body", { status: 500 }), new Error("https://private/key")])("logs only a safe code for provider failure", async result => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result));
    await deliverPasswordResetEmail(source);
    expect(warn.mock.calls).toEqual([["[account-lifecycle] reset_email_delivery_failed"]]);
  });
});
