// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { sharedLocales } from "./locale-config";
const script = path.resolve("packages/i18n/scripts/check.mjs");
describe("CI launch dictionary gate", () => {
  it("passes the complete catalogs", () => {
    const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
  it.each(["missing", "empty", "placeholder"])("fails a %s translation instead of accepting English fallback", kind => {
    const directory = mkdtempSync(path.join(tmpdir(), "citywalk-i18n-check-"));
    try {
      for (const locale of sharedLocales) {
        const dictionary = JSON.parse(readFileSync(path.resolve(`packages/i18n/src/locales/${locale}.json`), "utf8"));
        if (kind === "missing" && locale === "en") dictionary.common.futureKey = "Future English key";
        if (locale === "da" && kind === "empty") dictionary.walk.add = " ";
        if (locale === "es" && kind === "placeholder") dictionary.walk.stop = "Parada sin números";
        writeFileSync(path.join(directory, `${locale}.json`), JSON.stringify(dictionary));
      }
      const result = spawnSync(process.execPath, [script, directory], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(kind === "missing" ? "futureKey" : kind === "empty" ? "walk.add" : "walk.stop");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
