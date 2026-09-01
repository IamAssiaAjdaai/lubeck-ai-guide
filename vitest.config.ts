import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  test: {
    environment: "jsdom",

    coverage: {
      provider: "v8",

      reporter: ["text", "html"],

      include: ["src/lib/formatTime.ts"],

      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});