// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const tasks = vi.hoisted(() => [] as (() => Promise<void>)[]);
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => tasks.push(task) }));

import { POST as confirmDeletion } from "@/app/api/account/delete-confirm/route";
import { POST as requestDeletion } from "@/app/api/account/delete-request/route";
import { externalAccountErasureJobs, staffMemberships, user, verification } from "@/db/authSchema";
import { closeDb, getDb } from "@/db/client";
import { WEB_DELETE_VERIFICATION_PREFIX } from "./deleteAccount.server";

const origin = "https://preview.example.test";
const fetchMock = vi.fn();
const request = (path: string, body: unknown) => new Request(origin + path, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify(body),
});

async function createTraveler() {
  const id = randomUUID();
  const email = `${randomUUID()}@example.test`;
  await getDb().insert(user).values({
    id,
    email,
    name: "Web deletion traveler",
    emailVerified: true,
  });
  return { id, email };
}

async function deletionToken(email: string) {
  tasks.length = 0;
  fetchMock.mockClear();
  const response = await requestDeletion(request("/api/account/delete-request", { email }));
  expect(response.status).toBe(200);
  expect(tasks).toHaveLength(1);
  await tasks[0]();
  const body = JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body));
  const link = body.text.split("\n").find((line: string) => line.startsWith("https://"));
  expect(link).toBeTruthy();
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  return token!;
}

describe.runIf(process.env.LIFECYCLE_DB_INTEGRATION === "1")("external web account deletion", () => {
  beforeAll(() => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== "127.0.0.1" || !/^\/cw_lifecycle_\d+$/.test(target.pathname)) {
      throw new Error("Disposable loopback database required");
    }
    vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-auth-secret-at-least-32-characters");
    vi.stubEnv("BETTER_AUTH_URL", origin);
    vi.stubEnv("RESEND_API_KEY", "synthetic-provider-key");
    vi.stubEnv("CITYWALK_EMAIL_FROM", "account@example.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  beforeEach(() => {
    tasks.length = 0;
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }));
  });

  afterAll(async () => {
    await closeDb();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the same public response for existing and unknown addresses and only emails the existing account", async () => {
    const owner = await createTraveler();
    const known = await requestDeletion(request("/api/account/delete-request", { email: owner.email }));
    const unknown = await requestDeletion(request("/api/account/delete-request", { email: `${randomUUID()}@example.test` }));

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    expect(tasks).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();

    await tasks[0]();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("stores only a token hash, hard-deletes the verified account once, and preserves another account", async () => {
    const owner = await createTraveler();
    const other = await createTraveler();
    const token = await deletionToken(owner.email);
    const identifier = `${WEB_DELETE_VERIFICATION_PREFIX}${createHash("sha256").update(token).digest("hex")}`;

    const proof = await getDb().select().from(verification).where(eq(verification.identifier, identifier));
    expect(proof).toHaveLength(1);
    expect(proof[0].value).toBe(owner.id);
    expect(proof[0].identifier).not.toContain(token);

    const deleted = await confirmDeletion(request("/api/account/delete-confirm", { token, confirm: true }));
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: true });
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(0);
    expect(await getDb().select().from(user).where(eq(user.id, other.id))).toHaveLength(1);
    expect(await getDb().select().from(verification).where(eq(verification.value, owner.id))).toHaveLength(0);
    expect(await getDb().select().from(externalAccountErasureJobs).where(eq(externalAccountErasureJobs.externalCustomerId, owner.id))).toMatchObject([
      { provider: "revenuecat", attempts: 0, completedAt: null },
    ]);

    expect((await confirmDeletion(request("/api/account/delete-confirm", { token, confirm: true }))).status).toBe(400);
  });

  it("rejects expired confirmation links without deleting the account", async () => {
    const owner = await createTraveler();
    const token = await deletionToken(owner.email);
    const identifier = `${WEB_DELETE_VERIFICATION_PREFIX}${createHash("sha256").update(token).digest("hex")}`;
    await getDb().update(verification).set({ expiresAt: new Date(0) }).where(eq(verification.identifier, identifier));

    expect((await confirmDeletion(request("/api/account/delete-confirm", { token, confirm: true }))).status).toBe(400);
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(1);
  });

  it("keeps privileged staff deletion blocked and leaves the verification proof retryable", async () => {
    const owner = await createTraveler();
    await getDb().insert(staffMemberships).values({
      userId: owner.id,
      role: "content_editor",
      active: true,
      globalAccess: false,
    });
    const token = await deletionToken(owner.email);
    const identifier = `${WEB_DELETE_VERIFICATION_PREFIX}${createHash("sha256").update(token).digest("hex")}`;

    expect((await confirmDeletion(request("/api/account/delete-confirm", { token, confirm: true }))).status).toBe(409);
    expect(await getDb().select().from(user).where(eq(user.id, owner.id))).toHaveLength(1);
    expect(await getDb().select().from(verification).where(eq(verification.identifier, identifier))).toHaveLength(1);
  });
});
