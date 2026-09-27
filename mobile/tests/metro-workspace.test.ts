/// <reference types="node" />
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const appRoot = path.resolve(import.meta.dirname, "..");

describe("Metro workspace translation consumption", () => {
  it("resolves the native package entry to the live workspace, not an installed snapshot", () => {
    expect(realpathSync(require.resolve("@citywalk/i18n"))).toBe(
      path.resolve(appRoot, "../packages/i18n/src/index.ts"),
    );
  });
  it("watches the shared catalogs outside the Expo project root", () => {
    const config = require("../metro.config.js");
    expect(config.projectRoot).toBe(appRoot);
    expect(config.watchFolders).toContain(path.resolve(appRoot, "../packages"));
  });
});
