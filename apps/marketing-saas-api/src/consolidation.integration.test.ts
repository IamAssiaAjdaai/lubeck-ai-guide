// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { Pool } from "pg";
import { configuration } from "./config";
import { createSaasAuth } from "./auth";
import { createApi } from "./server";
const url=process.env.MARKETING_TEST_DATABASE_URL;
const pool=url?new Pool({connectionString:url}):null;
afterAll(async()=>{await pool?.end();});
describe.skipIf(!url)("closed canonical access",()=>{
 it("rejects direct signup server-side when local permission is absent, regardless of client claims",async()=>{
  const c=configuration({...process.env,MARKETING_DATABASE_URL:url,MARKETING_LOCAL_REGISTRATION_ENABLED:"false"});
  const mail=vi.fn();const a=createSaasAuth(pool!,c,mail);const api=createApi(pool!,c,a);
  const r=await api(new Request(c.origin+"/api/auth/sign-up/email",{method:"POST",headers:{origin:c.origin,"content-type":"application/json"},body:JSON.stringify({email:"closed@example.test",password:"Synthetic-password-2026!",name:"Synthetic",localRegistration:true})}));
  expect(r.status).toBe(403);expect(mail).not.toHaveBeenCalled();
  const health=await api(new Request(c.origin+"/api/health"));expect((await health.json()).localRegistration).toBe(false);
  const projects=await api(new Request(c.origin+"/api/projects"));expect(projects.status).toBe(401);
 });
});
