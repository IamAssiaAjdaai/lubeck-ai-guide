import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
vi.mock("server-only", () => ({}));
import { closeDb, getDb } from "@/db/client";
import { rateLimitEventsTable } from "@/db/rateLimitSchema";
import { reserveLaunchAiCall } from "./launchBudget.server";
const enabled = process.env.LAUNCH_POLICY_DB_INTEGRATION === "1";
if (enabled && !["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Launch integration requires isolated loopback PostgreSQL");
describe.runIf(enabled)("shared launch provider budget with PostgreSQL",()=>{
 beforeAll(()=>{
   vi.stubEnv("CITYWALK_LAUNCH_FREE_ENABLED","1");
   vi.stubEnv("CITYWALK_LAUNCH_AI_CALLS_PER_24H","2");
 });
 afterAll(async()=>{
   await getDb().delete(rateLimitEventsTable).where(eq(rateLimitEventsTable.scope,"citywalk-launch-provider-calls-v1"));
   await closeDb();vi.unstubAllEnvs();
 });
 it("permits exactly two concurrent attempts and denies the remaining three",async()=>{
   const results=await Promise.allSettled(Array.from({length:5},()=>reserveLaunchAiCall()));
   expect(results.filter(value=>value.status==="fulfilled")).toHaveLength(2);
   expect(results.filter(value=>value.status==="rejected")).toHaveLength(3);
   await expect(reserveLaunchAiCall()).rejects.toThrow("EXHAUSTED");
 });
});
