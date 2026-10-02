// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { t } from "@citywalk/i18n";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(), limit: vi.fn(), mail: vi.fn(), tasks: [] as (() => Promise<void>)[],
}));
vi.mock("@/lib/auth/server", () => ({ getAuth: mocks.getAuth }));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => mocks.tasks.push(task) }));
vi.mock("./rateLimit.server", async importOriginal => ({ ...await importOriginal<typeof import("./rateLimit.server")>(), limitLifecycle: mocks.limit }));
import { createCitywalkAuth } from "../factory.server";
import { getDb, closeDb } from "@/db/client";
import { user, account, session, verification, staffMemberships } from "@/db/authSchema";
import { travelerProfiles, travelerGuestLinks, accountSavedWalks } from "@/db/travelerSchema";
import { commerceCustomers } from "@/db/commerceSchema";
import { contentWorkflowEventsTable } from "@/db/schema";
import { POST as deleteAccount } from "@/app/api/account/delete/route";
import { POST as validateToken } from "@/app/api/account/reset-token/route";
import { LifecycleError } from "./rateLimit.server";

const origin = "https://preview.example.test";
const password = "original-test-password";
let auth: ReturnType<typeof createCitywalkAuth>;
const req = (path: string, body: unknown, cookie = "", owner = "") => new Request(origin + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie, "X-Citywalk-Account": owner }, body: JSON.stringify(body) });
async function createTraveler() {
  const email = `${randomUUID()}@example.test`;
  const signup = await auth.api.signUpEmail({ body: { email, password, name: "Synthetic traveler" } });
  // Most lifecycle tests exercise already-verified accounts. Discard the deferred
  // verification send and mark this fixture verified explicitly.
  mocks.tasks = [];
  await getDb().update(user).set({ emailVerified: true }).where(eq(user.id, signup.user.id));
  const signin = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  const cookie = signin.headers.get("set-cookie")!.split(";")[0];
  return { id: signup.user.id, email, cookie };
}
async function resetRequest(email: string) {
  return auth.handler(req("/api/auth/request-password-reset", { email }));
}
async function tokenFor(email: string) {
  mocks.tasks = []; await resetRequest(email); await Promise.all(mocks.tasks.map(task => task()));
  const body = JSON.parse(mocks.mail.mock.lastCall![1].body);
  return new URLSearchParams(new URL(body.text.split("\n\n")[1]).hash.slice(1)).get("token")!;
}
const newPassword = "changed-test-password";
const reset = (token: string, value = newPassword) => auth.handler(req("/api/auth/reset-password", { token, newPassword: value }));

