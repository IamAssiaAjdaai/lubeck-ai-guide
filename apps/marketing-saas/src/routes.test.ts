import { describe, expect, it } from "vitest";
import { safeWorkspaceDestination, workspaceView } from "./routes";
import { configuration } from "../../marketing-saas-api/src/config";
describe("canonical closed product routes", () => {
 it.each([null, "https://evil.example", "//evil.example/workspace", "/workspaceevil", "/workspace/../auth", "/workspace%2f", "/workspace\\evil", "/workspace#evil", "/workspace\n", "/auth?next=https://evil.example"])("rejects unsafe destination %s", value => expect(safeWorkspaceDestination(value)).toBe("/workspace"));
 it("retains only finite workspace views and strips untrusted extra parameters", () => {
  expect(safeWorkspaceDestination("/workspace?view=contents&next=https://evil.example")).toBe("/workspace?view=contents");
  expect(safeWorkspaceDestination("/workspace?view=bogus")).toBe("/workspace");
  expect(workspaceView("/workspace?view=projects")).toBe("projects");
  expect(workspaceView("/workspace?view=unknown")).toBe("overview");
 });
 it("requires explicit local registration AND demo mode; real transport stays disabled", () => {
  const base={MARKETING_DATABASE_URL:"postgresql://synthetic@127.0.0.1:55508/marketing_unit",MARKETING_AUTH_SECRET:"synthetic-configuration-only-at-least-32-characters"};
  expect(configuration(base).localRegistration).toBe(false);
  expect(configuration({...base,MARKETING_LOCAL_REGISTRATION_ENABLED:"true"}).localRegistration).toBe(false);
  const c=configuration({...base,MARKETING_DEMO_MODE:"true",MARKETING_LOCAL_REGISTRATION_ENABLED:"true"});
  expect(c.localRegistration).toBe(true);expect(c.realImage.enabled).toBe(false);expect(c.realImage.spendApproved).toBe(false);
 });
});
