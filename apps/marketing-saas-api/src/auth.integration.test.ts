// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { createSaasAuth, type MailMessage } from "./auth";
import { createApi } from "./server";
import { configuration } from "./config";
const enabled = !!process.env.MARKETING_TEST_DATABASE_URL;
const config = enabled
  ? configuration({
      ...process.env,
      MARKETING_DATABASE_URL: process.env.MARKETING_TEST_DATABASE_URL,
      MARKETING_AUTH_SECRET: "synthetic-integration-secret-over-32-characters",
    })
  : null;
const pool = config ? new Pool({ connectionString: config.databaseUrl }) : null;
const mailbox: MailMessage[] = [];
const auth =
  config && pool
    ? createSaasAuth(pool, config, async (message) => {
        mailbox.push(message);
      })
    : null;
const api = config && pool && auth ? createApi(pool, config, auth) : null;
let requestNumber = 0;
async function call(
  path: string,
  method = "GET",
  data?: unknown,
  cookie?: string,
  origin = config?.origin,
) {
  const response = await api!(
    new Request(config!.origin + path, {
      method,
      headers: {
        "x-marketing-client-ip": `198.51.100.${++requestNumber}`,
        ...(method !== "GET"
          ? { "content-type": "application/json", origin: origin! }
          : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    }),
  );
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; "),
  };
}
const password = "Synthetic-password-2026!";
async function account() {
  const email = `qa-${randomUUID()}@example.test`;
  expect(
    (
      await call("/api/auth/sign-up/email", "POST", {
        name: "QA",
        email,
        password,
      })
    ).status,
  ).toBe(200);
  expect(
    (await call("/api/auth/sign-in/email", "POST", { email, password })).status,
  ).toBe(403);
  const mail = mailbox.find((m) => m.to === email && m.kind === "verify")!;
  expect(mail).toBeDefined();
  const verified = await auth!.handler(new Request(mail.url));
  expect(verified.status).toBeLessThan(400);
  const signIn = await call("/api/auth/sign-in/email", "POST", {
    email,
    password,
  });
  expect(signIn.status).toBe(200);
  return { email, cookie: signIn.cookie, userId: signIn.body.user.id };
}
afterAll(async () => {
  await pool?.end();
});
describe.skipIf(!enabled)(
  "isolated SaaS auth and two-tenant authorization",
  () => {
    it("enforces verified independent identity, role scopes, revision locks and logout", async () => {
      const a = await account(),
        b = await account();
      expect((await call("/api/projects")).status).toBe(401);
      expect(
        (
          await call(
            "/api/projects",
            "POST",
            { name: "No origin" },
            a.cookie,
            "https://evil.example",
          )
        ).status,
      ).toBe(403);
      const pa = await call(
        "/api/projects",
        "POST",
        { name: "Glanz QA" },
        a.cookie,
      );
      expect(pa.status).toBe(201);
      const pb = await call(
        "/api/projects",
        "POST",
        { name: "Other QA" },
        b.cookie,
      );
      expect(pb.status).toBe(201);
      for (const action of ["", "/brief", "/confirm", "/import"]) {
        const denied = await call(
          `/api/projects/${pa.body.id}${action}`,
          action ? "POST" : "GET",
          action ? {} : undefined,
          b.cookie,
        );
        expect(denied.status).toBe(404);
      }
      const path = `/api/projects/${pa.body.id}`;
      const brief = {
        rawText: "Synthetic business",
        identity: { name: "Glanz QA" },
        facts: [
          {
            id: "service",
            statement: "Wir reinigen Büros.",
            basis: "user_supplied",
          },
        ],
      };
      const saved = await call(
        path + "/brief",
        "POST",
        { expectedRevision: 0, brief },
        a.cookie,
      );
      expect(saved.status).toBe(200);
      expect(saved.body.facts[0].confirmation).toBeNull();
      expect(
        (
          await call(
            path + "/confirm",
            "POST",
            {
              expectedRevision: 1,
              factIds: ["service"],
              acknowledged: true,
              actorId: b.userId,
            },
            a.cookie,
          )
        ).status,
      ).toBe(400);
      const confirmed = await call(
        path + "/confirm",
        "POST",
        { expectedRevision: 1, factIds: ["service"], acknowledged: true },
        a.cookie,
      );
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.facts[0].confirmation.actorId).toBe(a.userId);
      expect(
        (
          await call(
            path + "/brief",
            "POST",
            { expectedRevision: 1, brief },
            a.cookie,
          )
        ).status,
      ).toBe(409);
      const race = await Promise.all(
        [1, 2].map(() =>
          call(
            path + "/brief",
            "POST",
            { expectedRevision: 2, brief },
            a.cookie,
          ),
        ),
      );
      expect(race.map((r) => r.status).sort()).toEqual([200, 409]);
      const reopened = await call(path, "GET", undefined, a.cookie);
      expect(reopened.body.context.revision).toBe(3);
      expect(reopened.body.context.facts[0].confirmation).toBeNull();
      expect(reopened.body.history).toEqual([3, 2, 1]);
      await pool!.query(
        "INSERT INTO mkt_memberships(organization_id,user_id,role) VALUES($1,$2,'viewer')",
        [pa.body.organization_id, b.userId],
      );
      expect((await call(path, "GET", undefined, b.cookie)).status).toBe(200);
      expect(
        (
          await call(
            path + "/confirm",
            "POST",
            { expectedRevision: 3, factIds: ["service"], acknowledged: true },
            b.cookie,
          )
        ).status,
      ).toBe(403);
      await pool!.query(
        "UPDATE mkt_memberships SET role='editor' WHERE organization_id=$1 AND user_id=$2",
        [pa.body.organization_id, b.userId],
      );
      expect(
        (
          await call(
            path + "/confirm",
            "POST",
            { expectedRevision: 3, factIds: ["service"], acknowledged: true },
            b.cookie,
          )
        ).status,
      ).toBe(200);
      expect(
        (await call("/api/auth/sign-out", "POST", {}, a.cookie)).status,
      ).toBe(200);
      expect((await call(path, "GET", undefined, a.cookie)).status).toBe(401);
    }, 30000);
    it("persists, edits and clears optional service city with tenant and revision protection", async () => {
      const owner = await account(), other = await account();
      const project = await call("/api/projects", "POST", {name: "Fiktiver Ortsservice"}, owner.cookie);
      const path = `/api/projects/${project.body.id}`;
      const brief = {rawText:"Fiktiver manueller Kurzbrief",identity:{name:"Fiktiver Ortsservice"},markets:[{id:"owner-service-city",name:"Düsseldorf"}],facts:[{id:"service",statement:"Wir reinigen Büros.",basis:"user_supplied"}]};
      expect((await call(path+"/brief","POST",{expectedRevision:0,brief:{...brief,markets:[{id:"owner-service-city",name:"x".repeat(161)}]}},owner.cookie)).status).toBe(400);
      expect((await call(path,"GET",undefined,owner.cookie)).body.revision).toBe(0);
      expect((await call(path+"/brief","POST",{expectedRevision:0,brief},other.cookie)).status).toBe(404);
      expect((await call(path+"/brief","POST",{expectedRevision:0,brief},owner.cookie)).status).toBe(200);
      const saved=await call(path,"GET",undefined,owner.cookie);
      expect(saved.body.context.markets).toEqual(brief.markets);
      expect(saved.body.context.facts[0].basis).toBe("user_supplied");
      expect(saved.body.context.facts[0].confirmation).toBeNull();
      expect((await call(path,"GET",undefined,other.cookie)).status).toBe(404);
      await call(path+"/confirm","POST",{expectedRevision:1,factIds:["service"],acknowledged:true},owner.cookie);
      const changed={...brief,markets:[{id:"owner-service-city",name:"Hamburg"}]};
      expect((await call(path+"/brief","POST",{expectedRevision:1,brief:changed},owner.cookie)).status).toBe(409);
      expect((await call(path+"/brief","POST",{expectedRevision:2,brief:changed},owner.cookie)).status).toBe(200);
      const edited=await call(path,"GET",undefined,owner.cookie);
      expect(edited.body.context.markets[0].name).toBe("Hamburg");
      expect(edited.body.context.facts[0].confirmation).toBeNull();
      expect(edited.body.history).toEqual([3,2,1]);
      expect((await call(path+"/brief","POST",{expectedRevision:3,brief:{...brief,markets:[]}},owner.cookie)).status).toBe(200);
      expect((await call(path,"GET",undefined,owner.cookie)).body.context.markets).toEqual([]);
    }, 30000);
    it("supports reset without account enumeration and revokes old sessions", async () => {
      const a = await account();
      const existing = await call("/api/auth/request-password-reset", "POST", {
        email: a.email,
        redirectTo: config!.origin + "/auth",
      });
      const unknown = await call("/api/auth/request-password-reset", "POST", {
        email: `absent-${randomUUID()}@example.test`,
        redirectTo: config!.origin + "/auth",
      });
      expect(existing.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(existing.body).toEqual(unknown.body);
      const mail = mailbox.find((m) => m.to === a.email && m.kind === "reset")!;
      expect(mail).toBeDefined();
      const token = new URL(mail.url).pathname.split("/").pop()!;
      expect(
        (
          await call("/api/auth/reset-password", "POST", {
            token,
            newPassword: "Changed-synthetic-password!",
          })
        ).status,
      ).toBe(200);
      expect(
        (await call("/api/projects", "GET", undefined, a.cookie)).status,
      ).toBe(401);
      expect(
        (
          await call("/api/auth/reset-password", "POST", {
            token,
            newPassword: "Another-synthetic-password!",
          })
        ).status,
      ).not.toBe(200);
    }, 30000);
  },
);
