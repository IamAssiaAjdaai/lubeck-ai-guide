import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("account data export disclosure", () => {
  it("keeps the privacy notice and inventory aligned with the self-service export", () => {
    const privacy = source("src/app/privacy/page.tsx");
    const inventory = source("docs/legal/CITYWALK-DATA-INVENTORY.md");
    const route = source("src/app/api/account/export/route.ts");
    const service = source("src/lib/account/dataExport.server.ts");

    expect(route).toContain('Content-Disposition');
    expect(route).toContain('Cache-Control');
    expect(service).toContain('format: "citywalk-account-data"');
    expect(service).toContain("securitySecretsIncluded: false");
    expect(privacy).toContain("machine-readable JSON export of server-held account data");
    expect(privacy).toContain("password hashes, OAuth and session tokens");
    expect(inventory).toContain("Implemented for signed-in native accounts as a JSON export");
    expect(inventory).not.toContain("| Machine-readable/user-download data export | **Not implemented** |");
  });
});
