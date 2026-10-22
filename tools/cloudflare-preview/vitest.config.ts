import { defineConfig, mergeConfig } from "vitest/config";
import path from "node:path";
import applicationTests from "../../vitest.config";

export default mergeConfig(applicationTests, defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  test: {
    environment: "node",
    include: [
      "src/cloudflare/previewPolicy.test.ts",
      "tools/cloudflare-preview/prepare.test.ts",
      "src/cloudflare/accountErasureSchedule.test.ts",
    ],
  },
}));
