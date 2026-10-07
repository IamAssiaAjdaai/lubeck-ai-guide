import { describe, expect, it } from "vitest";

import accountSource from "../src/app/account/index.tsx?raw";
import clientSource from "../src/lib/accountDataExport.ts?raw";

describe("native account data export", () => {
  it("uses the authenticated relative account export endpoint", () => {
    expect(clientSource).toContain('fetchAuthenticated("/api/account/export"');
    expect(clientSource).toContain('"X-Citywalk-Account": userId');
    expect(clientSource).toContain('format !== "citywalk-account-data"');
    expect(clientSource).toContain("version !== 1");
    expect(clientSource).not.toContain("https://getcitywalk.com/api/account/export");
  });

  it("offers a machine-readable JSON export from signed-in account controls", () => {
    expect(accountSource).toContain("fetchNativeAccountDataExport(session.user.id)");
    expect(accountSource).toContain("Share.share({ message: data");
    expect(accountSource).toContain('label("profile.exportData")');
    expect(accountSource).toContain('label("profile.dataExportHelp")');
    expect(accountSource).toContain('setNotice("profile.dataExportReady")');
  });
});
