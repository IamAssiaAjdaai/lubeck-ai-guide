// @vitest-environment node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

// Run outside Vitest's bundler: its interop can hide the Node/tsx import failure
// that broke db:seed after the application package switched to ESM.
const probe = `
  import assert from "node:assert/strict";
  import { formatMessage } from "@citywalk/i18n";
  import { webCopy } from "@citywalk/i18n/adapters";
  import { resolveLocalizedContent } from "@citywalk/i18n/content";
  import { AUTH_MIN_PASSWORD_LENGTH, getCityUnlockProduct } from "@citywalk/traveler-core";
  import { formatMessage as appFormatMessage } from "./src/lib/i18n.ts";

  assert.equal(formatMessage("Hello {name}", { name: "CITYWALK" }), "Hello CITYWALK");
  assert.equal(appFormatMessage, formatMessage);
  assert.equal(typeof webCopy("en"), "object");
  assert.equal(typeof resolveLocalizedContent, "function");
  assert.equal(typeof AUTH_MIN_PASSWORD_LENGTH, "number");
  assert.equal(typeof getCityUnlockProduct, "function");
  console.log("Workspace ESM imports verified.");
`;

describe("workspace exports in operator-script runtimes", () => {
  it.each(["default", "react-server"] as const)(
    "loads named exports through Node/tsx with %s conditions",
    (condition) => {
      const output = execFileSync(
        process.execPath,
        [
          ...(condition === "react-server" ? ["--conditions=react-server"] : []),
          "--import", "tsx",
          "--input-type=module",
          "--eval", probe,
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 20_000,
          env: { ...process.env, NODE_ENV: "test" },
        },
      );

      expect(output).toContain("Workspace ESM imports verified.");
    },
    30_000,
  );
});
