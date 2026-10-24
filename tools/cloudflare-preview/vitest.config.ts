import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
export default defineConfig({
  root,
  resolve: { alias: { "@": path.join(root, "src") } },
  test: {
    environment: "node",
    maxWorkers: 3,
    include: [
      "src/cloudflare/previewPolicy.test.ts",
      "tools/cloudflare-preview/prepare.test.ts",
      "src/cloudflare/accountErasureSchedule.test.ts",
    ],
  },
});
