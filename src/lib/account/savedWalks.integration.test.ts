// @vitest-environment node
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ userId: "", resolve: undefined as undefined | ((input: { headers: Headers }) => Promise<unknown>) }));
vi.mock("@/lib/auth/server", () => ({ getAuth: () => ({ api: { getSession: async (input: { headers: Headers }) => auth.resolve ? auth.resolve(input) : auth.userId ? { user: { id: auth.userId } } : null } }) }));
import { getDb, closeDb } from "@/db/client";
import { user } from "@/db/authSchema";
import { GET, POST, DELETE } from "@/app/api/account/saved-walks/route";
import { saveAccountWalk, listAccountWalks } from "./savedWalks.server";
import { savedRouteFromJourney } from "@citywalk/traveler-core";
const owner = randomUUID(), other = randomUUID();
const route = (stops = ["holstentor"]) => ({ citySlug: "lubeck", stopSlugs: stops, settings: { minutes: 120, interests: ["history"], walking: "balanced", start: { lat: 53.866, lng: 10.679 } } });
const request = (method: string, body?: unknown, ownerHeader = auth.userId) => new Request("https://preview.example.test/api/account/saved-walks", {
  method, headers: { "Content-Type": "application/json", "X-Citywalk-Account": ownerHeader }, ...(body ? { body: JSON.stringify(body) } : {}),
});
describe.runIf(process.env.SAVED_WALK_DB_INTEGRATION === "1")("isolated authenticated saved walks", () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || !/^\/cw_savedwalk_\d+$/.test(url.pathname)) throw new Error("Disposable loopback database required");
    await getDb().insert(user).values([{ id: owner, name: "Test one", email: `${owner}@example.test` }, { id: other, name: "Test two", email: `${other}@example.test` }]);
  });
  afterAll(closeDb);
  afterEach(() => { auth.resolve = undefined; vi.unstubAllEnvs(); });
  it("rejects anonymous create and list without mutation", async () => {
    auth.userId = "";
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", { route: route() }))).status).toBe(401);
    expect(await listAccountWalks(owner)).toEqual([]);
  });
  it("creates, lists and deduplicates concurrent same-route saves per account", async () => {
    auth.userId = owner;
    const responses = await Promise.all([POST(request("POST", { route: route() })), POST(request("POST", { route: route() }))]);
    expect(responses.map(r => r.status)).toEqual([200, 200]);
    const [a, b] = await Promise.all(responses.map(r => r.json())); expect(a.walk.id).toBe(b.walk.id);
    const listed = await (await GET(request("GET"))).json(); expect(listed.walks).toHaveLength(1);
    expect(listed.walks[0]).not.toHaveProperty("userId"); expect(listed.walks[0]).not.toHaveProperty("fingerprint");
    expect((await GET(request("GET"))).headers.get("cache-control")).toContain("no-store");
  });
  it("updates the same owned record and preserves createdAt", async () => {
    auth.userId = owner; const [saved] = await listAccountWalks(owner);
    const response = await POST(request("POST", { id: saved.id, route: route(["holstentor", "marienkirche"]) }));
    expect(response.status).toBe(200); const { walk } = await response.json();
    expect(walk.id).toBe(saved.id); expect(walk.createdAt).toBe(saved.createdAt); expect(walk.route.stopSlugs).toHaveLength(2);
    const retry = await saveAccountWalk(owner, walk.route, walk.id); expect(retry.updatedAt).toBe(walk.updatedAt);
  });
  it("allows different routes and the same route for a different account", async () => {
    await saveAccountWalk(owner, route(["marienkirche"])); await saveAccountWalk(other, route(["marienkirche"]));
    expect(await listAccountWalks(owner)).toHaveLength(2); expect(await listAccountWalks(other)).toHaveLength(1);
  });
  it("rejects wrong-user update/delete and account-switch races", async () => {
    const [saved] = await listAccountWalks(owner); auth.userId = other;
    expect((await POST(request("POST", { id: saved.id, route: route() }))).status).toBe(404);
    expect((await DELETE(request("DELETE", { id: saved.id }))).status).toBe(404);
    expect((await POST(request("POST", { route: route() }, owner))).status).toBe(401);
    expect(await listAccountWalks(owner)).toHaveLength(2);
  });
  it("rejects empty, unknown and cross-city routes without overwriting valid saves", async () => {
    auth.userId = owner; const before = await listAccountWalks(owner);
    for (const invalid of [route([]), route(["not-a-published-place"]), { ...route(), citySlug: "invalid-city" }]) {
      expect((await POST(request("POST", { id: before[0].id, route: invalid }))).status).not.toBe(200);
    }
    expect(await listAccountWalks(owner)).toEqual(before);
  });
  it("accepts completed itinerary projection and ignores progress/locale for identity", async () => {
    const complete = savedRouteFromJourney({ id: "local", citySlug: "lubeck", settings: route().settings, visited: ["holstentor"], remaining: [], position: { lat: 53.86, lng: 10.67 }, historyDistance: 123, startedAt: 1, finishedAt: 2, locale: "de" });
    const saved = await saveAccountWalk(other, complete);
    expect(saved.route.stopSlugs).toEqual(["holstentor"]); expect(saved.route).not.toHaveProperty("position"); expect(saved.route).not.toHaveProperty("locale");
  });
  it("rejects update collisions without silently deleting either record", async () => {
    auth.userId = owner; const before = await listAccountWalks(owner);
    expect((await POST(request("POST", { id: before[0].id, route: before[1].route }))).status).toBe(409);
    expect(await listAccountWalks(owner)).toEqual(before);
  });
  it("deletes only the owned record and does not expose another account", async () => {
    auth.userId = owner; const [saved] = await listAccountWalks(owner); const others = await listAccountWalks(other);
    expect((await DELETE(request("DELETE", { id: saved.id }))).status).toBe(200);
    expect((await listAccountWalks(owner)).some(w => w.id === saved.id)).toBe(false);
    expect(await listAccountWalks(other)).toEqual(others);
  });
  it("rejects cross-origin and invalid-content mutations", async () => {
    auth.userId = owner;
    expect((await POST(new Request("https://preview.example.test/api/account/saved-walks", { method: "POST", headers: { Origin: "https://other.example.test" } }))).status).toBe(403);
    expect((await POST(new Request("https://preview.example.test/api/account/saved-walks", { method: "POST", headers: { "X-Citywalk-Account": owner, "Content-Type": "text/plain" }, body: "{}" }))).status).toBe(415);
    expect((await POST(new Request("https://preview.example.test/api/account/saved-walks", { method: "POST", headers: { "X-Citywalk-Account": owner, "Content-Type": "application/json" }, body: "x".repeat(30001) }))).status).toBe(413);
  });
  it("ignores forged body ownership/fingerprint and scopes list to the verified session", async () => {
    auth.userId = other;
    const beforeOwner = await listAccountWalks(owner);
    const existing = (await listAccountWalks(other)).find(w => w.route.stopSlugs.join() === "holstentor")!;
    const response = await POST(request("POST", { userId: owner, fingerprint: "forged", route: { ...route(), userId: owner, fingerprint: "forged" } }));
    expect(response.status).toBe(200);
    expect((await response.json()).walk.id).toBe(existing.id);
    expect(await listAccountWalks(owner)).toEqual(beforeOwner);
    const listed = (await (await GET(request("GET"))).json()).walks;
    expect(listed.map((w: { id: string }) => w.id).sort()).toEqual((await listAccountWalks(other)).map(w => w.id).sort());
    expect(listed.every((w: { route: Record<string, unknown> }) => !("userId" in w.route) && !("fingerprint" in w.route))).toBe(true);
  });
  it("makes repeated deletion harmless and leaves other saved records intact", async () => {
    auth.userId = other;
    const [saved] = await listAccountWalks(other);
    expect((await DELETE(request("DELETE", { id: saved.id }))).status).toBe(200);
    const remaining = await listAccountWalks(other), otherAccount = await listAccountWalks(owner);
    expect((await DELETE(request("DELETE", { id: saved.id }))).status).toBe(404);
    expect(await listAccountWalks(other)).toEqual(remaining);
    expect(await listAccountWalks(owner)).toEqual(otherAccount);
  });
  it("verifies an actual Better Auth cookie and rejects missing, forged and revoked sessions", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://preview.example.test");
    vi.stubEnv("BETTER_AUTH_SECRET", randomUUID() + randomUUID());
    const { createCitywalkAuth } = await import("@/lib/auth/factory.server");
    const instance = createCitywalkAuth({ allowEmailSignUp: true });
    const email = `${randomUUID()}@example.test`, password = randomUUID() + randomUUID();
    const signup = await instance.api.signUpEmail({ body: { name: "Cookie test", email, password }, asResponse: true });
    expect(signup.status).toBe(200);
    const signin = await instance.api.signInEmail({ body: { email, password }, asResponse: true });
    expect(signin.status).toBe(200);
    const accountId = (await signin.json()).user.id as string;
    const cookie = signin.headers.getSetCookie().find(value => value.includes("session_token="))?.split(";")[0];
    expect(Boolean(cookie)).toBe(true);
    auth.resolve = input => instance.api.getSession(input);
    const authenticated = (cookieValue?: string, expectedOwner = accountId) => new Request("https://preview.example.test/api/account/saved-walks", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Citywalk-Account": expectedOwner, ...(cookieValue ? { Cookie: cookieValue } : {}) },
      body: JSON.stringify({ userId: owner, route: route() }),
    });
    expect((await POST(authenticated())).status).toBe(401);
    expect((await POST(authenticated(`${cookie!.split("=")[0]}=forged`))).status).toBe(401);
    expect((await POST(authenticated(cookie, owner))).status).toBe(401);
    const response = await POST(authenticated(cookie));
    expect(response.status).toBe(200);
    expect(await listAccountWalks(accountId)).toHaveLength(1);
    const headers = new Headers({ Cookie: cookie! });
    await instance.api.signOut({ headers });
    expect((await POST(authenticated(cookie))).status).toBe(401);
    expect(await listAccountWalks(accountId)).toHaveLength(1);
  });
});
