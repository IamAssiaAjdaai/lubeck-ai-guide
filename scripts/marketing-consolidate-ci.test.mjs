// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { offlineEnvironment, isolatedDatabaseUrl, databaseTests } from "./marketing-consolidate-ci.mjs";
describe("canonical CI cannot inherit a live provider configuration", () => {
  it("strips ambient keys and overwrites every live/spending/registration gate", () => {
    const env=offlineEnvironment({MARKETING_DATABASE_URL:"postgresql://synthetic@127.0.0.1:55498/marketing_ci",OPENAI_API_KEY:"synthetic-not-a-key",OTHER_API_KEY:"synthetic",MARKETING_AI_ENABLED:"true",MARKETING_REAL_IMAGE_TRANSPORT_ENABLED:"true",MARKETING_REAL_IMAGE_SPEND_APPROVED:"true",MARKETING_REAL_IMAGE_PRICE_BOUND_VERIFIED:"true",MARKETING_REAL_IMAGE_AUTHORIZED_UNTIL:"2099-01-01",MARKETING_LOCAL_REGISTRATION_ENABLED:"true"},"/synthetic-private");
    expect(env.OPENAI_API_KEY).toBeUndefined();expect(env.OTHER_API_KEY).toBeUndefined();
    for(const key of ["MARKETING_AI_ENABLED","MARKETING_REAL_IMAGE_TRANSPORT_ENABLED","MARKETING_REAL_IMAGE_SPEND_APPROVED","MARKETING_REAL_IMAGE_PRICE_BOUND_VERIFIED","MARKETING_LOCAL_REGISTRATION_ENABLED"])expect(env[key]).toBe("false");
    expect(env.MARKETING_REAL_IMAGE_AUTHORIZED_UNTIL).toBe("");expect(env.MARKETING_QA_STORAGE_STATE).toBe("/synthetic-private/auth.json");expect(env.MARKETING_AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });
  it.each([undefined,"postgresql://user@remote.example:55498/marketing_ci","postgresql://user@127.0.0.1:5432/marketing_ci","postgresql://user@127.0.0.1:55498/citywalk","https://127.0.0.1:55498/marketing_ci"])("rejects non-isolated database %s",value=>expect(()=>isolatedDatabaseUrl(value)).toThrow());
  it("keeps workflow artifact publication limited to screenshots and a redacted summary",()=>{
    const workflow=readFileSync(new URL("../.github/workflows/marketing-saas.yml",import.meta.url),"utf8");
    const published=workflow.split("          path: |\n")[1].trim().split("\n").map(x=>x.trim());
    expect(published).toHaveLength(4);expect(published.every(x=>x.endsWith("summary.json")||x.endsWith("*.png"))).toBe(true);
    expect(workflow).toContain("contents: read");expect(workflow).toContain("127.0.0.1:55498:5432");expect(workflow).not.toMatch(/workflow_dispatch|deploy:|pull_request_target|secrets\./);
  });
  it("retains all ten required auth/persistence/Creative database suites",()=>{expect(databaseTests).toHaveLength(10);expect(databaseTests.some(x=>x.includes("consolidation.integration"))).toBe(true);expect(databaseTests.some(x=>x.includes("workspace.integration"))).toBe(true);expect(databaseTests.some(x=>x.includes("hardening.integration"))).toBe(true);});
});