describe.runIf(process.env.LIFECYCLE_DB_INTEGRATION === "1")("isolated real Better Auth lifecycle", () => {
  beforeAll(() => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== "127.0.0.1" || !/^\/cw_lifecycle_\d+$/.test(target.pathname)) throw new Error("Disposable loopback database required");
    vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-auth-secret-at-least-32-characters"); vi.stubEnv("BETTER_AUTH_URL", origin);
    vi.stubEnv("RESEND_API_KEY", "synthetic-provider-key"); vi.stubEnv("CITYWALK_EMAIL_FROM", "account@example.test");
    auth = createCitywalkAuth({ allowEmailSignUp: true }); mocks.getAuth.mockReturnValue(auth);
  });
  beforeEach(() => {
    mocks.limit.mockReset().mockResolvedValue(undefined); mocks.tasks = []; mocks.mail.mockReset().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal("fetch", mocks.mail);
  });
  afterAll(async () => { await closeDb(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("creates one unverified user for duplicate signups and blocks password sign-in until verification", async () => {
    const email = `${randomUUID()}@example.test`;
    const body = { email, password, name: "Verification traveler", callbackURL: "/account" };
    const first = await auth.handler(req("/api/auth/sign-up/email", body));
    const duplicate = await auth.handler(req("/api/auth/sign-up/email", body));
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    const rows = await getDb().select().from(user).where(eq(user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0].emailVerified).toBe(false);

    mocks.tasks = [];
    const signin = await auth.handler(req("/api/auth/sign-in/email", { email, password, callbackURL: "/account" }));
    expect(signin.status).toBe(403);
    expect(await signin.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    expect(await getDb().select().from(session).where(eq(session.userId, rows[0].id))).toHaveLength(0);
    expect(mocks.tasks).toHaveLength(1);
  });

  it("sends a localized verification link, verifies without auto-sign-in, then permits password sign-in", async () => {
    const email = `${randomUUID()}@example.test`;
    const signupRequest = req("/api/auth/sign-up/email", {
      email,
      password,
      name: "Localized verification traveler",
      callbackURL: "/account",
    });
    signupRequest.headers.set("X-Citywalk-Locale", "de");
    expect((await auth.handler(signupRequest)).status).toBe(200);
    expect(mocks.tasks).toHaveLength(1);
    await mocks.tasks[0]();

    const mailBody = JSON.parse(mocks.mail.mock.lastCall![1].body);
    expect(mailBody.subject).toBe(t("de", "lifecycle.verificationEmailSubject"));
    const verificationUrl = mailBody.text.split("\n\n")[1];
    expect(new URL(verificationUrl).pathname).toBe("/api/auth/verify-email");
    expect(verificationUrl).not.toContain(email);
    const record = (await getDb().select().from(user).where(eq(user.email, email)))[0];
    expect(record.emailVerified).toBe(false);

    const verified = await auth.handler(new Request(verificationUrl));
    expect([200, 302, 303, 307]).toContain(verified.status);
    expect((await getDb().select().from(user).where(eq(user.email, email)))[0].emailVerified).toBe(true);
    expect(await getDb().select().from(session).where(eq(session.userId, record.id))).toHaveLength(0);

    const signin = await auth.api.signInEmail({ body: { email, password } });
    expect(signin.user.id).toBe(record.id);
  });

  it("resends verification without exposing whether an anonymous email exists", async () => {
    const email = `${randomUUID()}@example.test`;
    await auth.api.signUpEmail({ body: { email, password, name: "Resend traveler" } });
    mocks.tasks = [];

    const known = await auth.handler(req("/api/auth/send-verification-email", { email, callbackURL: "/account" }));
    const unknown = await auth.handler(req("/api/auth/send-verification-email", { email: "unknown-verification@example.test", callbackURL: "/account" }));
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    // Only the real unverified account can enqueue mail; the public response stays identical.
    expect(mocks.tasks).toHaveLength(1);
  });

  it("returns identical generic responses for existing and unknown addresses; only existing receives mail", async () => {
    const owner = await createTraveler();
    const existing = await resetRequest(owner.email); const absent = await resetRequest("unknown@example.test");
    expect(existing.status).toBe(200); expect(absent.status).toBe(200); expect(await existing.json()).toEqual(await absent.json());
    expect(mocks.tasks).toHaveLength(1); expect(mocks.mail).not.toHaveBeenCalled(); await mocks.tasks[0](); expect(mocks.mail).toHaveBeenCalledOnce();
  });
  it("rejects invalid email, rate limits and missing provider without queuing mail", async () => {
    expect((await resetRequest("invalid")).status).toBe(400);
    mocks.limit.mockRejectedValueOnce(new LifecycleError("RATE_LIMITED", 429)); expect((await resetRequest("unknown@example.test")).status).toBe(429);
    vi.stubEnv("RESEND_API_KEY", ""); expect((await resetRequest("unknown@example.test")).status).toBe(503); vi.stubEnv("RESEND_API_KEY", "synthetic-provider-key");
    expect(mocks.tasks).toHaveLength(0);
  });
  it("validates token, enforces shared bounds, resets once, rejects old password and revokes sessions", async () => {
    const owner = await createTraveler(); const token = await tokenFor(owner.email);
    await auth.api.signInEmail({ body: { email: owner.email, password } });
    expect(await getDb().select().from(session).where(eq(session.userId, owner.id))).toHaveLength(2);
    const row = await getDb().select().from(verification).where(eq(verification.identifier, `reset-password:${token}`));
    expect(token).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(row[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    expect(row[0].expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
    expect((await validateToken(req("/api/account/reset-token", { token }))).status).toBe(200);
    expect((await reset(token, "x".repeat(11))).status).toBe(400); expect((await reset(token, "x".repeat(129))).status).toBe(400);
    expect((await reset(token)).status).toBe(200); expect((await reset(token)).status).toBe(400);
    expect((await validateToken(req("/api/account/reset-token", { token }))).status).toBe(400);
    expect(await auth.api.getSession({ headers: new Headers({ Cookie: owner.cookie }) })).toBeNull();
    expect(await getDb().select().from(session).where(eq(session.userId, owner.id))).toHaveLength(0);
    await expect(auth.api.signInEmail({ body: { email: owner.email, password } })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await auth.api.signInEmail({ body: { email: owner.email, password: newPassword } })).user.id).toBe(owner.id);
  });
  it("rejects expired and unknown tokens without changing the password", async () => {
    const owner = await createTraveler(); const token = await tokenFor(owner.email);
    await getDb().update(verification).set({ expiresAt: new Date(0) }).where(eq(verification.identifier, `reset-password:${token}`));
    expect((await validateToken(req("/api/account/reset-token", { token }))).status).toBe(400); expect((await reset(token)).status).toBe(400);
    expect((await reset("X".repeat(24))).status).toBe(400);
    expect((await auth.api.signInEmail({ body: { email: owner.email, password } })).user.id).toBe(owner.id);
  });
  it("allows only one concurrent consumption of the same reset token", async () => {
    const owner = await createTraveler(); const token = await tokenFor(owner.email);
    expect((await Promise.all([reset(token), reset(token)])).map(r => r.status).sort()).toEqual([200, 400]);
  });
  it("rejects caller-controlled redirects, URL tokens and cross-origin deletion", async () => {
    expect((await auth.handler(req("/api/auth/request-password-reset", { email: "someone@example.test", redirectTo: "https://other.example.test" }))).status).toBe(400);
    expect((await auth.handler(req("/api/auth/reset-password?token=do-not-log", { token: "A".repeat(24), newPassword }))).status).toBe(400);
    const owner = await createTraveler();
    const request = req("/api/account/delete", { confirm: true, password }, owner.cookie, owner.id);
    request.headers.set("Origin", "https://other.example.test"); expect((await deleteAccount(request)).status).toBe(403);
    // The library's less-restrictive fresh-session delete path must stay disabled.
    expect((await auth.handler(req("/api/auth/delete-user", { password }, owner.cookie))).status).not.toBe(200);
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(1);
  });
  it("accepts both exact password bounds without a policy drift", async () => {
    for (const length of [12, 128]) {
      const owner = await createTraveler(); const token = await tokenFor(owner.email);
      expect((await reset(token, "x".repeat(length))).status).toBe(200);
      expect((await auth.api.signInEmail({ body: { email: owner.email, password: "x".repeat(length) } })).user.id).toBe(owner.id);
    }
  });
  it("rejects anonymous, wrong-password, unconfirmed and cross-account deletion without mutation", async () => {
    const owner = await createTraveler(), other = await createTraveler();
    const path = "/api/account/delete";
    expect((await deleteAccount(req(path, { confirm: true, password }))).status).toBe(401);
    expect((await deleteAccount(req(path, { confirm: true, password }, owner.cookie, other.id))).status).toBe(401);
    expect((await deleteAccount(req(path, { confirm: false, password }, owner.cookie, owner.id))).status).toBe(400);
    expect((await deleteAccount(req(path, { confirm: true, password: "incorrect" }, owner.cookie, owner.id))).status).toBe(401);
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(1);
  });
  it("transactionally deletes the authenticated account and owned saves/tokens/links, preserving another account", async () => {
    const owner = await createTraveler(), other = await createTraveler();
    await getDb().insert(travelerProfiles).values({ userId: owner.id });
    await getDb().insert(travelerGuestLinks).values({ userId: owner.id, visitorId: randomUUID(), sessionId: randomUUID() });
    const route = { citySlug: "lubeck", stopSlugs: ["holstentor"], settings: { minutes: 120, interests: ["history" as const], walking: "balanced" as const, start: { lat: 53.8, lng: 10.6 } } };
    await getDb().insert(accountSavedWalks).values([owner, other].map(item => ({ userId: item.id, citySlug: "lubeck", route, fingerprint: randomUUID() })));
    const token = await tokenFor(owner.email);
    const result = await deleteAccount(req("/api/account/delete", { confirm: true, password, userId: other.id }, owner.cookie, owner.id));
    expect(result.status).toBe(200); expect(await result.json()).toEqual({ deleted: true });
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(0);
    for (const table of [account, session, travelerProfiles, travelerGuestLinks, accountSavedWalks]) expect(await getDb().select().from(table).where(eq(table.userId, owner.id))).toHaveLength(0);
    expect(await getDb().select().from(verification).where(eq(verification.value, owner.id))).toHaveLength(0);
    expect(await getDb().select().from(accountSavedWalks).where(eq(accountSavedWalks.userId, other.id))).toHaveLength(1);
    expect(await auth.api.getSession({ headers: new Headers({ Cookie: owner.cookie }) })).toBeNull();
    await expect(auth.api.signInEmail({ body: { email: owner.email, password } })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await reset(token)).status).toBe(400);
    expect((await deleteAccount(req("/api/account/delete", { confirm: true, password }, owner.cookie, owner.id))).status).toBe(401);
    expect((await auth.api.signInEmail({ body: { email: other.email, password } })).user.id).toBe(other.id);
  });
  it.each(["commerce", "staff", "audit"])("blocks deletion with %s records and rolls back all account changes", async kind => {
    const owner = await createTraveler();
    if (kind === "commerce") await getDb().insert(commerceCustomers).values({ userId: owner.id, provider: "stripe", providerCustomerId: randomUUID() });
    if (kind === "staff") await getDb().insert(staffMemberships).values({ userId: owner.id, role: "content_editor", active: false });
    if (kind === "audit") await getDb().insert(contentWorkflowEventsTable).values({ actorUserId: owner.id, entityType: "place", entityId: 1, action: "test", fromStatus: "draft", toStatus: "draft" });
    const result = await deleteAccount(req("/api/account/delete", { confirm: true, password }, owner.cookie, owner.id));
    expect(result.status).toBe(409); expect(await result.json()).toEqual({ code: "RETENTION_REVIEW_REQUIRED" });
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(1);
    expect(await auth.api.getSession({ headers: new Headers({ Cookie: owner.cookie }) })).not.toBeNull();
  });
});
