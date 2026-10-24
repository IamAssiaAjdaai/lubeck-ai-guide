import { defineConfig } from "vitest/config";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
export default defineConfig({ root, resolve: { alias: { "@": path.join(root, "src") } }, test: {
  environment: "node", maxWorkers: 3,
  include: ["tools/native-api-preview/*.test.ts", "src/cloudflare/nativePreview*.test.ts"],
} });
