import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { patchCssModules } from "vite-css-modules";
import { createHash } from "node:crypto";
import path from "node:path";

export default defineConfig({
  // Same scoped-name algorithm as the application, without importing or
  // executing production configuration. All paths are relative to the snapshot.
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const root = path.resolve(import.meta.dirname, "../..");
        const relative = path.relative(root, filename.replace(/\?.*$/, "")).replaceAll("\\", "/");
        return `_${name}_${createHash("sha256").update(relative).digest("hex").slice(0, 7)}`;
      },
    },
  },
  plugins: [
    patchCssModules({ exportMode: "default" }),
    vinext({ react: { compiler: true } }),
    cloudflare({
      remoteBindings: false,
      types: { includeRuntime: false },
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
