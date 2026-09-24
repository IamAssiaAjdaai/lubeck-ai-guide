import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // DOM interaction tests use the repository's React DOM/testing-library pair.
  // Metro/native builds continue to use mobile/package.json's React version.
  resolve: { alias: { react: fileURLToPath(new URL("../node_modules/react", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
